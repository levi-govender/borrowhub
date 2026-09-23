package com.borrowhub.backend.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.borrowhub.backend.PostgresIntegrationTest;
import com.borrowhub.backend.audit.AuditEventRepository;
import com.borrowhub.backend.equipment.Equipment;
import com.borrowhub.backend.equipment.EquipmentRepository;
import com.borrowhub.backend.equipment.OperationalStatus;
import com.borrowhub.backend.idempotency.IdempotencyRecordRepository;
import com.borrowhub.backend.identity.AppUser;
import com.borrowhub.backend.identity.AppUserRepository;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class BookingMineCancelTest extends PostgresIntegrationTest {

	@Autowired
	MockMvc mockMvc;

	@Autowired
	EquipmentRepository equipmentRepository;

	@Autowired
	BookingRepository bookingRepository;

	@Autowired
	AppUserRepository appUserRepository;

	@Autowired
	AuditEventRepository auditEventRepository;

	@Autowired
	IdempotencyRecordRepository idempotencyRecordRepository;

	private Equipment phone;
	private Equipment monitor;

	@BeforeEach
	void seed() {
		idempotencyRecordRepository.deleteAll();
		auditEventRepository.deleteAll();
		bookingRepository.deleteAll();
		equipmentRepository.deleteAll();
		appUserRepository.deleteAll();
		Instant now = Instant.parse("2026-09-21T10:00:00Z");
		phone = equipmentRepository.save(new Equipment(
				UUID.randomUUID(),
				"PHONE-001",
				"Pixel test phone",
				"phone",
				"Primary QA handset",
				"QA cupboard",
				OperationalStatus.ACTIVE,
				now));
		monitor = equipmentRepository.save(new Equipment(
				UUID.randomUUID(),
				"MONITOR-001",
				"Office monitor",
				"monitor",
				"27 inch",
				"Dock 4",
				OperationalStatus.ACTIVE,
				now));
	}

	@Test
	void listsOnlyOwnBookingsAndHidesOthersOnDetail() throws Exception {
		String mine = create("employee-a", phone.getId(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z");
		create("employee-b", monitor.getId(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z");

		mockMvc.perform(get("/v1/bookings").header("X-Demo-Object-Id", "employee-a"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.items[0].id").value(mine))
				.andExpect(jsonPath("$.items[0].allowedActions[0]").value("CANCEL"));

		mockMvc.perform(get("/v1/bookings/{id}", mine).header("X-Demo-Object-Id", "employee-a"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.assetTag").value("PHONE-001"))
				.andExpect(jsonPath("$.equipmentName").value("Pixel test phone"));

		mockMvc.perform(get("/v1/bookings").param("status", "RESERVED").header("X-Demo-Object-Id", "employee-a"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1));

		mockMvc.perform(get("/v1/bookings").param("status", "RETURNED").header("X-Demo-Object-Id", "employee-a"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(0));

		mockMvc.perform(get("/v1/bookings").param("status", "nope").header("X-Demo-Object-Id", "employee-a"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

		mockMvc.perform(get("/v1/bookings/{id}", mine).header("X-Demo-Object-Id", "employee-b"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("NOT_FOUND"));
	}

	@Test
	void cancelFreesTheSlotAndIsIdempotent() throws Exception {
		String bookingId = create("employee-a", phone.getId(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z");
		String cancelKey = UUID.randomUUID().toString();

		mockMvc.perform(post("/v1/bookings/{id}/cancel", bookingId)
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", cancelKey))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CANCELLED"))
				.andExpect(jsonPath("$.allowedActions").isEmpty());

		mockMvc.perform(post("/v1/bookings/{id}/cancel", bookingId)
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", cancelKey))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CANCELLED"));

		assertThat(bookingRepository.count()).isEqualTo(1);
		assertThat(auditEventRepository.findAll().stream().map(event -> event.getAction()).toList())
				.contains("BOOKING_CREATED", "BOOKING_CANCELLED");

		create("employee-b", phone.getId(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z");
		assertThat(bookingRepository.count()).isEqualTo(2);
	}

	@Test
	void cancelStoresAnOptionalReason() throws Exception {
		String bookingId = create("employee-a", phone.getId(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z");

		mockMvc.perform(post("/v1/bookings/{id}/cancel", bookingId)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"reason\":\"Plans changed\"}")
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", UUID.randomUUID()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CANCELLED"))
				.andExpect(jsonPath("$.cancellationReason").value("Plans changed"));
	}

	@Test
	void cancelRejectsOtherUsersAndIllegalTransitions() throws Exception {
		String bookingId = create("employee-a", phone.getId(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z");

		mockMvc.perform(post("/v1/bookings/{id}/cancel", bookingId)
						.header("X-Demo-Object-Id", "employee-b")
						.header("Idempotency-Key", UUID.randomUUID()))
				.andExpect(status().isNotFound());

		AppUser owner = appUserRepository.findByTenantIdAndObjectId("dev-tenant", "employee-a").orElseThrow();
		Booking started = bookingRepository.save(new Booking(
				UUID.randomUUID(),
				monitor,
				owner,
				Instant.parse("2026-09-21T09:00:00Z"),
				Instant.parse("2026-09-21T12:00:00Z"),
				BookingStatus.RESERVED,
				Instant.parse("2026-09-20T10:00:00Z")));
		mockMvc.perform(post("/v1/bookings/{id}/cancel", started.getId())
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", UUID.randomUUID()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("TOO_LATE_TO_CANCEL"));

		Booking checkedOut = bookingRepository.save(new Booking(
				UUID.randomUUID(),
				phone,
				owner,
				Instant.parse("2026-09-23T07:00:00Z"),
				Instant.parse("2026-09-23T10:00:00Z"),
				BookingStatus.CHECKED_OUT,
				Instant.parse("2026-09-21T10:00:00Z")));
		mockMvc.perform(post("/v1/bookings/{id}/cancel", checkedOut.getId())
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", UUID.randomUUID()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ILLEGAL_TRANSITION"));
	}

	private String create(String objectId, UUID equipmentId, String startAt, String endAt) throws Exception {
		MvcResult result = mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", objectId)
						.header("Idempotency-Key", UUID.randomUUID())
						.content(
								"""
								{"equipmentId":"%s","startAt":"%s","endAt":"%s"}
								"""
										.formatted(equipmentId, startAt, endAt)))
				.andExpect(status().isCreated())
				.andReturn();
		String json = result.getResponse().getContentAsString();
		int start = json.indexOf("\"id\":\"") + 6;
		return json.substring(start, json.indexOf('"', start));
	}
}

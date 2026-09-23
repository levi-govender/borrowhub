package com.borrowhub.backend.equipment;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.borrowhub.backend.PostgresIntegrationTest;
import com.borrowhub.backend.audit.AuditEventRepository;
import com.borrowhub.backend.booking.Booking;
import com.borrowhub.backend.booking.BookingRepository;
import com.borrowhub.backend.booking.BookingStatus;
import com.borrowhub.backend.idempotency.IdempotencyRecordRepository;
import com.borrowhub.backend.identity.AppUser;
import com.borrowhub.backend.identity.AppUserRepository;
import com.borrowhub.backend.identity.UserRole;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

class EquipmentCatalogueTest extends PostgresIntegrationTest {

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
	private Equipment archived;
	private Equipment maintenance;

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
		equipmentRepository.save(new Equipment(
				UUID.randomUUID(),
				"MONITOR-001",
				"Office monitor",
				"monitor",
				"27 inch",
				"Dock 4",
				OperationalStatus.ACTIVE,
				now));
		archived = equipmentRepository.save(new Equipment(
				UUID.randomUUID(),
				"PHONE-OLD",
				"Retired phone",
				"phone",
				"Do not list",
				"Store",
				OperationalStatus.ARCHIVED,
				now));
		maintenance = equipmentRepository.save(new Equipment(
				UUID.randomUUID(),
				"CAMERA-001",
				"Studio camera",
				"camera",
				"In for repair",
				"Studio",
				OperationalStatus.MAINTENANCE,
				now));
	}

	@Test
	void listExcludesArchivedAndSupportsSearchAndCategory() throws Exception {
		mockMvc.perform(get("/v1/equipment"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(3))
				.andExpect(jsonPath("$.page").value(1))
				.andExpect(jsonPath("$.pageSize").value(20))
				.andExpect(jsonPath("$.items[*].assetTag", hasItem("PHONE-001")))
				.andExpect(jsonPath("$.items[*].assetTag", not(hasItem("PHONE-OLD"))));

		mockMvc.perform(get("/v1/equipment").param("query", "PHONE-001"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.items[0].name").value("Pixel test phone"));

		mockMvc.perform(get("/v1/equipment").param("query", "cupboard"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.items[0].assetTag").value("PHONE-001"));

		mockMvc.perform(get("/v1/equipment").param("query", "Store"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(0));

		mockMvc.perform(get("/v1/equipment").param("category", "monitor"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.items[0].assetTag").value("MONITOR-001"));
	}

	@Test
	void detailHidesArchivedAndIncludesPolicy() throws Exception {
		mockMvc.perform(get("/v1/equipment/{id}", phone.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.assetTag").value("PHONE-001"))
				.andExpect(jsonPath("$.policy.officeTimezone").value("Africa/Johannesburg"))
				.andExpect(jsonPath("$.policy.minDurationMinutes").value(15));

		mockMvc.perform(get("/v1/equipment/{id}", archived.getId()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("NOT_FOUND"));
	}

	@Test
	void availabilityUsesOverlapRuleAndOperationalStatus() throws Exception {
		mockMvc.perform(get("/v1/equipment/{id}/availability", phone.getId())
						.param("startAt", "2026-10-05T07:00:00Z")
						.param("endAt", "2026-10-05T10:00:00Z"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.available").value(true));

		mockMvc.perform(get("/v1/equipment/{id}/availability", maintenance.getId())
						.param("startAt", "2026-10-05T07:00:00Z")
						.param("endAt", "2026-10-05T10:00:00Z"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.available").value(false))
				.andExpect(jsonPath("$.reason").value("EQUIPMENT_NOT_ACTIVE"));

		AppUser user = appUserRepository.save(new AppUser(
				UUID.randomUUID(),
				"tenant",
				"obj-1",
				"Employee A",
				"a@example.com",
				UserRole.EMPLOYEE,
				Instant.parse("2026-09-01T00:00:00Z")));
		bookingRepository.save(new Booking(
				UUID.randomUUID(),
				phone,
				user,
				Instant.parse("2026-10-05T07:00:00Z"),
				Instant.parse("2026-10-05T10:00:00Z"),
				BookingStatus.RESERVED,
				Instant.parse("2026-09-21T10:00:00Z")));

		mockMvc.perform(get("/v1/equipment/{id}/availability", phone.getId())
						.param("startAt", "2026-10-05T09:00:00Z")
						.param("endAt", "2026-10-05T11:00:00Z"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.available").value(false))
				.andExpect(jsonPath("$.reason").value("BOOKING_CONFLICT"));

		mockMvc.perform(get("/v1/equipment/{id}/availability", phone.getId())
						.param("startAt", "2026-10-05T10:00:00Z")
						.param("endAt", "2026-10-05T11:00:00Z"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.available").value(true));
	}
}

package com.borrowhub.backend.booking;

import static org.assertj.core.api.Assertions.assertThat;
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
import com.borrowhub.backend.identity.UserRole;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

class BookingCollectReturnTest extends PostgresIntegrationTest {

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
	private AppUser owner;
	private AppUser other;

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
		owner = appUserRepository.save(new AppUser(
				UUID.randomUUID(),
				"dev-tenant",
				"employee-a",
				"employee-a",
				"employee-a@demo.borrowhub.local",
				UserRole.EMPLOYEE,
				now));
		other = appUserRepository.save(new AppUser(
				UUID.randomUUID(),
				"dev-tenant",
				"employee-b",
				"employee-b",
				"employee-b@demo.borrowhub.local",
				UserRole.EMPLOYEE,
				now));
	}

	@Test
	void collectThenReturnAndReplay() throws Exception {
		Booking booking = reserved(
				owner,
				Instant.parse("2026-09-21T10:10:00Z"),
				Instant.parse("2026-09-21T14:00:00Z"));
		String collectKey = UUID.randomUUID().toString();
		mockMvc.perform(post("/v1/bookings/{id}/collect", booking.getId())
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", collectKey))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CHECKED_OUT"))
				.andExpect(jsonPath("$.allowedActions[0]").value("RETURN"));

		mockMvc.perform(post("/v1/bookings/{id}/collect", booking.getId())
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", collectKey))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CHECKED_OUT"));

		String returnKey = UUID.randomUUID().toString();
		mockMvc.perform(post("/v1/bookings/{id}/return", booking.getId())
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", returnKey))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("RETURNED"))
				.andExpect(jsonPath("$.allowedActions").isEmpty());

		mockMvc.perform(post("/v1/bookings/{id}/return", booking.getId())
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", returnKey))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("RETURNED"));

		assertThat(auditEventRepository.findAll().stream().map(event -> event.getAction()).toList())
				.contains("BOOKING_COLLECTED", "BOOKING_RETURNED");
	}

	@Test
	void collectEnforcesWindowOwnershipAndPhysicalAvailability() throws Exception {
		Booking tooEarly = reserved(
				owner,
				Instant.parse("2026-09-21T10:30:00Z"),
				Instant.parse("2026-09-21T14:00:00Z"));
		mockMvc.perform(post("/v1/bookings/{id}/collect", tooEarly.getId())
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", UUID.randomUUID()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("TOO_EARLY_TO_COLLECT"));

		Booking expired = reserved(
				owner,
				Instant.parse("2026-09-21T08:00:00Z"),
				Instant.parse("2026-09-21T09:00:00Z"));
		mockMvc.perform(post("/v1/bookings/{id}/collect", expired.getId())
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", UUID.randomUUID()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("TOO_LATE_TO_COLLECT"));

		Booking mine = reserved(
				owner,
				Instant.parse("2026-09-21T10:05:00Z"),
				Instant.parse("2026-09-21T12:00:00Z"));
		mockMvc.perform(post("/v1/bookings/{id}/collect", mine.getId())
						.header("X-Demo-Object-Id", "employee-b")
						.header("Idempotency-Key", UUID.randomUUID()))
				.andExpect(status().isNotFound());

		mockMvc.perform(post("/v1/bookings/{id}/collect", mine.getId())
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", UUID.randomUUID()))
				.andExpect(status().isOk());

		Booking next = reserved(
				other,
				Instant.parse("2026-09-21T10:00:00Z"),
				Instant.parse("2026-09-21T14:00:00Z"));
		mockMvc.perform(post("/v1/bookings/{id}/collect", next.getId())
						.header("X-Demo-Object-Id", "employee-b")
						.header("Idempotency-Key", UUID.randomUUID()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("EQUIPMENT_CHECKED_OUT"));
	}

	@Test
	void overdueCheckedOutBookingCanStillBeReturned() throws Exception {
		Booking overdue = bookingRepository.save(new Booking(
				UUID.randomUUID(),
				phone,
				owner,
				Instant.parse("2026-09-20T08:00:00Z"),
				Instant.parse("2026-09-20T10:00:00Z"),
				BookingStatus.CHECKED_OUT,
				Instant.parse("2026-09-20T07:00:00Z")));
		mockMvc.perform(post("/v1/bookings/{id}/return", overdue.getId())
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", UUID.randomUUID()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("RETURNED"));
	}

	private Booking reserved(AppUser user, Instant startAt, Instant endAt) {
		return bookingRepository.save(new Booking(
				UUID.randomUUID(),
				phone,
				user,
				startAt,
				endAt,
				BookingStatus.RESERVED,
				Instant.parse("2026-09-20T10:00:00Z")));
	}
}

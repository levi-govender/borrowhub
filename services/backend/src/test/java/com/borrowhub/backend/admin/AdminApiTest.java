package com.borrowhub.backend.admin;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.borrowhub.backend.PostgresIntegrationTest;
import com.borrowhub.backend.audit.AuditEventRepository;
import com.borrowhub.backend.booking.Booking;
import com.borrowhub.backend.booking.BookingRepository;
import com.borrowhub.backend.booking.BookingStatus;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

class AdminApiTest extends PostgresIntegrationTest {

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

	private Equipment archived;
	private Booking overdue;
	private Booking reservedPastStart;

	@BeforeEach
	void seed() {
		idempotencyRecordRepository.deleteAll();
		auditEventRepository.deleteAll();
		bookingRepository.deleteAll();
		equipmentRepository.deleteAll();
		appUserRepository.deleteAll();
		Instant now = Instant.parse("2026-09-21T10:00:00Z");
		Equipment phone = equipmentRepository.save(new Equipment(
				UUID.randomUUID(),
				"PHONE-001",
				"Pixel test phone",
				"phone",
				"Primary QA handset",
				"QA cupboard",
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
		AppUser employee = appUserRepository.save(new AppUser(
				UUID.randomUUID(),
				"dev-tenant",
				"employee-a",
				"employee-a",
				"employee-a@demo.borrowhub.local",
				UserRole.EMPLOYEE,
				now));
		overdue = bookingRepository.save(new Booking(
				UUID.randomUUID(),
				phone,
				employee,
				Instant.parse("2026-09-20T08:00:00Z"),
				Instant.parse("2026-09-20T10:00:00Z"),
				BookingStatus.CHECKED_OUT,
				now));
		reservedPastStart = bookingRepository.save(new Booking(
				UUID.randomUUID(),
				archived,
				employee,
				Instant.parse("2026-09-21T09:00:00Z"),
				Instant.parse("2026-09-21T12:00:00Z"),
				BookingStatus.RESERVED,
				now));
	}

	@Test
	void employeeCannotUseAdminApis() throws Exception {
		mockMvc.perform(get("/v1/admin/equipment").header("X-Demo-Object-Id", "employee-a"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("FORBIDDEN"));
		mockMvc.perform(get("/v1/admin/bookings").header("X-Demo-Object-Id", "employee-a"))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/v1/me").header("X-Demo-Object-Id", "employee-a"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.objectId").value("employee-a"))
				.andExpect(jsonPath("$.role").value("EMPLOYEE"));
	}

	@Test
	void adminListsArchivedCreatesEquipmentAndSeesOverdue() throws Exception {
		mockMvc.perform(get("/v1/admin/equipment")
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(2));

		mockMvc.perform(get("/v1/admin/equipment")
						.param("checkedOut", "true")
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.items[0].assetTag").value("PHONE-001"))
				.andExpect(jsonPath("$.items[0].checkedOutTo").value("employee-a"))
				.andExpect(jsonPath("$.items[0].checkedOutBookingId").value(overdue.getId().toString()))
				.andExpect(jsonPath("$.items[0].loanOverdue").value(true));

		mockMvc.perform(get("/v1/admin/equipment")
						.param("loanOverdue", "true")
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.items[0].assetTag").value("PHONE-001"));

		mockMvc.perform(get("/v1/admin/equipment")
						.param("reserved", "true")
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.items[0].assetTag").value("PHONE-OLD"))
				.andExpect(jsonPath("$.items[0].nextReservedTo").value("employee-a"))
				.andExpect(jsonPath("$.items[0].nextReservedBookingId").value(reservedPastStart.getId().toString()));

		mockMvc.perform(get("/v1/admin/equipment")
						.param("query", "employee-a")
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(2));

		mockMvc.perform(get("/v1/admin/equipment")
						.param("query", "cupboard")
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.items[0].assetTag").value("PHONE-001"));

		mockMvc.perform(get("/v1/admin/equipment/{id}", archived.getId())
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.assetTag").value("PHONE-OLD"))
				.andExpect(jsonPath("$.currentLoan").value(org.hamcrest.Matchers.nullValue()))
				.andExpect(jsonPath("$.nextReservation.bookingId").value(reservedPastStart.getId().toString()))
				.andExpect(jsonPath("$.nextReservation.borrower").value("employee-a"));

		mockMvc.perform(get("/v1/admin/equipment/{id}", overdue.getEquipment().getId())
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.currentLoan.bookingId").value(overdue.getId().toString()))
				.andExpect(jsonPath("$.currentLoan.borrower").value("employee-a"))
				.andExpect(jsonPath("$.currentLoan.overdue").value(true));

		mockMvc.perform(post("/v1/admin/equipment")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN")
						.content(
								"""
								{"assetTag":"HUB-001","name":"USB hub","category":"adapter","description":"Admin added","location":"Dock","operationalStatus":"ACTIVE"}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.assetTag").value("HUB-001"));

		mockMvc.perform(get("/v1/admin/summary")
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.overdue").value(1))
				.andExpect(jsonPath("$.checkedOut").value(1))
				.andExpect(jsonPath("$.reserved").value(1));

		mockMvc.perform(get("/v1/admin/bookings")
						.param("overdue", "true")
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.items[0].id").value(overdue.getId().toString()))
				.andExpect(jsonPath("$.items[0].overdue").value(true));

		mockMvc.perform(get("/v1/admin/bookings")
						.param("from", "2026-09-21T00:00:00Z")
						.param("to", "2026-09-22T00:00:00Z")
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.items[0].id").value(reservedPastStart.getId().toString()));

		mockMvc.perform(get("/v1/admin/bookings")
						.param("query", "cupboard")
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.items[0].id").value(overdue.getId().toString()));

		mockMvc.perform(get("/v1/admin/bookings")
						.param("from", "2026-09-21T00:00:00Z")
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
	}

	@Test
	void adminCanCancelAnotherUsersUncollectedBookingWithReason() throws Exception {
		mockMvc.perform(post("/v1/admin/bookings/{id}/cancel", reservedPastStart.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN")
						.header("Idempotency-Key", UUID.randomUUID())
						.content("{\"reason\":\"Asset needed for repair\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CANCELLED"))
				.andExpect(jsonPath("$.cancellationReason").value("Asset needed for repair"))
				.andExpect(jsonPath("$.audit[0].action").value("BOOKING_CANCELLED_ADMIN"));

		mockMvc.perform(get("/v1/bookings/{id}", reservedPastStart.getId())
						.header("X-Demo-Object-Id", "employee-a"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.cancellationReason").value("Asset needed for repair"));

		mockMvc.perform(patch("/v1/admin/equipment/{id}", archived.getId())
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN")
						.content(
								"""
								{"assetTag":"PHONE-OLD","name":"Retired phone","category":"phone","description":"Still retired","location":"Store","operationalStatus":"MAINTENANCE"}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.operationalStatus").value("MAINTENANCE"));
	}

	@Test
	void adminBookingDetailIncludesDamageNote() throws Exception {
		Instant now = Instant.parse("2026-09-21T10:00:00Z");
		Equipment camera = equipmentRepository.save(new Equipment(
				UUID.randomUUID(),
				"CAM-009",
				"Studio camera",
				"camera",
				"Returned with a note",
				"Studio",
				OperationalStatus.ACTIVE,
				now));
		AppUser employee = appUserRepository.findAll().getFirst();
		Booking returned = bookingRepository.save(new Booking(
				UUID.randomUUID(),
				camera,
				employee,
				Instant.parse("2026-09-19T08:00:00Z"),
				Instant.parse("2026-09-19T10:00:00Z"),
				BookingStatus.CHECKED_OUT,
				now));
		returned.markReturned(now, "Scratched corner");
		bookingRepository.save(returned);

		mockMvc.perform(get("/v1/admin/bookings/{id}", returned.getId())
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("RETURNED"))
				.andExpect(jsonPath("$.damageNote").value("Scratched corner"));

		mockMvc.perform(get("/v1/admin/bookings")
						.param("damaged", "true")
						.header("X-Demo-Object-Id", "admin-1")
						.header("X-Demo-Role", "ADMIN"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.items[0].id").value(returned.getId().toString()))
				.andExpect(jsonPath("$.items[0].damaged").value(true));
	}
}

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
import com.borrowhub.backend.identity.AppUserRepository;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

class BookingCreateTest extends PostgresIntegrationTest {

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
	void createsReservedBookingWithAuditAndAllowedCancel() throws Exception {
		mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", UUID.randomUUID())
						.content(body(phone.getId(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z")))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("RESERVED"))
				.andExpect(jsonPath("$.equipmentId").value(phone.getId().toString()))
				.andExpect(jsonPath("$.assetTag").value("PHONE-001"))
				.andExpect(jsonPath("$.allowedActions[0]").value("CANCEL"))
				.andExpect(jsonPath("$.userId").exists());

		assertThat(bookingRepository.count()).isEqualTo(1);
		assertThat(auditEventRepository.findAll()).hasSize(1);
		assertThat(auditEventRepository.findAll().getFirst().getAction()).isEqualTo("BOOKING_CREATED");
		assertThat(appUserRepository.findByTenantIdAndObjectId("dev-tenant", "employee-a")).isPresent();
	}

	@Test
	void rejectsMissingDemoIdentity() throws Exception {
		mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("Idempotency-Key", UUID.randomUUID())
						.content(body(phone.getId(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z")))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
	}

	@Test
	void rejectsOverlapAndAllowsAdjacentHalfOpenInterval() throws Exception {
		mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", UUID.randomUUID())
						.content(body(phone.getId(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z")))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "employee-b")
						.header("Idempotency-Key", UUID.randomUUID())
						.content(body(phone.getId(), "2026-09-22T09:00:00Z", "2026-09-22T11:00:00Z")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("BOOKING_CONFLICT"));

		mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "employee-b")
						.header("Idempotency-Key", UUID.randomUUID())
						.content(body(phone.getId(), "2026-09-22T10:00:00Z", "2026-09-22T11:00:00Z")))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("RESERVED"));
	}

	@Test
	void rejectsInactiveEquipmentAndPolicyViolations() throws Exception {
		mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", UUID.randomUUID())
						.content(body(maintenance.getId(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("EQUIPMENT_NOT_ACTIVE"));

		mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", UUID.randomUUID())
						.content(body(phone.getId(), "2026-09-22T07:00:00Z", "2026-09-22T07:10:00Z")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("POLICY_VIOLATION"));

		mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", UUID.randomUUID())
						.content(body(phone.getId(), "2026-09-20T07:00:00Z", "2026-09-20T10:00:00Z")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("POLICY_VIOLATION"));

		mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", UUID.randomUUID())
						.content(body(phone.getId(), "2026-10-22T07:00:00Z", "2026-10-22T10:00:00Z")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("POLICY_VIOLATION"));

		mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", UUID.randomUUID())
						.content(body(UUID.randomUUID(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z")))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("NOT_FOUND"));
	}

	@Test
	void concurrentOverlappingCreatesExactlyOneReservation() throws Exception {
		String payload = body(phone.getId(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z");
		ExecutorService executor = Executors.newFixedThreadPool(2);
		CountDownLatch ready = new CountDownLatch(2);
		CountDownLatch go = new CountDownLatch(1);
		Callable<Integer> left = request("employee-a", payload, ready, go);
		Callable<Integer> right = request("employee-b", payload, ready, go);
		try {
			Future<Integer> first = executor.submit(left);
			Future<Integer> second = executor.submit(right);
			assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
			go.countDown();
			Set<Integer> statuses = Set.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));
			assertThat(statuses).containsExactlyInAnyOrder(201, 409);
			assertThat(bookingRepository.count()).isEqualTo(1);
		}
		finally {
			executor.shutdownNow();
		}
	}

	private Callable<Integer> request(String objectId, String payload, CountDownLatch ready, CountDownLatch go) {
		return () -> {
			ready.countDown();
			go.await(10, TimeUnit.SECONDS);
			return mockMvc.perform(post("/v1/bookings")
							.contentType(MediaType.APPLICATION_JSON)
							.header("X-Demo-Object-Id", objectId)
							.header("Idempotency-Key", UUID.randomUUID())
							.content(payload))
					.andReturn()
					.getResponse()
					.getStatus();
		};
	}

	private static String body(UUID equipmentId, String startAt, String endAt) {
		return """
				{"equipmentId":"%s","startAt":"%s","endAt":"%s"}
				"""
				.formatted(equipmentId, startAt, endAt);
	}
}

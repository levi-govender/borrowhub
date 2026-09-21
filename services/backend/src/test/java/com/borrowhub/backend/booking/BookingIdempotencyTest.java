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
import org.springframework.test.web.servlet.MvcResult;

class BookingIdempotencyTest extends PostgresIntegrationTest {

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

	@BeforeEach
	void seed() {
		idempotencyRecordRepository.deleteAll();
		auditEventRepository.deleteAll();
		bookingRepository.deleteAll();
		equipmentRepository.deleteAll();
		appUserRepository.deleteAll();
		phone = equipmentRepository.save(new Equipment(
				UUID.randomUUID(),
				"PHONE-001",
				"Pixel test phone",
				"phone",
				"Primary QA handset",
				"QA cupboard",
				OperationalStatus.ACTIVE,
				Instant.parse("2026-09-21T10:00:00Z")));
	}

	@Test
	void sameKeyAndBodyReplaysWithoutASecondBooking() throws Exception {
		String key = UUID.randomUUID().toString();
		String payload = body(phone.getId(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z");
		MvcResult first = create(key, payload);
		assertThat(first.getResponse().getStatus()).isEqualTo(201);
		String bookingId = readId(first);

		mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", key)
						.content(payload))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(bookingId));
		assertThat(bookingRepository.count()).isEqualTo(1);
		assertThat(auditEventRepository.count()).isEqualTo(1);
		assertThat(idempotencyRecordRepository.count()).isEqualTo(1);
	}

	@Test
	void sameKeyDifferentBodyConflicts() throws Exception {
		String key = UUID.randomUUID().toString();
		create(key, body(phone.getId(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z"));

		mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", key)
						.content(body(phone.getId(), "2026-09-23T07:00:00Z", "2026-09-23T10:00:00Z")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));
		assertThat(bookingRepository.count()).isEqualTo(1);
	}

	@Test
	void missingOrInvalidKeyIsRejected() throws Exception {
		String payload = body(phone.getId(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z");
		mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "employee-a")
						.content(payload))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

		mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", "not-a-uuid")
						.content(payload))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
	}

	@Test
	void concurrentSameKeyCreatesOneBooking() throws Exception {
		String key = UUID.randomUUID().toString();
		String payload = body(phone.getId(), "2026-09-22T07:00:00Z", "2026-09-22T10:00:00Z");
		ExecutorService executor = Executors.newFixedThreadPool(2);
		CountDownLatch ready = new CountDownLatch(2);
		CountDownLatch go = new CountDownLatch(1);
		Callable<Integer> left = perform(key, payload, ready, go);
		Callable<Integer> right = perform(key, payload, ready, go);
		try {
			Future<Integer> first = executor.submit(left);
			Future<Integer> second = executor.submit(right);
			assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
			go.countDown();
			int leftStatus = first.get(20, TimeUnit.SECONDS);
			int rightStatus = second.get(20, TimeUnit.SECONDS);
			assertThat(leftStatus).isEqualTo(201);
			assertThat(rightStatus).isEqualTo(201);
			assertThat(bookingRepository.count()).isEqualTo(1);
			assertThat(idempotencyRecordRepository.count()).isEqualTo(1);
		}
		finally {
			executor.shutdownNow();
		}
	}

	private Callable<Integer> perform(String key, String payload, CountDownLatch ready, CountDownLatch go) {
		return () -> {
			ready.countDown();
			go.await(10, TimeUnit.SECONDS);
			return mockMvc.perform(post("/v1/bookings")
							.contentType(MediaType.APPLICATION_JSON)
							.header("X-Demo-Object-Id", "employee-a")
							.header("Idempotency-Key", key)
							.content(payload))
					.andReturn()
					.getResponse()
					.getStatus();
		};
	}

	private MvcResult create(String key, String payload) throws Exception {
		return mockMvc.perform(post("/v1/bookings")
						.contentType(MediaType.APPLICATION_JSON)
						.header("X-Demo-Object-Id", "employee-a")
						.header("Idempotency-Key", key)
						.content(payload))
				.andReturn();
	}

	private static String readId(MvcResult result) throws Exception {
		String json = result.getResponse().getContentAsString();
		int start = json.indexOf("\"id\":\"") + 6;
		return json.substring(start, json.indexOf('"', start));
	}

	private static String body(UUID equipmentId, String startAt, String endAt) {
		return """
				{"equipmentId":"%s","startAt":"%s","endAt":"%s"}
				"""
				.formatted(equipmentId, startAt, endAt);
	}
}

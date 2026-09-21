package com.borrowhub.backend.booking;

import com.borrowhub.backend.audit.AuditEvent;
import com.borrowhub.backend.audit.AuditEventRepository;
import com.borrowhub.backend.common.ApiException;
import com.borrowhub.backend.common.BookingPolicyProperties;
import com.borrowhub.backend.common.CorrelationIdFilter;
import com.borrowhub.backend.equipment.Equipment;
import com.borrowhub.backend.equipment.EquipmentRepository;
import com.borrowhub.backend.equipment.OperationalStatus;
import com.borrowhub.backend.identity.AppUser;
import com.borrowhub.backend.identity.DemoIdentityService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {

	private final DemoIdentityService demoIdentityService;
	private final EquipmentRepository equipmentRepository;
	private final BookingRepository bookingRepository;
	private final AuditEventRepository auditEventRepository;
	private final BookingPolicyProperties policy;
	private final Clock clock;

	public BookingService(
			DemoIdentityService demoIdentityService,
			EquipmentRepository equipmentRepository,
			BookingRepository bookingRepository,
			AuditEventRepository auditEventRepository,
			BookingPolicyProperties policy,
			Clock clock) {
		this.demoIdentityService = demoIdentityService;
		this.equipmentRepository = equipmentRepository;
		this.bookingRepository = bookingRepository;
		this.auditEventRepository = auditEventRepository;
		this.policy = policy;
		this.clock = clock;
	}

	@Transactional
	public BookingResponse create(String tenantIdHeader, String objectIdHeader, CreateBookingRequest request) {
		Instant now = Instant.now(clock);
		validatePolicy(request.startAt(), request.endAt(), now);
		AppUser user = demoIdentityService.requireUser(tenantIdHeader, objectIdHeader);
		Equipment equipment = equipmentRepository
				.lockById(request.equipmentId())
				.orElseThrow(() -> ApiException.notFound("Equipment was not found."));
		if (equipment.getOperationalStatus() != OperationalStatus.ACTIVE) {
			throw ApiException.conflict("EQUIPMENT_NOT_ACTIVE", "Equipment is not available to reserve.");
		}
		if (bookingRepository.existsOverlap(equipment.getId(), request.startAt(), request.endAt())) {
			throw ApiException.conflict("BOOKING_CONFLICT", "That time overlaps an existing reservation.");
		}
		Instant createdAt = Instant.now(clock);
		Booking booking = bookingRepository.save(new Booking(
				UUID.randomUUID(),
				equipment,
				user,
				request.startAt(),
				request.endAt(),
				BookingStatus.RESERVED,
				createdAt));
		Map<String, Object> summary = new LinkedHashMap<>();
		summary.put("status", BookingStatus.RESERVED.name());
		summary.put("equipmentId", equipment.getId().toString());
		summary.put("startAt", request.startAt().toString());
		summary.put("endAt", request.endAt().toString());
		String traceId = MDC.get(CorrelationIdFilter.MDC_KEY);
		auditEventRepository.save(new AuditEvent(
				UUID.randomUUID(),
				user,
				"booking",
				booking.getId(),
				"BOOKING_CREATED",
				createdAt,
				traceId == null ? "" : traceId,
				summary));
		return BookingResponse.from(booking, BookingActions.allowed(booking, now, policy.collectionLeadMinutes()));
	}

	private void validatePolicy(Instant startAt, Instant endAt, Instant now) {
		if (startAt == null || endAt == null) {
			throw ApiException.badRequest("VALIDATION_ERROR", "startAt and endAt are required.");
		}
		if (!endAt.isAfter(startAt)) {
			throw ApiException.badRequest("VALIDATION_ERROR", "endAt must be after startAt.");
		}
		if (!startAt.isAfter(now)) {
			throw ApiException.badRequest("POLICY_VIOLATION", "Reservation start must be in the future.");
		}
		Instant latestStart = now.plus(policy.maxAdvanceDays(), ChronoUnit.DAYS);
		if (startAt.isAfter(latestStart)) {
			throw ApiException.badRequest("POLICY_VIOLATION", "Reservation start must be within 30 days.");
		}
		Duration duration = Duration.between(startAt, endAt);
		if (duration.compareTo(Duration.ofMinutes(policy.minDurationMinutes())) < 0) {
			throw ApiException.badRequest("POLICY_VIOLATION", "Reservation must be at least 15 minutes.");
		}
		if (duration.compareTo(Duration.ofDays(policy.maxDurationDays())) > 0) {
			throw ApiException.badRequest("POLICY_VIOLATION", "Reservation cannot exceed 7 days.");
		}
	}
}

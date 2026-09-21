package com.borrowhub.backend.booking;

import com.borrowhub.backend.audit.AuditEvent;
import com.borrowhub.backend.audit.AuditEventRepository;
import com.borrowhub.backend.common.ApiException;
import com.borrowhub.backend.common.BookingPolicyProperties;
import com.borrowhub.backend.common.CorrelationIdFilter;
import com.borrowhub.backend.common.PageResponse;
import com.borrowhub.backend.equipment.Equipment;
import com.borrowhub.backend.equipment.EquipmentRepository;
import com.borrowhub.backend.equipment.OperationalStatus;
import com.borrowhub.backend.idempotency.IdempotencyRecord;
import com.borrowhub.backend.idempotency.IdempotencyRecordRepository;
import com.borrowhub.backend.idempotency.RequestHash;
import com.borrowhub.backend.identity.AppUser;
import com.borrowhub.backend.identity.DemoIdentityService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class BookingService {

	static final String CREATE_ROUTE = "POST /v1/bookings";
	static final String CANCEL_ROUTE = "POST /v1/bookings/cancel";
	static final String COLLECT_ROUTE = "POST /v1/bookings/collect";
	static final String RETURN_ROUTE = "POST /v1/bookings/return";
	static final int DEFAULT_PAGE = 1;
	static final int DEFAULT_PAGE_SIZE = 20;
	static final int MAX_PAGE_SIZE = 100;

	private final DemoIdentityService demoIdentityService;
	private final EquipmentRepository equipmentRepository;
	private final BookingRepository bookingRepository;
	private final AuditEventRepository auditEventRepository;
	private final IdempotencyRecordRepository idempotencyRecordRepository;
	private final BookingPolicyProperties policy;
	private final Clock clock;
	private final TransactionTemplate transactionTemplate;
	private final Duration idempotencyTtl;

	public BookingService(
			DemoIdentityService demoIdentityService,
			EquipmentRepository equipmentRepository,
			BookingRepository bookingRepository,
			AuditEventRepository auditEventRepository,
			IdempotencyRecordRepository idempotencyRecordRepository,
			BookingPolicyProperties policy,
			Clock clock,
			PlatformTransactionManager transactionManager,
			@Value("${borrowhub.idempotency.ttl-hours:24}") int ttlHours) {
		this.demoIdentityService = demoIdentityService;
		this.equipmentRepository = equipmentRepository;
		this.bookingRepository = bookingRepository;
		this.auditEventRepository = auditEventRepository;
		this.idempotencyRecordRepository = idempotencyRecordRepository;
		this.policy = policy;
		this.clock = clock;
		this.transactionTemplate = new TransactionTemplate(transactionManager);
		this.idempotencyTtl = Duration.ofHours(ttlHours);
	}

	public BookingResponse create(
			String tenantIdHeader, String objectIdHeader, String idempotencyKeyHeader, CreateBookingRequest request) {
		AppUser user = demoIdentityService.requireUser(tenantIdHeader, objectIdHeader);
		UUID key = parseIdempotencyKey(idempotencyKeyHeader);
		String hash = RequestHash.forCreateBooking(request);
		Optional<IdempotencyRecord> existing =
				idempotencyRecordRepository.findByUserIdAndRouteAndKey(user.getId(), CREATE_ROUTE, key.toString());
		if (existing.isPresent()) {
			return replay(existing.get(), hash);
		}
		try {
			return transactionTemplate.execute(status -> persistNew(user, key, hash, request));
		}
		catch (RuntimeException ex) {
			if (!isUniqueConstraint(ex)) {
				throw ex;
			}
			IdempotencyRecord stored = idempotencyRecordRepository
					.findByUserIdAndRouteAndKey(user.getId(), CREATE_ROUTE, key.toString())
					.orElseThrow(() -> ex);
			return replay(stored, hash);
		}
	}

	private BookingResponse persistNew(AppUser user, UUID key, String hash, CreateBookingRequest request) {
		Instant now = Instant.now(clock);
		validatePolicy(request.startAt(), request.endAt(), now);
		Equipment equipment = equipmentRepository
				.lockById(request.equipmentId())
				.orElseThrow(() -> ApiException.notFound("Equipment was not found."));
		Optional<IdempotencyRecord> raced =
				idempotencyRecordRepository.findByUserIdAndRouteAndKey(user.getId(), CREATE_ROUTE, key.toString());
		if (raced.isPresent()) {
			return replay(raced.get(), hash);
		}
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
		BookingResponse response =
				BookingResponse.from(booking, BookingActions.allowed(booking, now, policy.collectionLeadMinutes()));
		idempotencyRecordRepository.saveAndFlush(new IdempotencyRecord(
				UUID.randomUUID(),
				user,
				CREATE_ROUTE,
				key.toString(),
				hash,
				201,
				response.toStoredMap(),
				createdAt,
				createdAt.plus(idempotencyTtl)));
		return response;
	}

	private BookingResponse replay(IdempotencyRecord record, String hash) {
		if (!record.getRequestHash().equals(hash)) {
			throw ApiException.conflict("IDEMPOTENCY_KEY_REUSED", "Idempotency-Key was already used with a different body.");
		}
		return BookingResponse.fromStoredMap(record.getResponseBody());
	}

	private static boolean isUniqueConstraint(Throwable error) {
		Throwable current = error;
		while (current != null) {
			if (current instanceof DataIntegrityViolationException) {
				return true;
			}
			if (current instanceof org.hibernate.exception.ConstraintViolationException) {
				return true;
			}
			current = current.getCause();
		}
		return false;
	}

	static UUID parseIdempotencyKey(String header) {
		if (header == null || header.isBlank()) {
			throw ApiException.badRequest("VALIDATION_ERROR", "Idempotency-Key is required.");
		}
		try {
			return UUID.fromString(header.trim());
		}
		catch (IllegalArgumentException ex) {
			throw ApiException.badRequest("VALIDATION_ERROR", "Idempotency-Key must be a UUID.");
		}
	}

	@Transactional(readOnly = true)
	public PageResponse<BookingResponse> listMine(String tenantIdHeader, String objectIdHeader, Integer page, Integer pageSize) {
		AppUser user = demoIdentityService.requireUser(tenantIdHeader, objectIdHeader);
		int resolvedPage = page == null ? DEFAULT_PAGE : page;
		int resolvedSize = pageSize == null ? DEFAULT_PAGE_SIZE : pageSize;
		if (resolvedPage < 1) {
			throw ApiException.badRequest("VALIDATION_ERROR", "page must be 1 or greater.");
		}
		if (resolvedSize < 1 || resolvedSize > MAX_PAGE_SIZE) {
			throw ApiException.badRequest("VALIDATION_ERROR", "pageSize must be between 1 and 100.");
		}
		Instant now = Instant.now(clock);
		PageRequest pageable = PageRequest.of(
				resolvedPage - 1,
				resolvedSize,
				Sort.by("startAt").descending().and(Sort.by("id").ascending()));
		Page<Booking> result = bookingRepository.findByUser_Id(user.getId(), pageable);
		return new PageResponse<>(
				result.getContent().stream()
						.map(booking -> BookingResponse.from(
								booking, BookingActions.allowed(booking, now, policy.collectionLeadMinutes())))
						.toList(),
				resolvedPage,
				resolvedSize,
				result.getTotalElements());
	}

	@Transactional(readOnly = true)
	public BookingResponse getMine(String tenantIdHeader, String objectIdHeader, UUID bookingId) {
		AppUser user = demoIdentityService.requireUser(tenantIdHeader, objectIdHeader);
		Booking booking = requireOwned(bookingId, user.getId());
		return BookingResponse.from(
				booking, BookingActions.allowed(booking, Instant.now(clock), policy.collectionLeadMinutes()));
	}

	public BookingResponse cancel(
			String tenantIdHeader, String objectIdHeader, String idempotencyKeyHeader, UUID bookingId) {
		AppUser user = demoIdentityService.requireUser(tenantIdHeader, objectIdHeader);
		UUID key = parseIdempotencyKey(idempotencyKeyHeader);
		String hash = RequestHash.forCancel(bookingId);
		Optional<IdempotencyRecord> existing =
				idempotencyRecordRepository.findByUserIdAndRouteAndKey(user.getId(), CANCEL_ROUTE, key.toString());
		if (existing.isPresent()) {
			return replay(existing.get(), hash);
		}
		try {
			return transactionTemplate.execute(status -> persistCancel(user, key, hash, bookingId));
		}
		catch (RuntimeException ex) {
			if (!isUniqueConstraint(ex)) {
				throw ex;
			}
			IdempotencyRecord stored = idempotencyRecordRepository
					.findByUserIdAndRouteAndKey(user.getId(), CANCEL_ROUTE, key.toString())
					.orElseThrow(() -> ex);
			return replay(stored, hash);
		}
	}

	private BookingResponse persistCancel(AppUser user, UUID key, String hash, UUID bookingId) {
		Booking booking = requireOwned(bookingId, user.getId());
		Equipment equipment = equipmentRepository
				.lockById(booking.getEquipment().getId())
				.orElseThrow(() -> ApiException.notFound("Equipment was not found."));
		Optional<IdempotencyRecord> raced =
				idempotencyRecordRepository.findByUserIdAndRouteAndKey(user.getId(), CANCEL_ROUTE, key.toString());
		if (raced.isPresent()) {
			return replay(raced.get(), hash);
		}
		booking = requireOwned(bookingId, user.getId());
		Instant now = Instant.now(clock);
		if (booking.getStatus() != BookingStatus.RESERVED) {
			throw ApiException.conflict("ILLEGAL_TRANSITION", "Only a reserved booking can be cancelled.");
		}
		if (!now.isBefore(booking.getStartAt())) {
			throw ApiException.conflict("TOO_LATE_TO_CANCEL", "A reservation can only be cancelled before it starts.");
		}
		booking.cancel(now);
		bookingRepository.save(booking);
		Map<String, Object> summary = new LinkedHashMap<>();
		summary.put("status", BookingStatus.CANCELLED.name());
		summary.put("equipmentId", equipment.getId().toString());
		String traceId = MDC.get(CorrelationIdFilter.MDC_KEY);
		auditEventRepository.save(new AuditEvent(
				UUID.randomUUID(),
				user,
				"booking",
				booking.getId(),
				"BOOKING_CANCELLED",
				now,
				traceId == null ? "" : traceId,
				summary));
		BookingResponse response =
				BookingResponse.from(booking, BookingActions.allowed(booking, now, policy.collectionLeadMinutes()));
		idempotencyRecordRepository.saveAndFlush(new IdempotencyRecord(
				UUID.randomUUID(),
				user,
				CANCEL_ROUTE,
				key.toString(),
				hash,
				200,
				response.toStoredMap(),
				now,
				now.plus(idempotencyTtl)));
		return response;
	}

	public BookingResponse collect(
			String tenantIdHeader, String objectIdHeader, String idempotencyKeyHeader, UUID bookingId) {
		AppUser user = demoIdentityService.requireUser(tenantIdHeader, objectIdHeader);
		UUID key = parseIdempotencyKey(idempotencyKeyHeader);
		String hash = RequestHash.forCollect(bookingId);
		Optional<IdempotencyRecord> existing =
				idempotencyRecordRepository.findByUserIdAndRouteAndKey(user.getId(), COLLECT_ROUTE, key.toString());
		if (existing.isPresent()) {
			return replay(existing.get(), hash);
		}
		try {
			return transactionTemplate.execute(status -> persistCollect(user, key, hash, bookingId));
		}
		catch (RuntimeException ex) {
			if (!isUniqueConstraint(ex)) {
				throw ex;
			}
			IdempotencyRecord stored = idempotencyRecordRepository
					.findByUserIdAndRouteAndKey(user.getId(), COLLECT_ROUTE, key.toString())
					.orElseThrow(() -> ex);
			return replay(stored, hash);
		}
	}

	public BookingResponse returnBooking(
			String tenantIdHeader, String objectIdHeader, String idempotencyKeyHeader, UUID bookingId) {
		AppUser user = demoIdentityService.requireUser(tenantIdHeader, objectIdHeader);
		UUID key = parseIdempotencyKey(idempotencyKeyHeader);
		String hash = RequestHash.forReturn(bookingId);
		Optional<IdempotencyRecord> existing =
				idempotencyRecordRepository.findByUserIdAndRouteAndKey(user.getId(), RETURN_ROUTE, key.toString());
		if (existing.isPresent()) {
			return replay(existing.get(), hash);
		}
		try {
			return transactionTemplate.execute(status -> persistReturn(user, key, hash, bookingId));
		}
		catch (RuntimeException ex) {
			if (!isUniqueConstraint(ex)) {
				throw ex;
			}
			IdempotencyRecord stored = idempotencyRecordRepository
					.findByUserIdAndRouteAndKey(user.getId(), RETURN_ROUTE, key.toString())
					.orElseThrow(() -> ex);
			return replay(stored, hash);
		}
	}

	private BookingResponse persistCollect(AppUser user, UUID key, String hash, UUID bookingId) {
		Booking booking = requireOwned(bookingId, user.getId());
		Equipment equipment = equipmentRepository
				.lockById(booking.getEquipment().getId())
				.orElseThrow(() -> ApiException.notFound("Equipment was not found."));
		Optional<IdempotencyRecord> raced =
				idempotencyRecordRepository.findByUserIdAndRouteAndKey(user.getId(), COLLECT_ROUTE, key.toString());
		if (raced.isPresent()) {
			return replay(raced.get(), hash);
		}
		booking = requireOwned(bookingId, user.getId());
		Instant now = Instant.now(clock);
		if (booking.getStatus() != BookingStatus.RESERVED) {
			throw ApiException.conflict("ILLEGAL_TRANSITION", "Only a reserved booking can be collected.");
		}
		Instant collectFrom = booking.getStartAt().minus(policy.collectionLeadMinutes(), ChronoUnit.MINUTES);
		if (now.isBefore(collectFrom)) {
			throw ApiException.conflict("TOO_EARLY_TO_COLLECT", "Collection opens 15 minutes before the reservation start.");
		}
		if (!now.isBefore(booking.getEndAt())) {
			throw ApiException.conflict("TOO_LATE_TO_COLLECT", "An uncollected reservation cannot be collected after it ends.");
		}
		if (bookingRepository.existsByEquipment_IdAndStatusAndIdNot(
				equipment.getId(), BookingStatus.CHECKED_OUT, booking.getId())) {
			throw ApiException.conflict("EQUIPMENT_CHECKED_OUT", "That asset is already on loan.");
		}
		booking.collect(now);
		bookingRepository.save(booking);
		return finishMutation(user, key, hash, booking, equipment, now, COLLECT_ROUTE, "BOOKING_COLLECTED");
	}

	private BookingResponse persistReturn(AppUser user, UUID key, String hash, UUID bookingId) {
		Booking booking = requireOwned(bookingId, user.getId());
		Equipment equipment = equipmentRepository
				.lockById(booking.getEquipment().getId())
				.orElseThrow(() -> ApiException.notFound("Equipment was not found."));
		Optional<IdempotencyRecord> raced =
				idempotencyRecordRepository.findByUserIdAndRouteAndKey(user.getId(), RETURN_ROUTE, key.toString());
		if (raced.isPresent()) {
			return replay(raced.get(), hash);
		}
		booking = requireOwned(bookingId, user.getId());
		Instant now = Instant.now(clock);
		if (booking.getStatus() != BookingStatus.CHECKED_OUT) {
			throw ApiException.conflict("ILLEGAL_TRANSITION", "Only a checked-out booking can be returned.");
		}
		booking.markReturned(now);
		bookingRepository.save(booking);
		return finishMutation(user, key, hash, booking, equipment, now, RETURN_ROUTE, "BOOKING_RETURNED");
	}

	private BookingResponse finishMutation(
			AppUser user,
			UUID key,
			String hash,
			Booking booking,
			Equipment equipment,
			Instant now,
			String route,
			String action) {
		Map<String, Object> summary = new LinkedHashMap<>();
		summary.put("status", booking.getStatus().name());
		summary.put("equipmentId", equipment.getId().toString());
		String traceId = MDC.get(CorrelationIdFilter.MDC_KEY);
		auditEventRepository.save(new AuditEvent(
				UUID.randomUUID(),
				user,
				"booking",
				booking.getId(),
				action,
				now,
				traceId == null ? "" : traceId,
				summary));
		BookingResponse response =
				BookingResponse.from(booking, BookingActions.allowed(booking, now, policy.collectionLeadMinutes()));
		idempotencyRecordRepository.saveAndFlush(new IdempotencyRecord(
				UUID.randomUUID(),
				user,
				route,
				key.toString(),
				hash,
				200,
				response.toStoredMap(),
				now,
				now.plus(idempotencyTtl)));
		return response;
	}

	private Booking requireOwned(UUID bookingId, UUID userId) {
		Booking booking = bookingRepository
				.findDetailedById(bookingId)
				.orElseThrow(() -> ApiException.notFound("Booking was not found."));
		if (!booking.getUser().getId().equals(userId)) {
			throw ApiException.notFound("Booking was not found.");
		}
		return booking;
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

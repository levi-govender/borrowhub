package com.borrowhub.backend.booking;

import com.borrowhub.backend.audit.AuditEvent;
import com.borrowhub.backend.audit.AuditEventRepository;
import com.borrowhub.backend.common.ApiException;
import com.borrowhub.backend.common.CorrelationIdFilter;
import com.borrowhub.backend.common.PageResponse;
import com.borrowhub.backend.equipment.Equipment;
import com.borrowhub.backend.equipment.EquipmentRepository;
import com.borrowhub.backend.equipment.OperationalStatus;
import com.borrowhub.backend.idempotency.IdempotencyRecord;
import com.borrowhub.backend.idempotency.IdempotencyRecordRepository;
import com.borrowhub.backend.idempotency.RequestHash;
import com.borrowhub.backend.identity.AppUser;
import com.borrowhub.backend.identity.IdentityService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
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
public class AdminBookingService {

	static final String ADMIN_CANCEL_ROUTE = "POST /v1/admin/bookings/cancel";

	private final IdentityService identityService;
	private final BookingRepository bookingRepository;
	private final EquipmentRepository equipmentRepository;
	private final AuditEventRepository auditEventRepository;
	private final IdempotencyRecordRepository idempotencyRecordRepository;
	private final Clock clock;
	private final TransactionTemplate transactionTemplate;
	private final Duration idempotencyTtl;

	public AdminBookingService(
			IdentityService identityService,
			BookingRepository bookingRepository,
			EquipmentRepository equipmentRepository,
			AuditEventRepository auditEventRepository,
			IdempotencyRecordRepository idempotencyRecordRepository,
			Clock clock,
			PlatformTransactionManager transactionManager,
			@Value("${borrowhub.idempotency.ttl-hours:24}") int ttlHours) {
		this.identityService = identityService;
		this.bookingRepository = bookingRepository;
		this.equipmentRepository = equipmentRepository;
		this.auditEventRepository = auditEventRepository;
		this.idempotencyRecordRepository = idempotencyRecordRepository;
		this.clock = clock;
		this.transactionTemplate = new TransactionTemplate(transactionManager);
		this.idempotencyTtl = Duration.ofHours(ttlHours);
	}

	@Transactional(readOnly = true)
	public AdminBookingResponses.Summary summary(String tenantId, String objectId) {
		identityService.requireAdmin(tenantId, objectId);
		Instant now = Instant.now(clock);
		return new AdminBookingResponses.Summary(
				bookingRepository.countByStatus(BookingStatus.RESERVED),
				bookingRepository.countByStatus(BookingStatus.CHECKED_OUT),
				bookingRepository.countByStatusAndEndAtBefore(BookingStatus.CHECKED_OUT, now),
				equipmentRepository.countByOperationalStatus(OperationalStatus.ACTIVE));
	}

	@Transactional(readOnly = true)
	public PageResponse<AdminBookingResponses.ListItem> list(
			String tenantId,
			String objectId,
			String query,
			String status,
			boolean overdue,
			String from,
			String to,
			Integer page,
			Integer pageSize) {
		identityService.requireAdmin(tenantId, objectId);
		int resolvedPage = page == null ? BookingService.DEFAULT_PAGE : page;
		int resolvedSize = pageSize == null ? BookingService.DEFAULT_PAGE_SIZE : pageSize;
		if (resolvedPage < 1) {
			throw ApiException.badRequest("VALIDATION_ERROR", "page must be 1 or greater.");
		}
		if (resolvedSize < 1 || resolvedSize > BookingService.MAX_PAGE_SIZE) {
			throw ApiException.badRequest("VALIDATION_ERROR", "pageSize must be between 1 and 100.");
		}
		Instant windowStart = parseBound(from, "from");
		Instant windowEnd = parseBound(to, "to");
		if ((windowStart == null) != (windowEnd == null)) {
			throw ApiException.badRequest("VALIDATION_ERROR", "from and to must both be set.");
		}
		if (windowStart != null && !windowStart.isBefore(windowEnd)) {
			throw ApiException.badRequest("VALIDATION_ERROR", "from must be before to.");
		}
		BookingStatus parsed = parseStatus(status);
		Instant now = Instant.now(clock);
		PageRequest pageable = PageRequest.of(
				resolvedPage - 1,
				resolvedSize,
				Sort.by("startAt").ascending().and(Sort.by("id").ascending()));
		Page<Booking> result = bookingRepository.findAll(
				AdminBookingSpecifications.filter(query, parsed, overdue, now, windowStart, windowEnd), pageable);
		return new PageResponse<>(
				result.getContent().stream().map(booking -> AdminBookingResponses.toListItem(booking, now)).toList(),
				resolvedPage,
				resolvedSize,
				result.getTotalElements());
	}

	@Transactional(readOnly = true)
	public AdminBookingResponses.Detail get(String tenantId, String objectId, UUID bookingId) {
		identityService.requireAdmin(tenantId, objectId);
		return toDetail(requireBooking(bookingId), Instant.now(clock));
	}

	public AdminBookingResponses.Detail cancel(
			String tenantId, String objectId, String idempotencyKeyHeader, UUID bookingId, AdminCancelRequest request) {
		AppUser admin = identityService.requireAdmin(tenantId, objectId);
		if (request == null || request.reason() == null || request.reason().isBlank()) {
			throw ApiException.badRequest("VALIDATION_ERROR", "A cancellation reason is required.");
		}
		String reason = request.reason().trim();
		UUID key = BookingService.parseIdempotencyKey(idempotencyKeyHeader);
		String hash = RequestHash.forAdminCancel(bookingId, reason);
		Optional<IdempotencyRecord> existing = idempotencyRecordRepository.findByUserIdAndRouteAndKey(
				admin.getId(), ADMIN_CANCEL_ROUTE, key.toString());
		if (existing.isPresent()) {
			return replayDetail(existing.get(), hash);
		}
		try {
			return transactionTemplate.execute(status -> persistAdminCancel(admin, key, hash, bookingId, reason));
		}
		catch (RuntimeException ex) {
			Throwable current = ex;
			boolean unique = false;
			while (current != null) {
				if (current instanceof DataIntegrityViolationException
						|| current instanceof org.hibernate.exception.ConstraintViolationException) {
					unique = true;
					break;
				}
				current = current.getCause();
			}
			if (!unique) {
				throw ex;
			}
			IdempotencyRecord stored = idempotencyRecordRepository
					.findByUserIdAndRouteAndKey(admin.getId(), ADMIN_CANCEL_ROUTE, key.toString())
					.orElseThrow(() -> ex);
			return replayDetail(stored, hash);
		}
	}

	private AdminBookingResponses.Detail persistAdminCancel(
			AppUser admin, UUID key, String hash, UUID bookingId, String reason) {
		Booking booking = requireBooking(bookingId);
		Equipment equipment = equipmentRepository
				.lockById(booking.getEquipment().getId())
				.orElseThrow(() -> ApiException.notFound("Equipment was not found."));
		Optional<IdempotencyRecord> raced = idempotencyRecordRepository.findByUserIdAndRouteAndKey(
				admin.getId(), ADMIN_CANCEL_ROUTE, key.toString());
		if (raced.isPresent()) {
			return replayDetail(raced.get(), hash);
		}
		booking = requireBooking(bookingId);
		Instant now = Instant.now(clock);
		if (booking.getStatus() != BookingStatus.RESERVED) {
			throw ApiException.conflict("ILLEGAL_TRANSITION", "Only an uncollected reservation can be cancelled.");
		}
		booking.cancel(now, reason);
		bookingRepository.save(booking);
		Map<String, Object> summary = new LinkedHashMap<>();
		summary.put("status", BookingStatus.CANCELLED.name());
		summary.put("reason", reason);
		summary.put("equipmentId", equipment.getId().toString());
		String traceId = MDC.get(CorrelationIdFilter.MDC_KEY);
		auditEventRepository.save(new AuditEvent(
				UUID.randomUUID(),
				admin,
				"booking",
				booking.getId(),
				"BOOKING_CANCELLED_ADMIN",
				now,
				traceId == null ? "" : traceId,
				summary));
		AdminBookingResponses.Detail detail = toDetail(booking, now);
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("id", detail.id().toString());
		body.put("status", detail.status().name());
		body.put("reason", reason);
		idempotencyRecordRepository.saveAndFlush(new IdempotencyRecord(
				UUID.randomUUID(),
				admin,
				ADMIN_CANCEL_ROUTE,
				key.toString(),
				hash,
				200,
				body,
				now,
				now.plus(idempotencyTtl)));
		return detail;
	}

	private AdminBookingResponses.Detail replayDetail(IdempotencyRecord record, String hash) {
		if (!record.getRequestHash().equals(hash)) {
			throw ApiException.conflict("IDEMPOTENCY_KEY_REUSED", "Idempotency-Key was already used with a different body.");
		}
		UUID bookingId = UUID.fromString(String.valueOf(record.getResponseBody().get("id")));
		return transactionTemplate.execute(status -> toDetail(requireBooking(bookingId), Instant.now(clock)));
	}

	private AdminBookingResponses.Detail toDetail(Booking booking, Instant now) {
		List<AdminBookingResponses.AuditItem> audit = auditEventRepository
				.findByEntityIdOrderByOccurredAtAsc(booking.getId())
				.stream()
				.map(event -> new AdminBookingResponses.AuditItem(
						event.getId(),
						event.getOccurredAt(),
						event.getAction(),
						event.getActor() == null ? "" : event.getActor().getDisplayName(),
						event.getChangeSummary()))
				.toList();
		List<String> actions = booking.getStatus() == BookingStatus.RESERVED ? List.of("CANCEL") : List.of();
		return new AdminBookingResponses.Detail(
				booking.getId(),
				booking.getEquipment().getId(),
				booking.getEquipment().getAssetTag(),
				booking.getEquipment().getName(),
				booking.getUser().getId(),
				booking.getUser().getDisplayName(),
				booking.getStartAt(),
				booking.getEndAt(),
				booking.getStatus(),
				AdminBookingResponses.isOverdue(booking, now),
				booking.getDamageNote(),
				booking.getCancellationReason(),
				actions,
				audit);
	}

	private Booking requireBooking(UUID bookingId) {
		return bookingRepository
				.findDetailedById(bookingId)
				.orElseThrow(() -> ApiException.notFound("Booking was not found."));
	}

	private static Instant parseBound(String value, String field) {
		if (value == null || value.isBlank()) {
			return null;
		}
		try {
			return Instant.parse(value);
		}
		catch (RuntimeException instantEx) {
			try {
				return OffsetDateTime.parse(value).toInstant();
			}
			catch (RuntimeException offsetEx) {
				throw ApiException.badRequest("VALIDATION_ERROR", field + " must be an ISO-8601 instant.");
			}
		}
	}

	private static BookingStatus parseStatus(String status) {
		if (status == null || status.isBlank()) {
			return null;
		}
		try {
			return BookingStatus.valueOf(status.trim().toUpperCase());
		}
		catch (IllegalArgumentException ex) {
			throw ApiException.badRequest("VALIDATION_ERROR", "status is invalid.");
		}
	}
}

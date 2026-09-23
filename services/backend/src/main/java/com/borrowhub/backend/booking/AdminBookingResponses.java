package com.borrowhub.backend.booking;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class AdminBookingResponses {

	private AdminBookingResponses() {
	}

	public record ListItem(
			UUID id,
			UUID equipmentId,
			String assetTag,
			String equipmentName,
			UUID userId,
			String borrower,
			Instant startAt,
			Instant endAt,
			BookingStatus status,
			boolean overdue) {
	}

	public record Detail(
			UUID id,
			UUID equipmentId,
			String assetTag,
			String equipmentName,
			UUID userId,
			String borrower,
			Instant startAt,
			Instant endAt,
			BookingStatus status,
			boolean overdue,
			String damageNote,
			String cancellationReason,
			List<String> allowedActions,
			List<AuditItem> audit) {
	}

	public record AuditItem(
			UUID id, Instant occurredAt, String action, String actor, Map<String, Object> changeSummary) {
	}

	public record Summary(long reserved, long checkedOut, long overdue, long activeEquipment) {
	}

	static ListItem toListItem(Booking booking, Instant now) {
		return new ListItem(
				booking.getId(),
				booking.getEquipment().getId(),
				booking.getEquipment().getAssetTag(),
				booking.getEquipment().getName(),
				booking.getUser().getId(),
				booking.getUser().getDisplayName(),
				booking.getStartAt(),
				booking.getEndAt(),
				booking.getStatus(),
				isOverdue(booking, now));
	}

	static boolean isOverdue(Booking booking, Instant now) {
		return booking.getStatus() == BookingStatus.CHECKED_OUT && booking.getEndAt().isBefore(now);
	}
}

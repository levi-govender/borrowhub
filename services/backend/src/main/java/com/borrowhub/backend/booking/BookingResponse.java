package com.borrowhub.backend.booking;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BookingResponse(
		UUID id,
		UUID equipmentId,
		String assetTag,
		UUID userId,
		Instant startAt,
		Instant endAt,
		BookingStatus status,
		List<String> allowedActions,
		Instant createdAt) {

	static BookingResponse from(Booking booking, List<String> allowedActions) {
		return new BookingResponse(
				booking.getId(),
				booking.getEquipment().getId(),
				booking.getEquipment().getAssetTag(),
				booking.getUser().getId(),
				booking.getStartAt(),
				booking.getEndAt(),
				booking.getStatus(),
				allowedActions,
				booking.getCreatedAt());
	}
}

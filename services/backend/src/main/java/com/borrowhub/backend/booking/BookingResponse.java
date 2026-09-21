package com.borrowhub.backend.booking;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

	Map<String, Object> toStoredMap() {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("id", id.toString());
		body.put("equipmentId", equipmentId.toString());
		body.put("assetTag", assetTag);
		body.put("userId", userId.toString());
		body.put("startAt", startAt.toString());
		body.put("endAt", endAt.toString());
		body.put("status", status.name());
		body.put("allowedActions", allowedActions);
		body.put("createdAt", createdAt.toString());
		return body;
	}

	@SuppressWarnings("unchecked")
	static BookingResponse fromStoredMap(Map<String, Object> body) {
		return new BookingResponse(
				UUID.fromString(String.valueOf(body.get("id"))),
				UUID.fromString(String.valueOf(body.get("equipmentId"))),
				String.valueOf(body.get("assetTag")),
				UUID.fromString(String.valueOf(body.get("userId"))),
				Instant.parse(String.valueOf(body.get("startAt"))),
				Instant.parse(String.valueOf(body.get("endAt"))),
				BookingStatus.valueOf(String.valueOf(body.get("status"))),
				(List<String>) body.get("allowedActions"),
				Instant.parse(String.valueOf(body.get("createdAt"))));
	}
}

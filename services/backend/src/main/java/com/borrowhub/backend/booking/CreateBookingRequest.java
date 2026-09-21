package com.borrowhub.backend.booking;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public record CreateBookingRequest(
		@NotNull UUID equipmentId, @NotNull Instant startAt, @NotNull Instant endAt) {
}

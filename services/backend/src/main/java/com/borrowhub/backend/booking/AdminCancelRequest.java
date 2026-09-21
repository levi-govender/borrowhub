package com.borrowhub.backend.booking;

import jakarta.validation.constraints.NotBlank;

public record AdminCancelRequest(@NotBlank String reason) {
}

package com.borrowhub.backend.booking;

import jakarta.validation.constraints.Size;

public record ReturnBookingRequest(@Size(max = 2000) String damageNote) {
}

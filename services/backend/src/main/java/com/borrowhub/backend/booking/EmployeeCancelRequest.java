package com.borrowhub.backend.booking;

import jakarta.validation.constraints.Size;

public record EmployeeCancelRequest(@Size(max = 500) String reason) {
}

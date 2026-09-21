package com.borrowhub.backend.equipment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AdminEquipmentRequest(
		@NotBlank String assetTag,
		@NotBlank String name,
		@NotBlank String category,
		String description,
		@NotBlank String location,
		@NotNull OperationalStatus operationalStatus) {
}

package com.borrowhub.backend.equipment;

import com.borrowhub.backend.common.BookingPolicyProperties;
import java.time.Instant;
import java.util.UUID;

public final class EquipmentResponses {

	private EquipmentResponses() {
	}

	public record ListItem(
			UUID id,
			String assetTag,
			String name,
			String category,
			String location,
			OperationalStatus operationalStatus,
			String checkedOutTo,
			UUID checkedOutBookingId,
			boolean loanOverdue) {
	}

	public record Detail(
			UUID id,
			String assetTag,
			String name,
			String category,
			String description,
			String location,
			OperationalStatus operationalStatus,
			Policy policy,
			CurrentLoan currentLoan) {
	}

	/** The single checked-out loan for this asset, when one exists. */
	public record CurrentLoan(UUID bookingId, String borrower, Instant startAt, Instant endAt, boolean overdue) {
	}

	public record Policy(
			String officeTimezone,
			int minDurationMinutes,
			int maxDurationDays,
			int maxAdvanceDays,
			int collectionLeadMinutes) {
	}

	public record Availability(
			UUID equipmentId, boolean available, String reason, java.time.Instant startAt, java.time.Instant endAt) {
	}

	static ListItem toListItem(Equipment equipment, String checkedOutTo, UUID checkedOutBookingId, boolean loanOverdue) {
		return new ListItem(
				equipment.getId(),
				equipment.getAssetTag(),
				equipment.getName(),
				equipment.getCategory(),
				equipment.getLocation(),
				equipment.getOperationalStatus(),
				checkedOutTo,
				checkedOutBookingId,
				loanOverdue);
	}

	static Detail toDetail(Equipment equipment, BookingPolicyProperties policy, CurrentLoan currentLoan) {
		return new Detail(
				equipment.getId(),
				equipment.getAssetTag(),
				equipment.getName(),
				equipment.getCategory(),
				equipment.getDescription(),
				equipment.getLocation(),
				equipment.getOperationalStatus(),
				new Policy(
						policy.officeTimezone(),
						policy.minDurationMinutes(),
						policy.maxDurationDays(),
						policy.maxAdvanceDays(),
						policy.collectionLeadMinutes()),
				currentLoan);
	}
}

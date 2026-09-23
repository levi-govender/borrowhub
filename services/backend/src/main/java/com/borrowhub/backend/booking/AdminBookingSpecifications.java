package com.borrowhub.backend.booking;

import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

final class AdminBookingSpecifications {

	private AdminBookingSpecifications() {
	}

	static Specification<Booking> filter(
			String query,
			BookingStatus status,
			boolean overdueOnly,
			boolean damagedOnly,
			Instant now,
			Instant from,
			Instant to) {
		return (root, criteriaQuery, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (damagedOnly) {
				predicates.add(cb.isNotNull(root.get("damageNote")));
				predicates.add(cb.notEqual(cb.trim(root.get("damageNote")), ""));
			}
			if (from != null && to != null) {
				predicates.add(cb.lessThan(root.get("startAt"), to));
				predicates.add(cb.greaterThan(root.get("endAt"), from));
			}
			if (status != null) {
				predicates.add(cb.equal(root.get("status"), status));
			}
			if (overdueOnly) {
				predicates.add(cb.equal(root.get("status"), BookingStatus.CHECKED_OUT));
				predicates.add(cb.lessThan(root.get("endAt"), now));
			}
			if (query != null && !query.isBlank()) {
				String pattern = "%" + query.trim().toLowerCase() + "%";
				var equipment = root.join("equipment");
				var user = root.join("user");
				predicates.add(cb.or(
						cb.like(cb.lower(equipment.get("assetTag")), pattern),
						cb.like(cb.lower(equipment.get("name")), pattern),
						cb.like(cb.lower(equipment.get("location")), pattern),
						cb.like(cb.lower(user.get("objectId")), pattern),
						cb.like(cb.lower(user.get("displayName")), pattern)));
			}
			return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(Predicate[]::new));
		};
	}
}

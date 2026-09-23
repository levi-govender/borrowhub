package com.borrowhub.backend.equipment;

import com.borrowhub.backend.booking.Booking;
import com.borrowhub.backend.booking.BookingStatus;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

final class EquipmentSpecifications {

	private EquipmentSpecifications() {
	}

	static Specification<Equipment> employeeCatalogue(String query, String category) {
		return (root, criteriaQuery, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			predicates.add(cb.notEqual(root.get("operationalStatus"), OperationalStatus.ARCHIVED));
			if (category != null && !category.isBlank()) {
				predicates.add(cb.equal(root.get("category"), category.trim()));
			}
			if (query != null && !query.isBlank()) {
				String pattern = "%" + query.trim().toLowerCase() + "%";
				predicates.add(cb.or(
						cb.like(cb.lower(root.get("name")), pattern),
						cb.like(cb.lower(root.get("assetTag")), pattern)));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	static Specification<Equipment> adminCatalogue(
			String query,
			String category,
			boolean checkedOutOnly,
			boolean loanOverdueOnly,
			boolean reservedOnly,
			Instant now) {
		return (root, criteriaQuery, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (loanOverdueOnly) {
				Subquery<Integer> overdue = criteriaQuery.subquery(Integer.class);
				Root<Booking> booking = overdue.from(Booking.class);
				overdue.select(cb.literal(1));
				overdue.where(
						cb.equal(booking.get("equipment").get("id"), root.get("id")),
						cb.equal(booking.get("status"), BookingStatus.CHECKED_OUT),
						cb.lessThan(booking.get("endAt"), now));
				predicates.add(cb.exists(overdue));
			}
			if (reservedOnly) {
				Subquery<Integer> reserved = criteriaQuery.subquery(Integer.class);
				Root<Booking> booking = reserved.from(Booking.class);
				reserved.select(cb.literal(1));
				reserved.where(
						cb.equal(booking.get("equipment").get("id"), root.get("id")),
						cb.equal(booking.get("status"), BookingStatus.RESERVED));
				predicates.add(cb.exists(reserved));
			}
			if (checkedOutOnly) {
				Subquery<Integer> checkedOut = criteriaQuery.subquery(Integer.class);
				Root<Booking> booking = checkedOut.from(Booking.class);
				checkedOut.select(cb.literal(1));
				checkedOut.where(
						cb.equal(booking.get("equipment").get("id"), root.get("id")),
						cb.equal(booking.get("status"), BookingStatus.CHECKED_OUT));
				predicates.add(cb.exists(checkedOut));
			}
			if (category != null && !category.isBlank()) {
				predicates.add(cb.equal(root.get("category"), category.trim()));
			}
			if (query != null && !query.isBlank()) {
				String pattern = "%" + query.trim().toLowerCase() + "%";
				Subquery<Integer> holder = criteriaQuery.subquery(Integer.class);
				Root<Booking> booking = holder.from(Booking.class);
				holder.select(cb.literal(1));
				holder.where(
						cb.equal(booking.get("equipment").get("id"), root.get("id")),
						booking.get("status").in(BookingStatus.RESERVED, BookingStatus.CHECKED_OUT),
						cb.like(cb.lower(booking.get("user").get("displayName")), pattern));
				predicates.add(cb.or(
						cb.like(cb.lower(root.get("name")), pattern),
						cb.like(cb.lower(root.get("assetTag")), pattern),
						cb.like(cb.lower(root.get("location")), pattern),
						cb.exists(holder)));
			}
			return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(Predicate[]::new));
		};
	}
}

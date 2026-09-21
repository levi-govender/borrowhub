package com.borrowhub.backend.equipment;

import jakarta.persistence.criteria.Predicate;
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
}

package com.borrowhub.backend.audit;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

final class AuditSpecifications {

	private AuditSpecifications() {
	}

	static Specification<AuditEvent> filter(String action, String entityType) {
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (action != null) {
				predicates.add(cb.equal(root.get("action"), action));
			}
			if (entityType != null) {
				predicates.add(cb.equal(root.get("entityType"), entityType));
			}
			return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(Predicate[]::new));
		};
	}
}

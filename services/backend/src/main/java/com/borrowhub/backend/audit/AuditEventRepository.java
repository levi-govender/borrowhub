package com.borrowhub.backend.audit;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID>, JpaSpecificationExecutor<AuditEvent> {

	List<AuditEvent> findByEntityIdOrderByOccurredAtAsc(UUID entityId);

	@EntityGraph(attributePaths = "actor")
	Page<AuditEvent> findAllByOrderByOccurredAtDesc(Pageable pageable);
}

package com.borrowhub.backend.idempotency;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IdempotencyRecordRepository extends JpaRepository<IdempotencyRecord, UUID> {

	Optional<IdempotencyRecord> findByUserIdAndRouteAndKey(UUID userId, String route, String key);
}

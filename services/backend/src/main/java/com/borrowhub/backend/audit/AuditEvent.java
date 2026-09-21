package com.borrowhub.backend.audit;

import com.borrowhub.backend.identity.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "audit_event")
public class AuditEvent {

	@Id
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "actor_user_id")
	private AppUser actor;

	@Column(name = "entity_type", nullable = false)
	private String entityType;

	@Column(name = "entity_id", nullable = false)
	private UUID entityId;

	@Column(nullable = false)
	private String action;

	@Column(name = "occurred_at", nullable = false)
	private Instant occurredAt;

	@Column(name = "correlation_id")
	private String correlationId;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "change_summary", nullable = false, columnDefinition = "jsonb")
	private Map<String, Object> changeSummary;

	protected AuditEvent() {
	}

	public AuditEvent(
			UUID id,
			AppUser actor,
			String entityType,
			UUID entityId,
			String action,
			Instant occurredAt,
			String correlationId,
			Map<String, Object> changeSummary) {
		this.id = id;
		this.actor = actor;
		this.entityType = entityType;
		this.entityId = entityId;
		this.action = action;
		this.occurredAt = occurredAt;
		this.correlationId = correlationId;
		this.changeSummary = changeSummary;
	}

	public UUID getId() {
		return id;
	}

	public String getAction() {
		return action;
	}

	public UUID getEntityId() {
		return entityId;
	}
}

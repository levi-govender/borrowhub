package com.borrowhub.backend.idempotency;

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
@Table(name = "idempotency_record")
public class IdempotencyRecord {

	@Id
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private AppUser user;

	@Column(nullable = false)
	private String route;

	@Column(nullable = false)
	private String key;

	@Column(name = "request_hash", nullable = false)
	private String requestHash;

	@Column(name = "response_status", nullable = false)
	private int responseStatus;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "response_body", columnDefinition = "jsonb")
	private Map<String, Object> responseBody;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "expires_at", nullable = false)
	private Instant expiresAt;

	protected IdempotencyRecord() {
	}

	public IdempotencyRecord(
			UUID id,
			AppUser user,
			String route,
			String key,
			String requestHash,
			int responseStatus,
			Map<String, Object> responseBody,
			Instant createdAt,
			Instant expiresAt) {
		this.id = id;
		this.user = user;
		this.route = route;
		this.key = key;
		this.requestHash = requestHash;
		this.responseStatus = responseStatus;
		this.responseBody = responseBody;
		this.createdAt = createdAt;
		this.expiresAt = expiresAt;
	}

	public UUID getId() {
		return id;
	}

	public String getRequestHash() {
		return requestHash;
	}

	public int getResponseStatus() {
		return responseStatus;
	}

	public Map<String, Object> getResponseBody() {
		return responseBody;
	}
}

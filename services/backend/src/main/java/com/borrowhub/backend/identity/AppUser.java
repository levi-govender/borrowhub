package com.borrowhub.backend.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_user")
public class AppUser {

	@Id
	private UUID id;

	@Column(name = "tenant_id", nullable = false)
	private String tenantId;

	@Column(name = "object_id", nullable = false)
	private String objectId;

	@Column(name = "display_name", nullable = false)
	private String displayName;

	@Column(nullable = false)
	private String email;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected AppUser() {
	}

	public AppUser(UUID id, String tenantId, String objectId, String displayName, String email, Instant createdAt) {
		this.id = id;
		this.tenantId = tenantId;
		this.objectId = objectId;
		this.displayName = displayName;
		this.email = email;
		this.createdAt = createdAt;
	}

	public UUID getId() {
		return id;
	}

	public String getTenantId() {
		return tenantId;
	}

	public String getObjectId() {
		return objectId;
	}
}

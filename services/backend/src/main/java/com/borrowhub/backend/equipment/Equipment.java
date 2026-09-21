package com.borrowhub.backend.equipment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "equipment")
public class Equipment {

	@Id
	private UUID id;

	@Column(name = "asset_tag", nullable = false, unique = true)
	private String assetTag;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false)
	private String category;

	private String description;

	@Column(nullable = false)
	private String location;

	@Enumerated(EnumType.STRING)
	@Column(name = "operational_status", nullable = false)
	private OperationalStatus operationalStatus;

	@Version
	@Column(nullable = false)
	private long version;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected Equipment() {
	}

	public Equipment(
			UUID id,
			String assetTag,
			String name,
			String category,
			String description,
			String location,
			OperationalStatus operationalStatus,
			Instant createdAt) {
		this.id = id;
		this.assetTag = assetTag;
		this.name = name;
		this.category = category;
		this.description = description;
		this.location = location;
		this.operationalStatus = operationalStatus;
		this.createdAt = createdAt;
		this.updatedAt = createdAt;
	}

	public UUID getId() {
		return id;
	}

	public String getAssetTag() {
		return assetTag;
	}

	public String getName() {
		return name;
	}

	public String getCategory() {
		return category;
	}

	public String getDescription() {
		return description;
	}

	public String getLocation() {
		return location;
	}

	public OperationalStatus getOperationalStatus() {
		return operationalStatus;
	}

	public void apply(
			String assetTag,
			String name,
			String category,
			String description,
			String location,
			OperationalStatus status,
			Instant now) {
		this.assetTag = assetTag;
		this.name = name;
		this.category = category;
		this.description = description;
		this.location = location;
		this.operationalStatus = status;
		this.updatedAt = now;
	}
}

package com.borrowhub.backend.booking;

import com.borrowhub.backend.equipment.Equipment;
import com.borrowhub.backend.identity.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "booking")
public class Booking {

	@Id
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "equipment_id", nullable = false)
	private Equipment equipment;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private AppUser user;

	@Column(name = "start_at", nullable = false)
	private Instant startAt;

	@Column(name = "end_at", nullable = false)
	private Instant endAt;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private BookingStatus status;

	@Version
	@Column(nullable = false)
	private long version;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@Column(name = "cancelled_at")
	private Instant cancelledAt;

	@Column(name = "cancellation_reason")
	private String cancellationReason;

	@Column(name = "collected_at")
	private Instant collectedAt;

	@Column(name = "returned_at")
	private Instant returnedAt;

	protected Booking() {
	}

	public Booking(
			UUID id,
			Equipment equipment,
			AppUser user,
			Instant startAt,
			Instant endAt,
			BookingStatus status,
			Instant createdAt) {
		this.id = id;
		this.equipment = equipment;
		this.user = user;
		this.startAt = startAt;
		this.endAt = endAt;
		this.status = status;
		this.createdAt = createdAt;
		this.updatedAt = createdAt;
	}

	public UUID getId() {
		return id;
	}

	public Instant getStartAt() {
		return startAt;
	}

	public Instant getEndAt() {
		return endAt;
	}

	public BookingStatus getStatus() {
		return status;
	}

	public Equipment getEquipment() {
		return equipment;
	}

	public AppUser getUser() {
		return user;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public void cancel(Instant at, String reason) {
		this.status = BookingStatus.CANCELLED;
		this.cancelledAt = at;
		this.cancellationReason = reason;
		this.updatedAt = at;
	}

	public void collect(Instant at) {
		this.status = BookingStatus.CHECKED_OUT;
		this.collectedAt = at;
		this.updatedAt = at;
	}

	public void markReturned(Instant at) {
		this.status = BookingStatus.RETURNED;
		this.returnedAt = at;
		this.updatedAt = at;
	}
}

package com.borrowhub.backend.booking;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

	@Query(
			"""
			select count(b) > 0 from Booking b
			where b.equipment.id = :equipmentId
			  and b.status in (com.borrowhub.backend.booking.BookingStatus.RESERVED,
			                   com.borrowhub.backend.booking.BookingStatus.CHECKED_OUT)
			  and b.startAt < :endAt
			  and b.endAt > :startAt
			""")
	boolean existsOverlap(
			@Param("equipmentId") UUID equipmentId,
			@Param("startAt") Instant startAt,
			@Param("endAt") Instant endAt);
}

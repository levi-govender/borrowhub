package com.borrowhub.backend.booking;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, UUID>, JpaSpecificationExecutor<Booking> {

	@EntityGraph(attributePaths = {"equipment", "user"})
	Page<Booking> findByUser_Id(UUID userId, Pageable pageable);

	@Query(
			"""
			select b from Booking b
			join fetch b.equipment
			join fetch b.user
			where b.id = :id
			""")
	Optional<Booking> findDetailedById(@Param("id") UUID id);

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

	boolean existsByEquipment_IdAndStatusAndIdNot(UUID equipmentId, BookingStatus status, UUID bookingId);

	long countByStatus(BookingStatus status);

	long countByStatusAndEndAtBefore(BookingStatus status, Instant endAt);
}

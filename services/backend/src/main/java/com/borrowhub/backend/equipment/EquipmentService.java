package com.borrowhub.backend.equipment;

import com.borrowhub.backend.booking.BookingRepository;
import com.borrowhub.backend.common.ApiException;
import com.borrowhub.backend.common.BookingPolicyProperties;
import com.borrowhub.backend.common.PageResponse;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EquipmentService {

	static final int DEFAULT_PAGE = 1;
	static final int DEFAULT_PAGE_SIZE = 20;
	static final int MAX_PAGE_SIZE = 100;

	private final EquipmentRepository equipmentRepository;
	private final BookingRepository bookingRepository;
	private final BookingPolicyProperties policy;

	public EquipmentService(
			EquipmentRepository equipmentRepository,
			BookingRepository bookingRepository,
			BookingPolicyProperties policy) {
		this.equipmentRepository = equipmentRepository;
		this.bookingRepository = bookingRepository;
		this.policy = policy;
	}

	@Transactional(readOnly = true)
	public PageResponse<EquipmentResponses.ListItem> list(String query, String category, Integer page, Integer pageSize) {
		int resolvedPage = page == null ? DEFAULT_PAGE : page;
		int resolvedSize = pageSize == null ? DEFAULT_PAGE_SIZE : pageSize;
		if (resolvedPage < 1) {
			throw ApiException.badRequest("VALIDATION_ERROR", "page must be 1 or greater.");
		}
		if (resolvedSize < 1 || resolvedSize > MAX_PAGE_SIZE) {
			throw ApiException.badRequest("VALIDATION_ERROR", "pageSize must be between 1 and 100.");
		}
		PageRequest pageable = PageRequest.of(
				resolvedPage - 1,
				resolvedSize,
				Sort.by("name").ascending().and(Sort.by("id").ascending()));
		Page<Equipment> result =
				equipmentRepository.findAll(EquipmentSpecifications.employeeCatalogue(query, category), pageable);
		return new PageResponse<>(
				result.getContent().stream().map(item -> EquipmentResponses.toListItem(item, null, false)).toList(),
				resolvedPage,
				resolvedSize,
				result.getTotalElements());
	}

	@Transactional(readOnly = true)
	public EquipmentResponses.Detail get(UUID id) {
		return EquipmentResponses.toDetail(requireVisible(id), policy, null);
	}

	@Transactional(readOnly = true)
	public EquipmentResponses.Availability availability(UUID id, Instant startAt, Instant endAt) {
		if (startAt == null || endAt == null) {
			throw ApiException.badRequest("VALIDATION_ERROR", "startAt and endAt are required.");
		}
		if (!endAt.isAfter(startAt)) {
			throw ApiException.badRequest("VALIDATION_ERROR", "endAt must be after startAt.");
		}
		Equipment equipment = requireVisible(id);
		if (equipment.getOperationalStatus() != OperationalStatus.ACTIVE) {
			return new EquipmentResponses.Availability(
					id, false, "EQUIPMENT_NOT_ACTIVE", startAt, endAt);
		}
		boolean overlap = bookingRepository.existsOverlap(id, startAt, endAt);
		if (overlap) {
			return new EquipmentResponses.Availability(id, false, "BOOKING_CONFLICT", startAt, endAt);
		}
		return new EquipmentResponses.Availability(id, true, null, startAt, endAt);
	}

	private Equipment requireVisible(UUID id) {
		Equipment equipment = equipmentRepository
				.findById(id)
				.orElseThrow(() -> ApiException.notFound("Equipment was not found."));
		if (equipment.getOperationalStatus() == OperationalStatus.ARCHIVED) {
			throw ApiException.notFound("Equipment was not found.");
		}
		return equipment;
	}
}

package com.borrowhub.backend.equipment;

import com.borrowhub.backend.common.PageResponse;
import java.time.Instant;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/equipment")
public class EquipmentController {

	private final EquipmentService equipmentService;

	public EquipmentController(EquipmentService equipmentService) {
		this.equipmentService = equipmentService;
	}

	@GetMapping
	public PageResponse<EquipmentResponses.ListItem> list(
			@RequestParam(required = false) String query,
			@RequestParam(required = false) String category,
			@RequestParam(required = false) Integer page,
			@RequestParam(required = false) Integer pageSize) {
		return equipmentService.list(query, category, page, pageSize);
	}

	@GetMapping("/{id}")
	public EquipmentResponses.Detail get(@PathVariable UUID id) {
		return equipmentService.get(id);
	}

	@GetMapping("/{id}/availability")
	public EquipmentResponses.Availability availability(
			@PathVariable UUID id,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startAt,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endAt) {
		return equipmentService.availability(id, startAt, endAt);
	}
}

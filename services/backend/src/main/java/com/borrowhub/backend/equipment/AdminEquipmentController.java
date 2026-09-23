package com.borrowhub.backend.equipment;

import com.borrowhub.backend.common.PageResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/admin/equipment")
public class AdminEquipmentController {

	private final AdminEquipmentService adminEquipmentService;

	public AdminEquipmentController(AdminEquipmentService adminEquipmentService) {
		this.adminEquipmentService = adminEquipmentService;
	}

	@GetMapping
	public PageResponse<EquipmentResponses.ListItem> list(
			@RequestHeader(value = "X-Demo-Tenant-Id", required = false) String tenantId,
			@RequestHeader(value = "X-Demo-Object-Id", required = false) String objectId,
			@RequestParam(required = false) String query,
			@RequestParam(required = false) String category,
			@RequestParam(required = false, defaultValue = "false") boolean checkedOut,
			@RequestParam(required = false) Integer page,
			@RequestParam(required = false) Integer pageSize) {
		return adminEquipmentService.list(tenantId, objectId, query, category, checkedOut, page, pageSize);
	}

	@GetMapping("/{id}")
	public EquipmentResponses.Detail get(
			@PathVariable UUID id,
			@RequestHeader(value = "X-Demo-Tenant-Id", required = false) String tenantId,
			@RequestHeader(value = "X-Demo-Object-Id", required = false) String objectId) {
		return adminEquipmentService.get(tenantId, objectId, id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public EquipmentResponses.Detail create(
			@Valid @RequestBody AdminEquipmentRequest request,
			@RequestHeader(value = "X-Demo-Tenant-Id", required = false) String tenantId,
			@RequestHeader(value = "X-Demo-Object-Id", required = false) String objectId) {
		return adminEquipmentService.create(tenantId, objectId, request);
	}

	@PatchMapping("/{id}")
	public EquipmentResponses.Detail update(
			@PathVariable UUID id,
			@Valid @RequestBody AdminEquipmentRequest request,
			@RequestHeader(value = "X-Demo-Tenant-Id", required = false) String tenantId,
			@RequestHeader(value = "X-Demo-Object-Id", required = false) String objectId) {
		return adminEquipmentService.update(tenantId, objectId, id, request);
	}
}

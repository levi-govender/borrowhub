package com.borrowhub.backend.booking;

import com.borrowhub.backend.common.PageResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/admin")
public class AdminBookingController {

	private final AdminBookingService adminBookingService;

	public AdminBookingController(AdminBookingService adminBookingService) {
		this.adminBookingService = adminBookingService;
	}

	@GetMapping("/summary")
	public AdminBookingResponses.Summary summary(
			@RequestHeader(value = "X-Demo-Tenant-Id", required = false) String tenantId,
			@RequestHeader(value = "X-Demo-Object-Id", required = false) String objectId) {
		return adminBookingService.summary(tenantId, objectId);
	}

	@GetMapping("/bookings")
	public PageResponse<AdminBookingResponses.ListItem> list(
			@RequestHeader(value = "X-Demo-Tenant-Id", required = false) String tenantId,
			@RequestHeader(value = "X-Demo-Object-Id", required = false) String objectId,
			@RequestParam(required = false) String query,
			@RequestParam(required = false) String status,
			@RequestParam(required = false, defaultValue = "false") boolean overdue,
			@RequestParam(required = false) String from,
			@RequestParam(required = false) String to,
			@RequestParam(required = false) Integer page,
			@RequestParam(required = false) Integer pageSize) {
		return adminBookingService.list(tenantId, objectId, query, status, overdue, from, to, page, pageSize);
	}

	@GetMapping("/bookings/{id}")
	public AdminBookingResponses.Detail get(
			@PathVariable UUID id,
			@RequestHeader(value = "X-Demo-Tenant-Id", required = false) String tenantId,
			@RequestHeader(value = "X-Demo-Object-Id", required = false) String objectId) {
		return adminBookingService.get(tenantId, objectId, id);
	}

	@PostMapping("/bookings/{id}/cancel")
	public AdminBookingResponses.Detail cancel(
			@PathVariable UUID id,
			@Valid @RequestBody AdminCancelRequest request,
			@RequestHeader(value = "X-Demo-Tenant-Id", required = false) String tenantId,
			@RequestHeader(value = "X-Demo-Object-Id", required = false) String objectId,
			@RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
		return adminBookingService.cancel(tenantId, objectId, idempotencyKey, id, request);
	}
}

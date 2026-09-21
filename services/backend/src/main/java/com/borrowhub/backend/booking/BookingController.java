package com.borrowhub.backend.booking;

import com.borrowhub.backend.common.PageResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/bookings")
public class BookingController {

	public static final String DEMO_OBJECT_HEADER = "X-Demo-Object-Id";
	public static final String DEMO_TENANT_HEADER = "X-Demo-Tenant-Id";
	public static final String IDEMPOTENCY_HEADER = "Idempotency-Key";

	private final BookingService bookingService;

	public BookingController(BookingService bookingService) {
		this.bookingService = bookingService;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public BookingResponse create(
			@Valid @RequestBody CreateBookingRequest request,
			@RequestHeader(value = DEMO_TENANT_HEADER, required = false) String tenantId,
			@RequestHeader(value = DEMO_OBJECT_HEADER, required = false) String objectId,
			@RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
		return bookingService.create(tenantId, objectId, idempotencyKey, request);
	}

	@GetMapping
	public PageResponse<BookingResponse> listMine(
			@RequestHeader(value = DEMO_TENANT_HEADER, required = false) String tenantId,
			@RequestHeader(value = DEMO_OBJECT_HEADER, required = false) String objectId,
			@RequestParam(required = false) Integer page,
			@RequestParam(required = false) Integer pageSize) {
		return bookingService.listMine(tenantId, objectId, page, pageSize);
	}

	@GetMapping("/{id}")
	public BookingResponse getMine(
			@PathVariable UUID id,
			@RequestHeader(value = DEMO_TENANT_HEADER, required = false) String tenantId,
			@RequestHeader(value = DEMO_OBJECT_HEADER, required = false) String objectId) {
		return bookingService.getMine(tenantId, objectId, id);
	}

	@PostMapping("/{id}/cancel")
	public BookingResponse cancel(
			@PathVariable UUID id,
			@RequestHeader(value = DEMO_TENANT_HEADER, required = false) String tenantId,
			@RequestHeader(value = DEMO_OBJECT_HEADER, required = false) String objectId,
			@RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
		return bookingService.cancel(tenantId, objectId, idempotencyKey, id);
	}

	@PostMapping("/{id}/collect")
	public BookingResponse collect(
			@PathVariable UUID id,
			@RequestHeader(value = DEMO_TENANT_HEADER, required = false) String tenantId,
			@RequestHeader(value = DEMO_OBJECT_HEADER, required = false) String objectId,
			@RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
		return bookingService.collect(tenantId, objectId, idempotencyKey, id);
	}

	@PostMapping("/{id}/return")
	public BookingResponse returnBooking(
			@PathVariable UUID id,
			@RequestHeader(value = DEMO_TENANT_HEADER, required = false) String tenantId,
			@RequestHeader(value = DEMO_OBJECT_HEADER, required = false) String objectId,
			@RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
		return bookingService.returnBooking(tenantId, objectId, idempotencyKey, id);
	}
}

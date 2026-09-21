package com.borrowhub.backend.booking;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/bookings")
public class BookingController {

	public static final String DEMO_OBJECT_HEADER = "X-Demo-Object-Id";
	public static final String DEMO_TENANT_HEADER = "X-Demo-Tenant-Id";

	private final BookingService bookingService;

	public BookingController(BookingService bookingService) {
		this.bookingService = bookingService;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public BookingResponse create(
			@Valid @RequestBody CreateBookingRequest request,
			@RequestHeader(value = DEMO_TENANT_HEADER, required = false) String tenantId,
			@RequestHeader(value = DEMO_OBJECT_HEADER, required = false) String objectId) {
		return bookingService.create(tenantId, objectId, request);
	}
}

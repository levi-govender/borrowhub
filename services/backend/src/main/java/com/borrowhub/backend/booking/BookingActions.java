package com.borrowhub.backend.booking;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

final class BookingActions {

	private BookingActions() {
	}

	static List<String> allowed(Booking booking, Instant now, int collectionLeadMinutes) {
		List<String> actions = new ArrayList<>();
		BookingStatus status = booking.getStatus();
		if (status == BookingStatus.RESERVED && now.isBefore(booking.getStartAt())) {
			actions.add("CANCEL");
		}
		Instant collectFrom = booking.getStartAt().minus(collectionLeadMinutes, ChronoUnit.MINUTES);
		if (status == BookingStatus.RESERVED && !now.isBefore(collectFrom) && now.isBefore(booking.getEndAt())) {
			actions.add("COLLECT");
		}
		if (status == BookingStatus.CHECKED_OUT) {
			actions.add("RETURN");
		}
		return List.copyOf(actions);
	}
}

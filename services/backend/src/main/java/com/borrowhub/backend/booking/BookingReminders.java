package com.borrowhub.backend.booking;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

final class BookingReminders {

	private BookingReminders() {
	}

	static List<String> kinds(Booking booking, Instant now, int collectionLeadMinutes) {
		List<String> kinds = new ArrayList<>();
		BookingStatus status = booking.getStatus();
		Instant collectFrom = booking.getStartAt().minus(collectionLeadMinutes, ChronoUnit.MINUTES);
		if (status == BookingStatus.RESERVED && !now.isBefore(collectFrom) && now.isBefore(booking.getEndAt())) {
			kinds.add("COLLECT_NOW");
		}
		if (status == BookingStatus.CHECKED_OUT) {
			if (!now.isBefore(booking.getEndAt())) {
				kinds.add("OVERDUE");
			}
			else {
				kinds.add("RETURN_NOW");
			}
		}
		return List.copyOf(kinds);
	}
}

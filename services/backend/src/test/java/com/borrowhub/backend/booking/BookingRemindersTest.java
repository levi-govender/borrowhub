package com.borrowhub.backend.booking;

import static org.assertj.core.api.Assertions.assertThat;

import com.borrowhub.backend.equipment.Equipment;
import com.borrowhub.backend.equipment.OperationalStatus;
import com.borrowhub.backend.identity.AppUser;
import com.borrowhub.backend.identity.UserRole;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class BookingRemindersTest {

	private static final Instant NOW = Instant.parse("2026-09-21T10:00:00Z");

	@Test
	void collectNowInsideLeadWindow() {
		Booking booking = reserved(Instant.parse("2026-09-21T10:10:00Z"), Instant.parse("2026-09-21T14:00:00Z"));
		assertThat(BookingReminders.kinds(booking, NOW, 15)).containsExactly("COLLECT_NOW");
	}

	@Test
	void noCollectReminderBeforeLeadWindow() {
		Booking booking = reserved(Instant.parse("2026-09-21T10:30:00Z"), Instant.parse("2026-09-21T14:00:00Z"));
		assertThat(BookingReminders.kinds(booking, NOW, 15)).isEmpty();
	}

	@Test
	void returnNowWhileCheckedOutBeforeEnd() {
		Booking booking = checkedOut(Instant.parse("2026-09-21T09:00:00Z"), Instant.parse("2026-09-21T12:00:00Z"));
		assertThat(BookingReminders.kinds(booking, NOW, 15)).containsExactly("RETURN_NOW");
	}

	@Test
	void overdueWhenCheckedOutPastEnd() {
		Booking booking = checkedOut(Instant.parse("2026-09-21T08:00:00Z"), Instant.parse("2026-09-21T09:00:00Z"));
		assertThat(BookingReminders.kinds(booking, NOW, 15)).containsExactly("OVERDUE");
	}

	private static Booking reserved(Instant start, Instant end) {
		return booking(BookingStatus.RESERVED, start, end);
	}

	private static Booking checkedOut(Instant start, Instant end) {
		return booking(BookingStatus.CHECKED_OUT, start, end);
	}

	private static Booking booking(BookingStatus status, Instant start, Instant end) {
		Equipment equipment = new Equipment(
				UUID.randomUUID(),
				"PHONE-001",
				"Pixel",
				"phone",
				null,
				"lab",
				OperationalStatus.ACTIVE,
				NOW);
		AppUser user = new AppUser(
				UUID.randomUUID(),
				"dev-tenant",
				"employee-a",
				"employee-a",
				"a@demo.local",
				UserRole.EMPLOYEE,
				NOW);
		return new Booking(UUID.randomUUID(), equipment, user, start, end, status, NOW);
	}
}

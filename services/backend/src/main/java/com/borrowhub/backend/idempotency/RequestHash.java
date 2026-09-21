package com.borrowhub.backend.idempotency;

import com.borrowhub.backend.booking.CreateBookingRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

public final class RequestHash {

	private RequestHash() {
	}

	public static String forCreateBooking(CreateBookingRequest request) {
		return sha256(request.equipmentId() + "\n" + request.startAt() + "\n" + request.endAt());
	}

	public static String forCancel(UUID bookingId) {
		return sha256("cancel\n" + bookingId);
	}

	public static String forCollect(UUID bookingId) {
		return sha256("collect\n" + bookingId);
	}

	public static String forReturn(UUID bookingId) {
		return sha256("return\n" + bookingId);
	}

	public static String forAdminCancel(UUID bookingId, String reason) {
		return sha256("admin-cancel\n" + bookingId + "\n" + reason);
	}

	private static String sha256(String canonical) {
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		}
		catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException("SHA-256 is required", ex);
		}
	}
}

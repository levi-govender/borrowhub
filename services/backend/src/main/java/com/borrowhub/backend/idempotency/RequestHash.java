package com.borrowhub.backend.idempotency;

import com.borrowhub.backend.booking.CreateBookingRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public final class RequestHash {

	private RequestHash() {
	}

	public static String forCreateBooking(CreateBookingRequest request) {
		String canonical = request.equipmentId() + "\n" + request.startAt() + "\n" + request.endAt();
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		}
		catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException("SHA-256 is required", ex);
		}
	}
}

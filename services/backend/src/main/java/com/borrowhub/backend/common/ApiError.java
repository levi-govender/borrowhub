package com.borrowhub.backend.common;

import java.util.Map;

public record ApiError(String code, String message, String traceId, Map<String, String> fieldErrors) {

	public static ApiError of(String code, String message, String traceId) {
		return new ApiError(code, message, traceId, Map.of());
	}
}

package com.borrowhub.backend.common;

public class ApiException extends RuntimeException {

	private final String code;
	private final int status;

	public ApiException(int status, String code, String message) {
		super(message);
		this.status = status;
		this.code = code;
	}

	public String getCode() {
		return code;
	}

	public int getStatus() {
		return status;
	}

	public static ApiException notFound(String message) {
		return new ApiException(404, "NOT_FOUND", message);
	}

	public static ApiException badRequest(String code, String message) {
		return new ApiException(400, code, message);
	}

	public static ApiException conflict(String code, String message) {
		return new ApiException(409, code, message);
	}

	public static ApiException unauthorized(String message) {
		return new ApiException(401, "UNAUTHORIZED", message);
	}
}

package com.borrowhub.backend.common;

import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler(ApiException.class)
	ResponseEntity<ApiError> handleApi(ApiException ex) {
		return ResponseEntity.status(ex.getStatus()).body(ApiError.of(ex.getCode(), ex.getMessage(), traceId()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
		Map<String, String> fields = ex.getBindingResult().getFieldErrors().stream()
				.collect(Collectors.toMap(
						error -> error.getField(),
						error -> error.getDefaultMessage() == null ? "invalid" : error.getDefaultMessage(),
						(left, right) -> left));
		return ResponseEntity.badRequest()
				.body(new ApiError("VALIDATION_ERROR", "Request is invalid.", traceId(), fields));
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
		return ResponseEntity.badRequest()
				.body(ApiError.of("VALIDATION_ERROR", "Request is invalid.", traceId()));
	}

	private static String traceId() {
		String traceId = MDC.get(CorrelationIdFilter.MDC_KEY);
		return traceId == null ? "" : traceId;
	}
}

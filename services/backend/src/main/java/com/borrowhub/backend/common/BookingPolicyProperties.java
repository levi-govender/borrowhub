package com.borrowhub.backend.common;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "borrowhub.policy")
public record BookingPolicyProperties(
		String officeTimezone,
		int minDurationMinutes,
		int maxDurationDays,
		int maxAdvanceDays,
		int collectionLeadMinutes) {
}

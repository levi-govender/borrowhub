package com.borrowhub.backend.identity;

import java.util.UUID;

public record MeResponse(
		UUID id, String tenantId, String objectId, String displayName, String email, UserRole role) {

	public static MeResponse from(AppUser user) {
		return new MeResponse(
				user.getId(),
				user.getTenantId(),
				user.getObjectId(),
				user.getDisplayName(),
				user.getEmail(),
				user.getRole());
	}
}

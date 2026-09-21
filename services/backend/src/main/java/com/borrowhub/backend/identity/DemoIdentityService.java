package com.borrowhub.backend.identity;

import com.borrowhub.backend.common.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DemoIdentityService {

	private final DemoIdentityProperties properties;
	private final AppUserRepository appUserRepository;
	private final Clock clock;

	public DemoIdentityService(
			DemoIdentityProperties properties, AppUserRepository appUserRepository, Clock clock) {
		this.properties = properties;
		this.appUserRepository = appUserRepository;
		this.clock = clock;
	}

	@Transactional
	public AppUser requireUser(String tenantIdHeader, String objectIdHeader) {
		if (!properties.enabled()) {
			throw ApiException.unauthorized("Sign-in is required.");
		}
		if (objectIdHeader == null || objectIdHeader.isBlank()) {
			throw ApiException.unauthorized("X-Demo-Object-Id is required for local demo identity.");
		}
		String tenantId = tenantIdHeader == null || tenantIdHeader.isBlank()
				? properties.defaultTenantId()
				: tenantIdHeader.trim();
		String objectId = objectIdHeader.trim();
		return appUserRepository
				.findByTenantIdAndObjectId(tenantId, objectId)
				.orElseGet(() -> appUserRepository.save(new AppUser(
						UUID.randomUUID(),
						tenantId,
						objectId,
						objectId,
						objectId + "@demo.borrowhub.local",
						Instant.now(clock))));
	}
}

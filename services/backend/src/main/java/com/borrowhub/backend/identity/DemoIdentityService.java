package com.borrowhub.backend.identity;

import com.borrowhub.backend.common.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DemoIdentityService {

	private final DemoIdentityProperties properties;
	private final AppUserRepository appUserRepository;
	private final Clock clock;
	private final TransactionTemplate transactionTemplate;

	public DemoIdentityService(
			DemoIdentityProperties properties,
			AppUserRepository appUserRepository,
			Clock clock,
			PlatformTransactionManager transactionManager) {
		this.properties = properties;
		this.appUserRepository = appUserRepository;
		this.clock = clock;
		this.transactionTemplate = new TransactionTemplate(transactionManager);
	}

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
				.orElseGet(() -> createOrLoad(tenantId, objectId));
	}

	private AppUser createOrLoad(String tenantId, String objectId) {
		try {
			return transactionTemplate.execute(status -> appUserRepository.saveAndFlush(new AppUser(
					UUID.randomUUID(),
					tenantId,
					objectId,
					objectId,
					objectId + "@demo.borrowhub.local",
					Instant.now(clock))));
		}
		catch (RuntimeException ex) {
			if (!isUniqueConstraint(ex)) {
				throw ex;
			}
			return appUserRepository.findByTenantIdAndObjectId(tenantId, objectId).orElseThrow(() -> ex);
		}
	}

	private static boolean isUniqueConstraint(Throwable error) {
		Throwable current = error;
		while (current != null) {
			if (current instanceof DataIntegrityViolationException) {
				return true;
			}
			if (current instanceof org.hibernate.exception.ConstraintViolationException) {
				return true;
			}
			current = current.getCause();
		}
		return false;
	}
}

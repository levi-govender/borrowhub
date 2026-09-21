package com.borrowhub.backend.identity;

import com.borrowhub.backend.common.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

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
		this.transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
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
		UserRole role = parseRole(currentRoleHeader());
		AppUser user = appUserRepository
				.findByTenantIdAndObjectId(tenantId, objectId)
				.orElseGet(() -> createOrLoad(tenantId, objectId, role));
		if (user.getRole() != role) {
			UUID userId = user.getId();
			user = transactionTemplate.execute(status -> {
				AppUser managed = appUserRepository.findById(userId).orElseThrow();
				managed.setRole(role);
				return appUserRepository.save(managed);
			});
		}
		return user;
	}

	public AppUser requireAdmin(String tenantIdHeader, String objectIdHeader) {
		AppUser user = requireUser(tenantIdHeader, objectIdHeader);
		if (!user.isAdmin()) {
			throw ApiException.forbidden("Administrator access is required.");
		}
		return user;
	}

	private AppUser createOrLoad(String tenantId, String objectId, UserRole role) {
		try {
			return transactionTemplate.execute(status -> appUserRepository.saveAndFlush(new AppUser(
					UUID.randomUUID(),
					tenantId,
					objectId,
					objectId,
					objectId + "@demo.borrowhub.local",
					role,
					Instant.now(clock))));
		}
		catch (RuntimeException ex) {
			if (!isUniqueConstraint(ex)) {
				throw ex;
			}
			return appUserRepository.findByTenantIdAndObjectId(tenantId, objectId).orElseThrow(() -> ex);
		}
	}

	private static UserRole parseRole(String header) {
		if (header == null || header.isBlank()) {
			return UserRole.EMPLOYEE;
		}
		try {
			return UserRole.valueOf(header.trim().toUpperCase());
		}
		catch (IllegalArgumentException ex) {
			throw ApiException.badRequest("VALIDATION_ERROR", "X-Demo-Role must be EMPLOYEE or ADMIN.");
		}
	}

	private static String currentRoleHeader() {
		if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
			return attributes.getRequest().getHeader("X-Demo-Role");
		}
		return null;
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

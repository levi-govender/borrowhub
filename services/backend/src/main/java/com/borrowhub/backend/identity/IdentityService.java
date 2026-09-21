package com.borrowhub.backend.identity;

import com.borrowhub.backend.common.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
public class IdentityService {

	private final DemoIdentityProperties properties;
	private final AppUserRepository appUserRepository;
	private final Clock clock;
	private final TransactionTemplate transactionTemplate;

	public IdentityService(
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
		Jwt jwt = currentJwt();
		if (jwt != null) {
			return upsertFromJwt(jwt);
		}
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
		UserRole role = parseDemoRole(currentRoleHeader());
		return upsert(tenantId, objectId, objectId, objectId + "@demo.borrowhub.local", role);
	}

	public AppUser requireAdmin(String tenantIdHeader, String objectIdHeader) {
		AppUser user = requireUser(tenantIdHeader, objectIdHeader);
		if (!user.isAdmin()) {
			throw ApiException.forbidden("Administrator access is required.");
		}
		return user;
	}

	private AppUser upsertFromJwt(Jwt jwt) {
		String objectId = stringClaim(jwt, "oid");
		String tenantId = stringClaim(jwt, "tid");
		if (objectId == null || tenantId == null) {
			throw ApiException.unauthorized("The access token is missing oid or tid.");
		}
		String email = firstNonBlank(stringClaim(jwt, "preferred_username"), stringClaim(jwt, "email"), objectId + "@entra.local");
		String name = firstNonBlank(stringClaim(jwt, "name"), email);
		return upsert(tenantId, objectId, name, email, roleFromJwt(jwt));
	}

	private AppUser upsert(String tenantId, String objectId, String displayName, String email, UserRole role) {
		AppUser user = appUserRepository
				.findByTenantIdAndObjectId(tenantId, objectId)
				.orElseGet(() -> createOrLoad(tenantId, objectId, displayName, email, role));
		boolean dirty = user.getRole() != role
				|| !displayName.equals(user.getDisplayName())
				|| !email.equals(user.getEmail());
		if (!dirty) {
			return user;
		}
		UUID userId = user.getId();
		return transactionTemplate.execute(status -> {
			AppUser managed = appUserRepository.findById(userId).orElseThrow();
			managed.setRole(role);
			managed.setDisplayName(displayName);
			managed.setEmail(email);
			return appUserRepository.save(managed);
		});
	}

	private AppUser createOrLoad(
			String tenantId, String objectId, String displayName, String email, UserRole role) {
		try {
			return transactionTemplate.execute(status -> appUserRepository.saveAndFlush(new AppUser(
					UUID.randomUUID(),
					tenantId,
					objectId,
					displayName,
					email,
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

	private static Jwt currentJwt() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
			return jwt;
		}
		return null;
	}

	static UserRole roleFromJwt(Jwt jwt) {
		Object roles = jwt.getClaims().get("roles");
		if (roles instanceof Collection<?> values) {
			for (Object value : values) {
				if (value != null && "admin".equalsIgnoreCase(value.toString())) {
					return UserRole.ADMIN;
				}
			}
		}
		return UserRole.EMPLOYEE;
	}

	private static UserRole parseDemoRole(String header) {
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

	private static String stringClaim(Jwt jwt, String name) {
		Object value = jwt.getClaims().get(name);
		if (value == null) {
			return null;
		}
		String text = value.toString().trim();
		return text.isEmpty() ? null : text;
	}

	private static String firstNonBlank(String... values) {
		for (String value : values) {
			if (value != null && !value.isBlank()) {
				return value;
			}
		}
		return "";
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

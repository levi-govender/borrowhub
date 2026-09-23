package com.borrowhub.backend.audit;

import com.borrowhub.backend.common.ApiException;
import com.borrowhub.backend.common.PageResponse;
import com.borrowhub.backend.identity.IdentityService;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/admin/audit")
public class AdminAuditController {

	private final IdentityService identityService;
	private final AuditEventRepository auditEventRepository;

	public AdminAuditController(IdentityService identityService, AuditEventRepository auditEventRepository) {
		this.identityService = identityService;
		this.auditEventRepository = auditEventRepository;
	}

	@GetMapping
	@Transactional(readOnly = true)
	public PageResponse<AuditItem> list(
			@RequestHeader(value = "X-Demo-Tenant-Id", required = false) String tenantId,
			@RequestHeader(value = "X-Demo-Object-Id", required = false) String objectId,
			@RequestParam(required = false) Integer page,
			@RequestParam(required = false) Integer pageSize) {
		identityService.requireAdmin(tenantId, objectId);
		int resolvedPage = page == null ? 1 : page;
		int resolvedSize = pageSize == null ? 20 : pageSize;
		if (resolvedPage < 1) {
			throw ApiException.badRequest("VALIDATION_ERROR", "page must be 1 or greater.");
		}
		if (resolvedSize < 1 || resolvedSize > 100) {
			throw ApiException.badRequest("VALIDATION_ERROR", "pageSize must be between 1 and 100.");
		}
		var result = auditEventRepository.findAllByOrderByOccurredAtDesc(
				PageRequest.of(resolvedPage - 1, resolvedSize));
		return new PageResponse<>(
				result.getContent().stream().map(AdminAuditController::toItem).toList(),
				resolvedPage,
				resolvedSize,
				result.getTotalElements());
	}

	private static AuditItem toItem(AuditEvent event) {
		return new AuditItem(
				event.getId(),
				event.getOccurredAt(),
				event.getAction(),
				event.getActor() == null ? "" : event.getActor().getDisplayName(),
				event.getEntityType(),
				event.getEntityId(),
				event.getCorrelationId() == null ? "" : event.getCorrelationId(),
				event.getChangeSummary());
	}

	public record AuditItem(
			UUID id,
			Instant occurredAt,
			String action,
			String actor,
			String entityType,
			UUID entityId,
			String correlationId,
			Map<String, Object> changeSummary) {
	}
}

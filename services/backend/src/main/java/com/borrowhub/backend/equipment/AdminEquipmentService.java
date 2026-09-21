package com.borrowhub.backend.equipment;

import com.borrowhub.backend.common.ApiException;
import com.borrowhub.backend.common.BookingPolicyProperties;
import com.borrowhub.backend.common.CorrelationIdFilter;
import com.borrowhub.backend.common.PageResponse;
import com.borrowhub.backend.identity.IdentityService;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminEquipmentService {

	private final IdentityService identityService;
	private final EquipmentRepository equipmentRepository;
	private final BookingPolicyProperties policy;
	private final Clock clock;
	private final com.borrowhub.backend.audit.AuditEventRepository auditEventRepository;

	public AdminEquipmentService(
			IdentityService identityService,
			EquipmentRepository equipmentRepository,
			BookingPolicyProperties policy,
			Clock clock,
			com.borrowhub.backend.audit.AuditEventRepository auditEventRepository) {
		this.identityService = identityService;
		this.equipmentRepository = equipmentRepository;
		this.policy = policy;
		this.clock = clock;
		this.auditEventRepository = auditEventRepository;
	}

	@Transactional(readOnly = true)
	public PageResponse<EquipmentResponses.ListItem> list(
			String tenantId, String objectId, String query, String category, Integer page, Integer pageSize) {
		identityService.requireAdmin(tenantId, objectId);
		int resolvedPage = page == null ? EquipmentService.DEFAULT_PAGE : page;
		int resolvedSize = pageSize == null ? EquipmentService.DEFAULT_PAGE_SIZE : pageSize;
		if (resolvedPage < 1) {
			throw ApiException.badRequest("VALIDATION_ERROR", "page must be 1 or greater.");
		}
		if (resolvedSize < 1 || resolvedSize > EquipmentService.MAX_PAGE_SIZE) {
			throw ApiException.badRequest("VALIDATION_ERROR", "pageSize must be between 1 and 100.");
		}
		PageRequest pageable = PageRequest.of(
				resolvedPage - 1,
				resolvedSize,
				Sort.by("name").ascending().and(Sort.by("id").ascending()));
		Page<Equipment> result =
				equipmentRepository.findAll(EquipmentSpecifications.adminCatalogue(query, category), pageable);
		return new PageResponse<>(
				result.getContent().stream().map(EquipmentResponses::toListItem).toList(),
				resolvedPage,
				resolvedSize,
				result.getTotalElements());
	}

	@Transactional(readOnly = true)
	public EquipmentResponses.Detail get(String tenantId, String objectId, UUID id) {
		identityService.requireAdmin(tenantId, objectId);
		Equipment equipment = equipmentRepository
				.findById(id)
				.orElseThrow(() -> ApiException.notFound("Equipment was not found."));
		return EquipmentResponses.toDetail(equipment, policy);
	}

	@Transactional
	public EquipmentResponses.Detail create(String tenantId, String objectId, AdminEquipmentRequest request) {
		var actor = identityService.requireAdmin(tenantId, objectId);
		equipmentRepository
				.findByAssetTag(request.assetTag().trim())
				.ifPresent(existing -> {
					throw ApiException.conflict("ASSET_TAG_TAKEN", "That asset tag is already in use.");
				});
		Instant now = Instant.now(clock);
		Equipment equipment = equipmentRepository.save(new Equipment(
				UUID.randomUUID(),
				request.assetTag().trim(),
				request.name().trim(),
				request.category().trim(),
				request.description(),
				request.location().trim(),
				request.operationalStatus(),
				now));
		audit(actor, equipment, "EQUIPMENT_CREATED", now);
		return EquipmentResponses.toDetail(equipment, policy);
	}

	@Transactional
	public EquipmentResponses.Detail update(String tenantId, String objectId, UUID id, AdminEquipmentRequest request) {
		var actor = identityService.requireAdmin(tenantId, objectId);
		Equipment equipment = equipmentRepository
				.lockById(id)
				.orElseThrow(() -> ApiException.notFound("Equipment was not found."));
		equipmentRepository
				.findByAssetTag(request.assetTag().trim())
				.filter(existing -> !existing.getId().equals(id))
				.ifPresent(existing -> {
					throw ApiException.conflict("ASSET_TAG_TAKEN", "That asset tag is already in use.");
				});
		Instant now = Instant.now(clock);
		equipment.apply(
				request.assetTag().trim(),
				request.name().trim(),
				request.category().trim(),
				request.description(),
				request.location().trim(),
				request.operationalStatus(),
				now);
		audit(actor, equipment, "EQUIPMENT_UPDATED", now);
		return EquipmentResponses.toDetail(equipment, policy);
	}

	private void audit(
			com.borrowhub.backend.identity.AppUser actor, Equipment equipment, String action, Instant now) {
		Map<String, Object> summary = new LinkedHashMap<>();
		summary.put("assetTag", equipment.getAssetTag());
		summary.put("operationalStatus", equipment.getOperationalStatus().name());
		String traceId = MDC.get(CorrelationIdFilter.MDC_KEY);
		auditEventRepository.save(new com.borrowhub.backend.audit.AuditEvent(
				UUID.randomUUID(),
				actor,
				"equipment",
				equipment.getId(),
				action,
				now,
				traceId == null ? "" : traceId,
				summary));
	}
}

package com.borrowhub.backend.identity;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/me")
public class MeController {

	private final IdentityService identityService;

	public MeController(IdentityService identityService) {
		this.identityService = identityService;
	}

	@GetMapping
	public MeResponse me(
			@RequestHeader(value = "X-Demo-Tenant-Id", required = false) String tenantId,
			@RequestHeader(value = "X-Demo-Object-Id", required = false) String objectId) {
		return MeResponse.from(identityService.requireUser(tenantId, objectId));
	}
}

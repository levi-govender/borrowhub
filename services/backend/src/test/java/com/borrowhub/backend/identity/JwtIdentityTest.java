package com.borrowhub.backend.identity;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.borrowhub.backend.PostgresIntegrationTest;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@Import(JwtIdentityTest.MockJwtDecoderConfig.class)
@TestPropertySource(properties = "borrowhub.demo-identity.enabled=false")
@DirtiesContext
class JwtIdentityTest extends PostgresIntegrationTest {

	@Autowired
	MockMvc mockMvc;

	@Test
	void rejectsAnonymousAccessWhenDemoIdentityIsOff() throws Exception {
		mockMvc.perform(get("/v1/me"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
		mockMvc.perform(get("/v1/equipment")).andExpect(status().isUnauthorized());
	}

	@Test
	void mapsEntraClaimsToMeAndEnforcesAdminRole() throws Exception {
		mockMvc.perform(get("/v1/me")
						.with(jwt().jwt(token -> token
								.claim("oid", "entra-employee")
								.claim("tid", "tenant-a")
								.claim("name", "Employee A")
								.claim("preferred_username", "a@contoso.test")
								.claim("roles", List.of("Employee")))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.objectId").value("entra-employee"))
				.andExpect(jsonPath("$.tenantId").value("tenant-a"))
				.andExpect(jsonPath("$.displayName").value("Employee A"))
				.andExpect(jsonPath("$.email").value("a@contoso.test"))
				.andExpect(jsonPath("$.role").value("EMPLOYEE"));

		mockMvc.perform(get("/v1/admin/summary")
						.with(jwt().jwt(token -> token
								.claim("oid", "entra-employee")
								.claim("tid", "tenant-a")
								.claim("roles", List.of("Employee")))))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("FORBIDDEN"));

		mockMvc.perform(get("/v1/admin/summary")
						.with(jwt().jwt(token -> token
								.claim("oid", "entra-admin")
								.claim("tid", "tenant-a")
								.claim("name", "Ada Admin")
								.claim("preferred_username", "ada@contoso.test")
								.claim("roles", List.of("Admin")))))
				.andExpect(status().isOk());
	}

	@TestConfiguration
	static class MockJwtDecoderConfig {

		@Bean
		JwtDecoder jwtDecoder() {
			return token -> Jwt.withTokenValue(token)
					.header("alg", "none")
					.subject("unused")
					.issuedAt(Instant.parse("2026-09-21T10:00:00Z"))
					.expiresAt(Instant.parse("2026-09-21T11:00:00Z"))
					.build();
		}
	}
}

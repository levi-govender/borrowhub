package com.borrowhub.backend.identity;

import com.borrowhub.backend.common.CorrelationIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;

@Configuration
public class SecurityConfiguration {

	@Bean
	SecurityFilterChain apiSecurity(HttpSecurity http, DemoIdentityProperties demoIdentity) throws Exception {
		AuthenticationEntryPoint entryPoint = jsonEntryPoint(HttpServletResponse.SC_UNAUTHORIZED, "UNAUTHORIZED", "Sign-in is required.");
		AccessDeniedHandler denied = jsonDenied();
		http.csrf(csrf -> csrf.disable());
		http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
		http.authorizeHttpRequests(auth -> {
			auth.requestMatchers("/actuator/health", "/actuator/health/**").permitAll();
			if (demoIdentity.enabled()) {
				auth.anyRequest().permitAll();
			}
			else {
				auth.anyRequest().authenticated();
			}
		});
		if (!demoIdentity.enabled()) {
			http.oauth2ResourceServer(oauth -> oauth
					.jwt(Customizer.withDefaults())
					.authenticationEntryPoint(entryPoint));
		}
		http.exceptionHandling(handling -> handling.authenticationEntryPoint(entryPoint).accessDeniedHandler(denied));
		return http.build();
	}

	private static AuthenticationEntryPoint jsonEntryPoint(int status, String code, String message) {
		return (HttpServletRequest request, HttpServletResponse response, org.springframework.security.core.AuthenticationException ex) ->
				write(response, status, code, message);
	}

	private static AccessDeniedHandler jsonDenied() {
		return (request, response, ex) ->
				write(response, HttpServletResponse.SC_FORBIDDEN, "FORBIDDEN", "Administrator access is required.");
	}

	private static void write(HttpServletResponse response, int status, String code, String message) throws IOException {
		if (response.isCommitted()) {
			return;
		}
		String traceId = MDC.get(CorrelationIdFilter.MDC_KEY);
		if (traceId == null) {
			traceId = "";
		}
		response.setStatus(status);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.getWriter()
				.write("{\"code\":\""
						+ code
						+ "\",\"message\":\""
						+ message
						+ "\",\"traceId\":\""
						+ traceId
						+ "\",\"fieldErrors\":{}}");
	}
}

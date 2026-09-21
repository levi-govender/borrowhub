package com.borrowhub.backend.identity;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "borrowhub.demo-identity")
public record DemoIdentityProperties(boolean enabled, String defaultTenantId) {
}

package com.borrowhub.backend;

import com.borrowhub.backend.common.BookingPolicyProperties;
import com.borrowhub.backend.identity.DemoIdentityProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({BookingPolicyProperties.class, DemoIdentityProperties.class})
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

}

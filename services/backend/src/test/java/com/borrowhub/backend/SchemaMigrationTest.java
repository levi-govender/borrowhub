package com.borrowhub.backend;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

class SchemaMigrationTest extends PostgresIntegrationTest {

	@Autowired
	JdbcTemplate jdbcTemplate;

	@Test
	void flywayAppliesInitialSchema() {
		Integer version = jdbcTemplate.queryForObject(
				"select version from flyway_schema_history where success = true order by installed_rank desc limit 1",
				Integer.class);
		assertThat(version).isEqualTo(1);

		List<String> tables = jdbcTemplate.queryForList(
				"""
						select table_name
						from information_schema.tables
						where table_schema = 'public'
						  and table_name in ('app_user', 'equipment', 'booking', 'audit_event', 'idempotency_record')
						order by table_name
						""",
				String.class);
		assertThat(tables)
				.containsExactly("app_user", "audit_event", "booking", "equipment", "idempotency_record");
	}

	@Test
	void checkedOutPartialUniqueIndexExists() {
		Integer count = jdbcTemplate.queryForObject(
				"""
						select count(*)
						from pg_indexes
						where schemaname = 'public'
						  and indexname = 'booking_one_checked_out_per_equipment'
						""",
				Integer.class);
		assertThat(count).isEqualTo(1);
	}
}

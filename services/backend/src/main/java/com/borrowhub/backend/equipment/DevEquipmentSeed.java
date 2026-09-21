package com.borrowhub.backend.equipment;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("dev")
public class DevEquipmentSeed implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(DevEquipmentSeed.class);

	private final EquipmentRepository equipmentRepository;

	public DevEquipmentSeed(EquipmentRepository equipmentRepository) {
		this.equipmentRepository = equipmentRepository;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (equipmentRepository.count() > 0) {
			return;
		}
		Instant now = Instant.now();
		List<Equipment> assets = List.of(
				asset("PHONE-001", "Pixel test phone", "phone", "QA cupboard", now),
				asset("PHONE-002", "iPhone test phone", "phone", "QA cupboard", now),
				asset("PHONE-003", "Samsung test phone", "phone", "QA cupboard", now),
				asset("MONITOR-001", "27-inch office monitor", "monitor", "Dock 4", now),
				asset("MONITOR-002", "Portable USB-C monitor", "monitor", "Dock 4", now),
				asset("ADAPTER-001", "USB-C hub", "adapter", "Reception drawer", now),
				asset("ADAPTER-002", "HDMI adapter", "adapter", "Reception drawer", now),
				asset("ADAPTER-003", "Lightning charge cable", "adapter", "Reception drawer", now),
				asset("CAMERA-001", "Meeting room camera", "camera", "Studio shelf", now),
				asset("CAMERA-002", "Document camera", "camera", "Studio shelf", now));
		equipmentRepository.saveAll(assets);
		log.info("Seeded {} development equipment rows", assets.size());
	}

	private static Equipment asset(String tag, String name, String category, String location, Instant now) {
		return new Equipment(
				UUID.randomUUID(),
				tag,
				name,
				category,
				"Demo asset for local BorrowHub development.",
				location,
				OperationalStatus.ACTIVE,
				now);
	}
}

ALTER TABLE `Vehicle` ADD COLUMN `photoStorageKey` VARCHAR(64) NULL;
ALTER TABLE `Vehicle` ADD COLUMN `colorEn` VARCHAR(64) NULL, ADD COLUMN `descriptionEn` TEXT NULL;
ALTER TABLE `Driver` ADD COLUMN `descriptionEn` TEXT NULL;
CREATE UNIQUE INDEX `Vehicle_photoStorageKey_key` ON `Vehicle` (`photoStorageKey`);
ALTER TABLE `Driver` ADD COLUMN `customServicesEnabled` BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE `ProfileService` (
  `id` VARCHAR(191) NOT NULL,
  `driverId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `nameEn` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `descriptionEn` TEXT NULL,
  `photoStorageKey` VARCHAR(64) NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ProfileService_photoStorageKey_key` (`photoStorageKey`),
  INDEX `ProfileService_driverId_active_idx` (`driverId`, `active`),
  CONSTRAINT `ProfileService_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

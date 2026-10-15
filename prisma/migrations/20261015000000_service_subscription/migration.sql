ALTER TABLE `Driver`
  ADD COLUMN `serviceStartsAt` DATETIME(3) NULL,
  ADD COLUMN `serviceExpiresAt` DATETIME(3) NULL,
  ADD COLUMN `serviceRequiresAssignment` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `Driver` ALTER COLUMN `serviceRequiresAssignment` SET DEFAULT false;

CREATE TABLE `ServicePeriod` (
  `id` VARCHAR(36) NOT NULL,
  `driverId` VARCHAR(191) NOT NULL,
  `adminId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(16) NOT NULL,
  `reference` VARCHAR(191) NOT NULL,
  `previousExpiresAt` DATETIME(3) NULL,
  `startsAt` DATETIME(3) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ServicePeriod_driverId_createdAt_idx` (`driverId`, `createdAt`),
  CONSTRAINT `ServicePeriod_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CardRegistryLock` (`id` INTEGER NOT NULL, PRIMARY KEY (`id`)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
INSERT INTO `CardRegistryLock` (`id`) VALUES (1);
CREATE TABLE `PhysicalCard` (
  `slug` VARCHAR(191) NOT NULL, `kind` VARCHAR(16) NOT NULL,
  `driverId` VARCHAR(191) NULL, `releaseUpgradeId` VARCHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`slug`), INDEX `PhysicalCard_driverId_idx` (`driverId`),
  CONSTRAINT `PhysicalCard_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `CardUpgrade` (
  `id` VARCHAR(36) NOT NULL, `driverId` VARCHAR(191) NOT NULL,
  `normalSlug` VARCHAR(191) NOT NULL, `premiumSlug` VARCHAR(191) NOT NULL,
  `reference` VARCHAR(191) NOT NULL, `status` VARCHAR(16) NOT NULL,
  `createdBy` VARCHAR(191) NOT NULL, `completedBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `completedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `CardUpgrade_premiumSlug_key` (`premiumSlug`),
  INDEX `CardUpgrade_driverId_status_idx` (`driverId`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `CardEvent` (
  `id` VARCHAR(36) NOT NULL, `cardSlug` VARCHAR(191) NOT NULL, `action` VARCHAR(16) NOT NULL,
  `fromDriverId` VARCHAR(191) NULL, `toDriverId` VARCHAR(191) NULL,
  `adminId` VARCHAR(191) NOT NULL, `reference` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`), INDEX `CardEvent_cardSlug_createdAt_idx` (`cardSlug`, `createdAt`),
  INDEX `CardEvent_toDriverId_createdAt_idx` (`toDriverId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

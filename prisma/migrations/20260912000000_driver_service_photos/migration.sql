CREATE TABLE `DriverServicePhoto` (
    `id` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(64) NOT NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `DriverServicePhoto_storageKey_key`(`storageKey`),
    UNIQUE INDEX `DriverServicePhoto_driverId_serviceId_key`(`driverId`, `serviceId`),
    INDEX `DriverServicePhoto_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `DriverServicePhoto` ADD CONSTRAINT `DriverServicePhoto_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `DriverServicePhoto` ADD CONSTRAINT `DriverServicePhoto_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

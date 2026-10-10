ALTER TABLE `Driver` ADD COLUMN `qrSlug` VARCHAR(191) NULL;

CREATE TABLE `DriverAddress` (
    `slug` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    INDEX `DriverAddress_driverId_idx` (`driverId`),
    PRIMARY KEY (`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `DriverAddress` ADD CONSTRAINT `DriverAddress_driverId_fkey`
    FOREIGN KEY (`driverId`) REFERENCES `Driver` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Conserva exactamente los destinos de los QR y tarjetas ya emitidos.
UPDATE `Driver` SET `qrSlug` = `slug`;
INSERT INTO `DriverAddress` (`slug`, `driverId`) SELECT `slug`, `id` FROM `Driver`;

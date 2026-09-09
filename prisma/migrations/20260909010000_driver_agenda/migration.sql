-- AlterTable
ALTER TABLE `DriverUser` ADD COLUMN `calendarEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `calendarVersion` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `DriverSession` (
    `tokenHash` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DriverSession_userId_idx`(`userId`),
    INDEX `DriverSession_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`tokenHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `serviceName` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(32) NOT NULL,
    `email` VARCHAR(191) NULL,
    `pickup` VARCHAR(250) NOT NULL,
    `destination` VARCHAR(250) NOT NULL,
    `notes` TEXT NULL,
    `passengers` INTEGER NOT NULL DEFAULT 1,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `source` VARCHAR(16) NOT NULL DEFAULT 'REQUEST',
    `version` INTEGER NOT NULL DEFAULT 0,
    `wasConfirmed` BOOLEAN NOT NULL DEFAULT false,
    `passengerVersion` INTEGER NOT NULL DEFAULT 0,
    `requestHash` VARCHAR(64) NULL,
    `payloadHash` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Booking_requestHash_key`(`requestHash`),
    INDEX `Booking_driverId_startsAt_idx`(`driverId`, `startsAt`),
    INDEX `Booking_driverId_status_startsAt_idx`(`driverId`, `status`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequestLimit` (
    `key` VARCHAR(128) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `RequestLimit_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DriverSession` ADD CONSTRAINT `DriverSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `DriverUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

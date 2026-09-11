-- AlterTable
ALTER TABLE `DriverUser` ADD COLUMN `accessVersion` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `CalendarConnection` (
    `id` VARCHAR(191) NOT NULL,
    `ownerKey` VARCHAR(191) NOT NULL,
    `ownerVersion` INTEGER NOT NULL,
    `provider` ENUM('GOOGLE', 'MICROSOFT') NOT NULL,
    `accountHash` VARCHAR(64) NOT NULL,
    `accountLabel` VARCHAR(191) NOT NULL,
    `driverUserId` VARCHAR(191) NULL,
    `bookingId` VARCHAR(191) NULL,
    `refreshToken` TEXT NULL,
    `status` ENUM('ACTIVE', 'REAUTH', 'DISCONNECTED') NOT NULL DEFAULT 'ACTIVE',
    `credentialsVersion` INTEGER NOT NULL DEFAULT 0,
    `syncVersion` INTEGER NOT NULL DEFAULT 0,
    `nextSyncAt` DATETIME(3) NULL,
    `lastSyncAt` DATETIME(3) NULL,
    `lastError` VARCHAR(32) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `leaseToken` VARCHAR(64) NULL,
    `leaseUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CalendarConnection_status_nextSyncAt_idx`(`status`, `nextSyncAt`),
    INDEX `CalendarConnection_driverUserId_idx`(`driverUserId`),
    INDEX `CalendarConnection_bookingId_idx`(`bookingId`),
    UNIQUE INDEX `CalendarConnection_ownerKey_provider_accountHash_key`(`ownerKey`, `provider`, `accountHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalendarOAuthState` (
    `stateHash` VARCHAR(64) NOT NULL,
    `browserHash` VARCHAR(64) NOT NULL,
    `ownerKey` VARCHAR(191) NOT NULL,
    `ownerVersion` INTEGER NOT NULL,
    `driverUserId` VARCHAR(191) NULL,
    `bookingId` VARCHAR(191) NULL,
    `provider` ENUM('GOOGLE', 'MICROSOFT') NOT NULL,
    `verifier` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `CalendarOAuthState_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`stateHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalendarEvent` (
    `id` VARCHAR(191) NOT NULL,
    `connectionId` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `operationId` VARCHAR(64) NOT NULL,
    `externalId` VARCHAR(1024) NULL,
    `syncedVersion` INTEGER NOT NULL DEFAULT -1,
    `removed` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `CalendarEvent_operationId_key`(`operationId`),
    INDEX `CalendarEvent_bookingId_idx`(`bookingId`),
    UNIQUE INDEX `CalendarEvent_connectionId_bookingId_key`(`connectionId`, `bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DriverPhoto` (
    `id` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(64) NOT NULL,
    `category` ENUM('TRIP', 'VEHICLE') NOT NULL,
    `caption` VARCHAR(160) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DriverPhoto_storageKey_key`(`storageKey`),
    INDEX `DriverPhoto_driverId_position_idx`(`driverId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CalendarConnection` ADD CONSTRAINT `CalendarConnection_driverUserId_fkey` FOREIGN KEY (`driverUserId`) REFERENCES `DriverUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarConnection` ADD CONSTRAINT `CalendarConnection_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarEvent` ADD CONSTRAINT `CalendarEvent_connectionId_fkey` FOREIGN KEY (`connectionId`) REFERENCES `CalendarConnection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarEvent` ADD CONSTRAINT `CalendarEvent_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DriverPhoto` ADD CONSTRAINT `DriverPhoto_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

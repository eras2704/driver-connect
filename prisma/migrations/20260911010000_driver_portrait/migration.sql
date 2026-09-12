ALTER TABLE `Driver`
    ADD COLUMN `portraitStorageKey` VARCHAR(64) NULL;

CREATE UNIQUE INDEX `Driver_portraitStorageKey_key` ON `Driver`(`portraitStorageKey`);

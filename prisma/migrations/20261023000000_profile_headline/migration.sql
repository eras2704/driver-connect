-- Optional fields preserve all existing profiles and permanent QR/NFC addresses.
ALTER TABLE `Driver`
  ADD COLUMN `headline` VARCHAR(120) NULL,
  ADD COLUMN `headlineEn` VARCHAR(120) NULL;

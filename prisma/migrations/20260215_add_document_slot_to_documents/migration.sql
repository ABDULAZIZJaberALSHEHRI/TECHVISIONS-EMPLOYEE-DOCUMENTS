-- Add documentSlotId to documents table
ALTER TABLE `documents` ADD COLUMN `document_slot_id` VARCHAR(191);

-- Add index for documentSlotId
ALTER TABLE `documents` ADD INDEX `documents_document_slot_id_idx`(`document_slot_id`);

-- Add foreign key constraint
ALTER TABLE `documents` ADD CONSTRAINT `documents_document_slot_id_fkey`
  FOREIGN KEY (`document_slot_id`) REFERENCES `document_slots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

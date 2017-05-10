ALTER TABLE inspections ADD certificated TINYINT(1) NOT NULL DEFAULT 0 AFTER barrel_code;
UPDATE inspections SET certificated = 1;
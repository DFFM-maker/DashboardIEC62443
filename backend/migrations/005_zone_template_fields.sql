-- Migration 005: zone template fields for IEC 62443 guided zones
ALTER TABLE zones ADD COLUMN excluded_from_assessment INTEGER DEFAULT 0;
ALTER TABLE zones ADD COLUMN excluded_from_report INTEGER DEFAULT 0;
ALTER TABLE zones ADD COLUMN inventory_only INTEGER DEFAULT 0;
ALTER TABLE zones ADD COLUMN zone_template TEXT DEFAULT NULL;

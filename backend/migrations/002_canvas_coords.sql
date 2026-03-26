-- Migration 002: Coordinate canvas per zones e campi tipo/label per conduits
-- Necessario per React Flow (Step 3 wizard: Zone & Condotti Canvas)

ALTER TABLE zones ADD COLUMN x REAL DEFAULT 0;
ALTER TABLE zones ADD COLUMN y REAL DEFAULT 0;
ALTER TABLE zones ADD COLUMN width REAL DEFAULT 200;
ALTER TABLE zones ADD COLUMN height REAL DEFAULT 150;

ALTER TABLE conduits ADD COLUMN type TEXT DEFAULT 'wired';
ALTER TABLE conduits ADD COLUMN label TEXT;
ALTER TABLE conduits ADD COLUMN encryption TEXT DEFAULT 'none';

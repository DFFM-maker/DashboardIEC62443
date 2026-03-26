-- Migration 004: add assumptions field to assessments (Step 2 wizard)
ALTER TABLE assessments ADD COLUMN assumptions TEXT;

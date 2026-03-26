-- Migration 001: Campi wizard IEC 62443 su assessments
-- Aggiunge i campi per la definizione del SUC (System Under Consideration)

ALTER TABLE assessments ADD COLUMN suc_name TEXT;
ALTER TABLE assessments ADD COLUMN suc_function TEXT;
ALTER TABLE assessments ADD COLUMN machine_operation TEXT;
ALTER TABLE assessments ADD COLUMN data_sharing TEXT;
ALTER TABLE assessments ADD COLUMN access_points TEXT;
ALTER TABLE assessments ADD COLUMN physical_boundary TEXT;

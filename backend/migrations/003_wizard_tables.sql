-- Migration 003: Nuove tabelle per il wizard IEC 62443

-- ================================================================
-- SCENARI DI RISCHIO (Step 2 Wizard)
-- ================================================================
CREATE TABLE IF NOT EXISTS risk_events (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  consequence TEXT,
  dangerous_situation TEXT,
  dangerous_activity TEXT,
  risk_description TEXT,
  consequence_text TEXT,
  type TEXT DEFAULT 'immediate',
  likelihood INTEGER DEFAULT 1,
  safety_impact INTEGER DEFAULT 1,
  operational_impact INTEGER DEFAULT 1,
  financial_impact INTEGER DEFAULT 1,
  reputational_impact INTEGER DEFAULT 1,
  calculated_risk INTEGER,
  calculated_risk_label TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- ================================================================
-- CONTROLLI IEC 62443-3-3 (database normativo — seed statico)
-- ================================================================
CREATE TABLE IF NOT EXISTS iec_controls (
  id TEXT PRIMARY KEY,
  sr_code TEXT NOT NULL,
  re_code TEXT,
  title TEXT NOT NULL,
  sl1 INTEGER DEFAULT 0,
  sl2 INTEGER DEFAULT 0,
  sl3 INTEGER DEFAULT 0,
  sl4 INTEGER DEFAULT 0,
  category TEXT,
  description TEXT
);

-- ================================================================
-- STATO CONTROLLI PER ZONA (Step 5 Gap Analysis)
-- ================================================================
CREATE TABLE IF NOT EXISTS zone_controls (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  control_id TEXT NOT NULL,
  applicable INTEGER DEFAULT 1,
  present INTEGER DEFAULT 0,
  sl_achieved INTEGER DEFAULT 0,
  implements INTEGER DEFAULT 0,
  sl_target INTEGER DEFAULT 0,
  policy_text TEXT,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
  FOREIGN KEY (control_id) REFERENCES iec_controls(id)
);

-- ================================================================
-- POLICY DI SICUREZZA (Step 6 Policy Generation)
-- ================================================================
CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  zone_id TEXT,
  control_id TEXT,
  parameters_json TEXT,
  policy_markdown TEXT,
  final INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (control_id) REFERENCES iec_controls(id)
);

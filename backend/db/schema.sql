-- ================================================================
-- ANAGRAFICA CLIENTI / IMPIANTI
-- ================================================================
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'IT',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- ASSESSMENT
-- ================================================================
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  name TEXT NOT NULL,
  subnet TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  assessor TEXT,
  iec62443_target_sl TEXT DEFAULT 'SL-2',
  notes TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- ================================================================
-- ASSET
-- ================================================================
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  ip TEXT NOT NULL,
  mac TEXT,
  vendor TEXT,
  device_type TEXT,
  device_model TEXT,
  firmware_version TEXT,
  serial_number TEXT,
  security_zone TEXT,
  criticality TEXT DEFAULT 'medium',
  notes TEXT,
  classified_by TEXT DEFAULT 'auto',
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- ================================================================
-- PORTE APERTE
-- ================================================================
CREATE TABLE IF NOT EXISTS open_ports (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  port INTEGER,
  protocol TEXT DEFAULT 'tcp',
  service TEXT,
  version TEXT,
  state TEXT DEFAULT 'open',
  is_required INTEGER DEFAULT 1,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- ================================================================
-- FINDING DI SICUREZZA
-- ================================================================
CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  asset_id TEXT,
  finding_code TEXT,
  title TEXT,
  description TEXT,
  cvss_score REAL,
  cvss_vector TEXT,
  severity TEXT,
  iec62443_sr TEXT,
  iec62443_part TEXT DEFAULT '3-3',
  evidence TEXT,
  remediation TEXT,
  remediation_priority TEXT,
  status TEXT DEFAULT 'open',
  cve_ids TEXT,
  advisory_urls TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- ================================================================
-- ZONE DI SICUREZZA
-- ================================================================
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  name TEXT,
  security_level TEXT DEFAULT 'SL-1',
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS zone_assets (
  zone_id TEXT,
  asset_id TEXT,
  PRIMARY KEY (zone_id, asset_id),
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- ================================================================
-- CONDUIT TRA ZONE
-- ================================================================
CREATE TABLE IF NOT EXISTS conduits (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  name TEXT,
  zone_from_id TEXT,
  zone_to_id TEXT,
  protocols TEXT,
  direction TEXT DEFAULT 'bidirectional',
  notes TEXT,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- ================================================================
-- TEMPLATE ZONE PER TIPO IMPIANTO
-- ================================================================
CREATE TABLE IF NOT EXISTS zone_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_builtin INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS zone_template_zones (
  id TEXT PRIMARY KEY,
  template_id TEXT,
  zone_name TEXT,
  security_level TEXT,
  description TEXT,
  color TEXT,
  vendor_hints TEXT,
  port_hints TEXT,
  FOREIGN KEY (template_id) REFERENCES zone_templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS zone_template_conduits (
  id TEXT PRIMARY KEY,
  template_id TEXT,
  from_zone_name TEXT,
  to_zone_name TEXT,
  protocols TEXT,
  direction TEXT,
  FOREIGN KEY (template_id) REFERENCES zone_templates(id) ON DELETE CASCADE
);

-- ================================================================
-- ADVISORY / CVE CACHE
-- ================================================================
CREATE TABLE IF NOT EXISTS advisories (
  id TEXT PRIMARY KEY,
  source TEXT,
  vendor TEXT,
  title TEXT,
  description TEXT,
  cvss_score REAL,
  cve_ids TEXT,
  affected_products TEXT,
  url TEXT,
  published_at DATETIME,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- LOG SCANSIONI
-- ================================================================
CREATE TABLE IF NOT EXISTS scan_logs (
  id TEXT PRIMARY KEY,
  assessment_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  level TEXT DEFAULT 'info',
  message TEXT,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- ================================================================
-- EXPORT JOBS
-- ================================================================
CREATE TABLE IF NOT EXISTS export_jobs (
  id TEXT PRIMARY KEY,
  assessment_id TEXT,
  format TEXT,
  status TEXT DEFAULT 'pending',
  file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id)
);

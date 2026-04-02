/**
 * IEC 62443-3-3 guided zone templates.
 * BASELINE_SR: 15 SR codes that form the minimum assessment baseline.
 * ZONE_TEMPLATES: Refactored to DMZ-based architecture (IT, DMZ, OT).
 */

const BASELINE_SR = [
  'SR 1.2', 'SR 1.3', 'SR 1.7', 'SR 2.1', 'SR 2.8',
  'SR 3.2', 'SR 3.4', 'SR 4.1', 'SR 4.3', 'SR 5.1',
  'SR 5.2', 'SR 6.2', 'SR 7.1', 'SR 7.3', 'SR 7.8'
]

const ZONE_TEMPLATES = {
  'it-external': {
    name: 'Rete IT Aziendale',
    color: '#6b7280',
    security_level: 'SL-0',
    excluded_from_assessment: true,
    excluded_from_report: true,
    inventory_only: true,
    x: 100,
    y: 200,
    defaultSR: []
  },
  'transit': {
    name: 'DMZ Secomea / Gateway',
    color: '#f59e0b',
    security_level: 'SL-1',
    excluded_from_assessment: false,
    excluded_from_report: false,
    inventory_only: false,
    x: 450,
    y: 200,
    defaultSR: ['SR 1.3', 'SR 4.3', 'SR 5.1', 'SR 7.8']
  },
  'ot-cell': {
    name: 'Rete Piatta Macchina (TCO2357)',
    color: '#22c55e',
    security_level: 'SL-2',
    excluded_from_assessment: false,
    excluded_from_report: false,
    inventory_only: false,
    x: 800,
    y: 200,
    defaultSR: ['SR 1.2', 'SR 3.2', 'SR 3.4', 'SR 4.1', 
                'SR 5.1', 'SR 5.2', 'SR 7.1', 'SR 7.3', 'SR 7.8']
  }
}

module.exports = { ZONE_TEMPLATES, BASELINE_SR }

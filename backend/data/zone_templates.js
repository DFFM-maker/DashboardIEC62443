/**
 * IEC 62443-3-3 guided zone templates.
 * BASELINE_SR: 15 SR codes that form the minimum assessment baseline.
 * ZONE_TEMPLATES: pre-defined zones with default SR sets and canvas positions.
 */

const BASELINE_SR = [
  'SR 1.2', 'SR 1.3', 'SR 1.7', 'SR 2.1', 'SR 2.8',
  'SR 3.2', 'SR 3.4', 'SR 4.1', 'SR 4.3', 'SR 5.1',
  'SR 5.2', 'SR 6.2', 'SR 7.1', 'SR 7.3', 'SR 7.8'
]

const ZONE_TEMPLATES = {
  'PLC-Zone': {
    name: 'PLC-Zone',
    color: '#ef4444',
    security_level: 'SL-2',
    excluded_from_assessment: false,
    excluded_from_report: false,
    inventory_only: false,
    x: 100,
    y: 100,
    defaultSR: ['SR 1.2', 'SR 3.2', 'SR 3.4', 'SR 4.1',
                'SR 5.1', 'SR 5.2', 'SR 7.1', 'SR 7.3', 'SR 7.8']
  },
  'HMI-Zone': {
    name: 'HMI-Zone',
    color: '#f97316',
    security_level: 'SL-2',
    excluded_from_assessment: false,
    excluded_from_report: false,
    inventory_only: false,
    x: 400,
    y: 100,
    defaultSR: ['SR 1.2', 'SR 1.3', 'SR 1.7', 'SR 2.1', 'SR 2.8',
                'SR 3.2', 'SR 4.1', 'SR 5.1', 'SR 5.2',
                'SR 6.2', 'SR 7.8']
  },
  'Router-Zone': {
    name: 'Router-Zone',
    color: '#8b5cf6',
    security_level: 'SL-2',
    excluded_from_assessment: false,
    excluded_from_report: false,
    inventory_only: false,
    x: 700,
    y: 100,
    defaultSR: ['SR 1.3', 'SR 1.7', 'SR 2.8', 'SR 4.3',
                'SR 5.1', 'SR 5.2', 'SR 6.2', 'SR 7.1', 'SR 7.8']
  },
  'Driver-Zone': {
    name: 'Driver-Zone',
    color: '#06b6d4',
    security_level: 'SL-1',
    excluded_from_assessment: false,
    excluded_from_report: false,
    inventory_only: false,
    x: 100,
    y: 350,
    defaultSR: ['SR 1.2', 'SR 2.1', 'SR 3.2', 'SR 3.4',
                'SR 5.1', 'SR 5.2', 'SR 7.1', 'SR 7.8']
  },
  'Management-Zone': {
    name: 'Management-Zone',
    color: '#6b7280',
    security_level: 'SL-0',
    excluded_from_assessment: true,
    excluded_from_report: true,
    inventory_only: true,
    x: 400,
    y: 350,
    defaultSR: []
  }
}

module.exports = { ZONE_TEMPLATES, BASELINE_SR }

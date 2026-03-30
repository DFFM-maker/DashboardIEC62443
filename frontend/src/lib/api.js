const BASE = '/api'

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Assessments
  getAssessments: () => request('/assessments'),
  getAssessment: id => request(`/assessments/${id}`),
  createAssessment: data => request('/assessments', { method: 'POST', body: JSON.stringify(data) }),
  updateAssessment: (id, data) => request(`/assessments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  patchAssessment: (id, data) => request(`/assessments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAssessment: id => request(`/assessments/${id}`, { method: 'DELETE' }),
  startScan: id => request(`/assessments/${id}/scan`, { method: 'POST' }),
  getAssessmentStats: id => request(`/assessments/${id}/stats`),
  getLogs: id => request(`/assessments/${id}/logs`),
  generateReport: (id, format) => fetch(`${BASE}/assessments/${id}/report/${format}`, { method: 'POST' }),

  // Assets
  getAssets: (assessmentId) => request(`/assets?assessment_id=${assessmentId}`),
  getAsset: id => request(`/assets/${id}`),
  updateAsset: (id, data) => request(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAsset: id => request(`/assets/${id}`, { method: 'DELETE' }),

  // Findings
  getFindings: (assessmentId) => request(`/findings?assessment_id=${assessmentId}`),
  getFinding: id => request(`/findings/${id}`),
  updateFinding: (id, data) => request(`/findings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createFinding: data => request('/findings', { method: 'POST', body: JSON.stringify(data) }),

  // Clients
  getClients: () => request('/clients'),
  getClient: id => request(`/clients/${id}`),
  createClient: data => request('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id, data) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: id => request(`/clients/${id}`, { method: 'DELETE' }),

  // Advisories
  getAdvisories: (params = {}) => {
    const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    const q = new URLSearchParams(filtered).toString()
    return request(`/advisories${q ? '?' + q : ''}`)
  },
  refreshAdvisories: () => request('/advisories/refresh', { method: 'POST' }),
  getAdvisoryStats: () => request('/advisories/stats'),

  // Templates
  getTemplates: () => request('/templates'),
  createTemplate: data => request('/templates', { method: 'POST', body: JSON.stringify(data) }),
  deleteTemplate: id => request(`/templates/${id}`, { method: 'DELETE' }),
  applyTemplate: (templateId, assessmentId) => request(`/templates/${templateId}/apply/${assessmentId}`, { method: 'POST' }),

  // Zones
  getZones: (assessmentId) => request(`/zones?assessment_id=${assessmentId}`),
  createZone: data => request('/zones', { method: 'POST', body: JSON.stringify(data) }),
  updateZone: (id, data) => request(`/zones/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteZone: id => request(`/zones/${id}`, { method: 'DELETE' }),

  // Conduits
  getConduits: (assessmentId) => request(`/conduits?assessment_id=${assessmentId}`),
  createConduit: data => request('/conduits', { method: 'POST', body: JSON.stringify(data) }),
  deleteConduit: id => request(`/conduits/${id}`, { method: 'DELETE' }),

  // Report
  getReport: (assessmentId) => request(`/assessments/${assessmentId}/report`),

  // IEC Controls
  getIecControls: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null))).toString()
    return request(`/iec-controls${q ? '?' + q : ''}`)
  },

  // Zone Controls (gap analysis)
  getZoneControls: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null))).toString()
    return request(`/zone-controls${q ? '?' + q : ''}`)
  },
  upsertZoneControl: (data) => request('/zone-controls', { method: 'POST', body: JSON.stringify(data) }),

  // Risk Events
  getRiskEvents: (assessmentId) => request(`/assessments/${assessmentId}/risk-events`),
  createRiskEvent: (assessmentId, data) => request(`/assessments/${assessmentId}/risk-events`, { method: 'POST', body: JSON.stringify(data) }),
  updateRiskEvent: (assessmentId, eventId, data) => request(`/assessments/${assessmentId}/risk-events/${eventId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRiskEvent: (assessmentId, eventId) => request(`/assessments/${assessmentId}/risk-events/${eventId}`, { method: 'DELETE' }),

  // Policies (AI generation)
  generatePolicy: (assessmentId, data) => request(`/assessments/${assessmentId}/generate-policy`, { method: 'POST', body: JSON.stringify(data) }),
  getPolicies: (assessmentId) => request(`/assessments/${assessmentId}/policies`),
  patchPolicy: (assessmentId, policyId, data) => request(`/assessments/${assessmentId}/policies/${policyId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Wizard Report
  downloadWizardMarkdown: (assessmentId) => fetch(`${BASE}/assessments/${assessmentId}/wizard-report`),
  generateWizardPdf: (assessmentId) => fetch(`${BASE}/assessments/${assessmentId}/wizard-report/pdf`, { method: 'POST' }),

  // Export/Import
  exportAssessment: id => fetch(`${BASE}/export/${id}`, { method: 'POST' }),
  importAssessment: (file, clientId) => {
    const fd = new FormData()
    fd.append('file', file)
    if (clientId) fd.append('client_id', clientId)
    return fetch(`${BASE}/import`, { method: 'POST', body: fd }).then(r => r.json())
  }
}

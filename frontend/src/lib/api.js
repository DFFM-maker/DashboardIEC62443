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
    const q = new URLSearchParams(params).toString()
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

  // Export/Import
  exportAssessment: id => fetch(`${BASE}/export/${id}`, { method: 'POST' }),
  importAssessment: (file, clientId) => {
    const fd = new FormData()
    fd.append('file', file)
    if (clientId) fd.append('client_id', clientId)
    return fetch(`${BASE}/import`, { method: 'POST', body: fd }).then(r => r.json())
  }
}

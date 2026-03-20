import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { AlertTriangle, Search } from 'lucide-react'
import SeverityBadge from '../components/SeverityBadge'

export default function Findings() {
  const [findings, setFindings] = useState([])
  const [assessments, setAssessments] = useState([])
  const [selectedAssessment, setSelectedAssessment] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAssessments()
      .then(a => {
        setAssessments(a)
        if (a.length > 0) {
          setSelectedAssessment(a[0].id)
          return api.getFindings(a[0].id)
        }
        return []
      })
      .then(setFindings)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleAssessmentChange = (id) => {
    setSelectedAssessment(id)
    if (id) api.getFindings(id).then(setFindings).catch(console.error)
    else setFindings([])
  }

  const filtered = findings.filter(f => {
    const text = `${f.title} ${f.description} ${f.asset_ip} ${f.vendor}`.toLowerCase()
    return (
      (!search || text.includes(search.toLowerCase())) &&
      (!severityFilter || f.severity === severityFilter) &&
      (!statusFilter || f.status === statusFilter)
    )
  })

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full" /></div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-yellow-400" /> Security Finding
          </h1>
          <p className="text-gray-400 text-sm mt-1">{filtered.length} finding</p>
        </div>
      </div>

      {/* Severity pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: `Critical (${bySeverity.critical})`, value: 'critical', color: 'bg-red-900/50 text-red-400 border border-red-800' },
          { label: `High (${bySeverity.high})`, value: 'high', color: 'bg-orange-900/50 text-orange-400 border border-orange-800' },
          { label: `Medium (${bySeverity.medium})`, value: 'medium', color: 'bg-yellow-900/50 text-yellow-400 border border-yellow-800' },
          { label: `Low (${bySeverity.low})`, value: 'low', color: 'bg-green-900/50 text-green-400 border border-green-800' },
        ].map(({ label, value, color }) => (
          <button
            key={value}
            onClick={() => setSeverityFilter(severityFilter === value ? '' : value)}
            className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${color} ${severityFilter === value ? 'ring-2 ring-offset-2 ring-offset-gray-950 ring-current' : 'opacity-70'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="input" value={selectedAssessment} onChange={e => handleAssessmentChange(e.target.value)}>
          {assessments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input className="input pl-9 w-full" placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Tutti gli stati</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="in-progress">In Progress</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card text-center py-8"><p className="text-gray-500">Nessun finding trovato</p></div>
        ) : filtered.map((f, i) => {
          let srList = []
          try { srList = JSON.parse(f.iec62443_sr || '[]') } catch (e) {}
          return (
            <div key={f.id} className={`card border-l-4 ${f.severity === 'critical' ? 'border-l-red-500' : f.severity === 'high' ? 'border-l-orange-500' : f.severity === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
              <div className="flex items-start gap-3">
                <SeverityBadge severity={f.severity} />
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{f.title}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                    {f.asset_ip && <span className="font-mono text-gray-400">{f.asset_ip}</span>}
                    {f.cvss_score && <span>CVSS {f.cvss_score}</span>}
                    {srList.length > 0 && <span>{srList.slice(0, 3).join(', ')}</span>}
                    <span className={`${f.remediation_priority === 'Immediate' ? 'text-red-400' : f.remediation_priority === 'Short-term' ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {f.remediation_priority}
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border ${f.status === 'resolved' ? 'border-green-700 text-green-400' : 'border-gray-700 text-gray-500'}`}>
                  {f.status}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Shield, AlertTriangle, Monitor, ClipboardList, TrendingUp, ExternalLink } from 'lucide-react'
import SeverityBadge from '../components/SeverityBadge'

export default function Dashboard() {
  const [assessments, setAssessments] = useState([])
  const [allFindings, setAllFindings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getAssessments()])
      .then(([a]) => {
        setAssessments(a)
        // Load findings for each assessment
        return Promise.all(a.map(ass => api.getFindings(ass.id)))
      })
      .then(findingsArrays => {
        setAllFindings(findingsArrays.flat())
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    assessments: assessments.length,
    assets: assessments.reduce((s, a) => s + (a.asset_count || 0), 0),
    findings: assessments.reduce((s, a) => s + (a.finding_count || 0), 0),
    critical: assessments.reduce((s, a) => s + (a.critical_count || 0), 0),
  }

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of allFindings) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1

  const recentAssessments = assessments.slice(0, 5)
  const topFindings = allFindings.filter(f => f.severity === 'critical' || f.severity === 'high').slice(0, 8)

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-brand-green" />
            OT Security Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">Tecnopack — IEC 62443 Compliance Overview</p>
        </div>
        <Link to="/assessments" className="btn-primary">+ Nuovo Assessment</Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Assessment', value: stats.assessments, icon: ClipboardList, color: 'text-blue-400', bg: 'bg-blue-900/20' },
          { label: 'Asset Trovati', value: stats.assets, icon: Monitor, color: 'text-purple-400', bg: 'bg-purple-900/20' },
          { label: 'Finding Totali', value: stats.findings, icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
          { label: 'Critical', value: stats.critical, icon: Shield, color: 'text-red-400', bg: 'bg-red-900/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-lg ${bg}`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{value}</p>
              <p className="text-sm text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Chart */}
        <div className="card">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-green" />
            Finding per Severità
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Critical', count: bySeverity.critical, color: 'bg-red-500', max: Math.max(...Object.values(bySeverity), 1) },
              { label: 'High',     count: bySeverity.high,     color: 'bg-orange-500', max: Math.max(...Object.values(bySeverity), 1) },
              { label: 'Medium',   count: bySeverity.medium,   color: 'bg-yellow-500', max: Math.max(...Object.values(bySeverity), 1) },
              { label: 'Low',      count: bySeverity.low,      color: 'bg-green-500',  max: Math.max(...Object.values(bySeverity), 1) },
            ].map(({ label, count, color, max }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-16">{label}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${color} transition-all duration-700`}
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-white w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Findings */}
        <div className="card">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Finding Critici/Alti Recenti
          </h2>
          <div className="space-y-2">
            {topFindings.length === 0 ? (
              <p className="text-gray-500 text-sm">Nessun finding critico o alto</p>
            ) : topFindings.map(f => (
              <div key={f.id} className="flex items-start gap-2 py-1.5 border-b border-gray-800 last:border-0">
                <SeverityBadge severity={f.severity} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{f.title}</p>
                  <p className="text-xs text-gray-500">{f.asset_ip || f.ip || '—'} · CVSS {f.cvss_score || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Assessments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Assessment Recenti</h2>
          <Link to="/assessments" className="text-xs text-brand-green hover:underline flex items-center gap-1">
            Tutti <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        {recentAssessments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Nessun assessment. <Link to="/assessments" className="text-brand-green hover:underline">Crea il primo.</Link></p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                  <th className="text-left py-2 pr-4">Nome</th>
                  <th className="text-left py-2 pr-4">Cliente</th>
                  <th className="text-left py-2 pr-4">Subnet</th>
                  <th className="text-center py-2 pr-4">Asset</th>
                  <th className="text-center py-2 pr-4">Finding</th>
                  <th className="text-left py-2 pr-4">Stato</th>
                  <th className="text-left py-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentAssessments.map(a => (
                  <tr key={a.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 pr-4">
                      <Link to={`/assessments/${a.id}`} className="text-brand-green hover:underline font-medium">
                        {a.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-gray-400">{a.client_name || '—'}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-gray-300">{a.subnet}</td>
                    <td className="py-2 pr-4 text-center text-gray-300">{a.asset_count || 0}</td>
                    <td className="py-2 pr-4 text-center">
                      {a.critical_count > 0 ? (
                        <span className="text-red-400 font-bold">{a.finding_count}</span>
                      ) : (
                        <span className="text-gray-300">{a.finding_count || 0}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        a.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                        a.status === 'scanning' ? 'bg-blue-900/50 text-blue-400 animate-pulse' :
                        'bg-gray-800 text-gray-400'
                      }`}>{a.status}</span>
                    </td>
                    <td className="py-2 text-gray-500 text-xs">{new Date(a.created_at).toLocaleDateString('it-IT')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

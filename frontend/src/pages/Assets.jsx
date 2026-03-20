import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Search, Monitor, Cpu, PenLine } from 'lucide-react'

export default function Assets() {
  const [assets, setAssets] = useState([])
  const [assessments, setAssessments] = useState([])
  const [selectedAssessment, setSelectedAssessment] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAssessments()
      .then(a => {
        setAssessments(a)
        if (a.length > 0) {
          setSelectedAssessment(a[0].id)
          return api.getAssets(a[0].id)
        }
        return []
      })
      .then(setAssets)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleAssessmentChange = (id) => {
    setSelectedAssessment(id)
    if (id) api.getAssets(id).then(setAssets).catch(console.error)
    else setAssets([])
  }

  const filtered = assets.filter(a => {
    const text = `${a.ip} ${a.vendor} ${a.device_model} ${a.security_zone} ${a.mac}`.toLowerCase()
    const matchSearch = !search || text.includes(search.toLowerCase())
    const matchType = !typeFilter || a.device_type === typeFilter
    return matchSearch && matchType
  })

  const types = [...new Set(assets.map(a => a.device_type).filter(Boolean))]

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full" /></div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Monitor className="w-6 h-6 text-brand-green" /> Asset Inventory
          </h1>
          <p className="text-gray-400 text-sm mt-1">{filtered.length} asset</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="input" value={selectedAssessment} onChange={e => handleAssessmentChange(e.target.value)}>
          <option value="">— Scegli assessment —</option>
          {assessments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input className="input pl-9 w-full" placeholder="Cerca IP, vendor, modello..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">Tutti i tipi</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
              <th className="text-left py-2 pr-4">IP</th>
              <th className="text-left py-2 pr-4">MAC</th>
              <th className="text-left py-2 pr-4">Vendor</th>
              <th className="text-left py-2 pr-4">Modello</th>
              <th className="text-left py-2 pr-4">Tipo</th>
              <th className="text-left py-2 pr-4">Firmware</th>
              <th className="text-left py-2 pr-4">Zona</th>
              <th className="text-left py-2 pr-4">Criticità</th>
              <th className="text-left py-2 pr-4">Classe</th>
              <th className="text-left py-2">Porte</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="py-8 text-center text-gray-500">Nessun asset trovato</td></tr>
            ) : filtered.map(a => (
              <tr key={a.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 pr-4 font-mono text-brand-green text-xs font-bold">{a.ip}</td>
                <td className="py-2 pr-4 font-mono text-xs text-gray-500">{a.mac || '—'}</td>
                <td className="py-2 pr-4 text-gray-300 text-xs">{a.vendor || '—'}</td>
                <td className="py-2 pr-4 text-gray-400 text-xs">{a.device_model || '—'}</td>
                <td className="py-2 pr-4 text-xs">
                  <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">{a.device_type || '?'}</span>
                </td>
                <td className="py-2 pr-4 text-xs text-gray-500">{a.firmware_version || '—'}</td>
                <td className="py-2 pr-4 text-xs text-gray-400">{a.security_zone || '—'}</td>
                <td className="py-2 pr-4">
                  <span className={`text-xs font-bold ${a.criticality === 'high' ? 'text-red-400' : a.criticality === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
                    {(a.criticality || 'medium').toUpperCase()}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  {a.classified_by === 'manual'
                    ? <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-400 border border-blue-800/50" title="Modificato manualmente dall'assessor">
                        <PenLine className="w-2.5 h-2.5" /> Manuale
                      </span>
                    : <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-800/60 text-gray-500 border border-gray-700/50" title="Classificato automaticamente dalla scansione">
                        <Cpu className="w-2.5 h-2.5" /> Auto
                      </span>
                  }
                </td>
                <td className="py-2 font-mono text-xs text-gray-500">
                  {(a.ports || []).map(p => `${p.port}/${p.protocol}`).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

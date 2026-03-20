import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Newspaper, RefreshCw, ExternalLink, AlertOctagon } from 'lucide-react'

export default function Advisories() {
  const [advisories, setAdvisories] = useState([])
  const [stats, setStats] = useState(null)
  const [vendor, setVendor] = useState('')
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState(null)

  const load = () => {
    Promise.all([
      api.getAdvisories({ vendor: vendor || undefined, source: source || undefined }),
      api.getAdvisoryStats()
    ]).then(([a, s]) => { setAdvisories(a); setStats(s) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [vendor, source])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await api.refreshAdvisories()
      setToast('Refresh CISA/NVD avviato in background. Attendere alcuni minuti.')
      setTimeout(() => setToast(null), 5000)
    } catch (err) { setToast(`Errore: ${err.message}`) }
    finally { setRefreshing(false) }
  }

  const vendors = [...new Set(advisories.map(a => a.vendor).filter(Boolean))].sort()

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full" /></div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-brand-green" /> Vulnerability Advisories
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {stats ? `${stats.total} advisory in cache — ${stats.kev} CISA KEV — ${stats.nvd} NVD` : ''}
            {stats?.lastFetch ? ` · Ultimo sync: ${new Date(stats.lastFetch).toLocaleString('it-IT')}` : ''}
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Aggiornamento...' : 'Aggiorna da CISA/NVD'}
        </button>
      </div>

      {toast && (
        <div className="bg-blue-900/50 border border-blue-700 text-blue-300 px-4 py-3 rounded-lg text-sm">
          {toast}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="input" value={vendor} onChange={e => setVendor(e.target.value)}>
          <option value="">Tutti i vendor</option>
          {vendors.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select className="input" value={source} onChange={e => setSource(e.target.value)}>
          <option value="">Tutte le fonti</option>
          <option value="CISA-KEV">CISA KEV</option>
          <option value="NVD-CISA">NVD</option>
        </select>
      </div>

      {advisories.length === 0 ? (
        <div className="card text-center py-12">
          <Newspaper className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 mb-2">Nessun advisory in cache.</p>
          <p className="text-gray-600 text-sm">Avvia un assessment con scansione attiva per popolare la cache.</p>
          <button onClick={handleRefresh} className="btn-primary mt-4">Aggiorna ora da CISA/NVD</button>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                <th className="text-left py-2 pr-4">ID</th>
                <th className="text-left py-2 pr-4">Vendor</th>
                <th className="text-left py-2 pr-4">Titolo</th>
                <th className="text-center py-2 pr-4">CVSS</th>
                <th className="text-left py-2 pr-4">Fonte</th>
                <th className="text-left py-2 pr-4">Data</th>
                <th className="text-left py-2">Link</th>
              </tr>
            </thead>
            <tbody>
              {advisories.map(a => (
                <tr key={a.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 pr-4 font-mono text-xs text-gray-400">{a.id}</td>
                  <td className="py-2 pr-4 text-xs text-gray-300">{a.vendor}</td>
                  <td className="py-2 pr-4 text-xs text-gray-200 max-w-xs truncate" title={a.title}>{a.title}</td>
                  <td className="py-2 pr-4 text-center">
                    {a.cvss_score ? (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        a.cvss_score >= 9 ? 'bg-red-900/50 text-red-400' :
                        a.cvss_score >= 7 ? 'bg-orange-900/50 text-orange-400' :
                        'bg-yellow-900/50 text-yellow-400'
                      }`}>{a.cvss_score}</span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      a.source === 'CISA-KEV' ? 'bg-red-900/50 text-red-400 border border-red-800' : 'bg-blue-900/50 text-blue-400 border border-blue-800'
                    }`}>
                      {a.source === 'CISA-KEV' && <AlertOctagon className="w-2.5 h-2.5 inline mr-1" />}
                      {a.source}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-xs text-gray-500">
                    {a.published_at ? new Date(a.published_at).toLocaleDateString('it-IT') : '—'}
                  </td>
                  <td className="py-2">
                    {a.url && (
                      <a href={a.url} target="_blank" rel="noopener noreferrer"
                         className="text-xs text-brand-green hover:underline flex items-center gap-1">
                        NVD <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

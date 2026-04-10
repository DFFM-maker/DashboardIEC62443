import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { api } from '../lib/api'
import SeverityBadge from '../components/SeverityBadge'
import { Play, Download, FileSpreadsheet, FileText, Package, ChevronDown, ChevronUp, Terminal, ClipboardCheck } from 'lucide-react'

const TABS = ['Overview', 'Asset', 'Finding', 'Zone', 'Report', 'Log']

export default function AssessmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [assessment, setAssessment] = useState(null)
  const [stats, setStats] = useState(null)
  const [assets, setAssets] = useState([])
  const [findings, setFindings] = useState([])
  const [zones, setZones] = useState([])
  const [logs, setLogs] = useState([])
  const [tab, setTab] = useState('Overview')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [liveLog, setLiveLog] = useState([])
  const [toast, setToast] = useState(null)
  const socketRef = useRef(null)
  const logEndRef = useRef(null)

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  const load = async () => {
    try {
      const [a, s, ass, f, z, l] = await Promise.all([
        api.getAssessment(id),
        api.getAssessmentStats(id),
        api.getAssets(id),
        api.getFindings(id),
        api.getZones(id),
        api.getLogs(id),
      ])
      setAssessment(a)
      setStats(s)
      setAssets(ass)
      setFindings(f)
      setZones(z)
      setLogs(l)
      setScanning(a.status === 'scanning')
    } catch (err) {
      if (err.message?.includes('404') || err.message?.includes('non trovato')) {
        navigate('/assessments', { replace: true })
      } else { console.error(err) }
    }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()

    // Socket.io for live scan updates
    const socket = io('/', { path: '/socket.io' })
    socketRef.current = socket
    socket.emit('join', id)

    socket.on('log', (entry) => {
      setLiveLog(prev => [...prev.slice(-200), entry])
    })
    socket.on('scan_complete', () => {
      setScanning(false)
      load()
    })

    return () => socket.disconnect()
  }, [id])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveLog])

  const startScan = async () => {
    setScanning(true)
    setLiveLog([])
    setTab('Log')
    try {
      await api.startScan(id)
    } catch (err) {
      setScanning(false)
      alert(err.message)
    }
  }

  const downloadReport = async (format) => {
    try {
      const res = await api.generateReport(id, format)
      if (!res.ok) { const e = await res.json().catch(() => ({})); showToast(e.error || `Errore generazione report ${format.toUpperCase()}`); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || `report.${format}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (err) { showToast(err.message) }
  }

  const exportOtsa = async () => {
    try {
      const res = await api.exportAssessment(id)
      if (!res.ok) { showToast('Export .otsa fallito'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `assessment_${id}.otsa`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (err) { showToast(err.message) }
  }

  const closeFinding = async (findingId, currentStatus) => {
    const newStatus = currentStatus === 'resolved' ? 'open' : 'resolved'
    await api.updateFinding(findingId, { status: newStatus })
    setFindings(prev => prev.map(f => f.id === findingId ? { ...f, status: newStatus } : f))
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full" /></div>
  if (!assessment) return <div className="p-6 text-red-400">Assessment non trovato</div>

  return (
    <div className="p-6 space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm shadow-lg border max-w-sm ${
          toast.type === 'error' ? 'bg-red-900/90 border-red-700 text-red-200' : 'bg-green-900/90 border-green-700 text-green-200'
        }`}>{toast.msg}</div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/assessments" className="hover:text-gray-300">Assessment</Link>
            <span>/</span>
            <span className="text-gray-300">{assessment.name}</span>
          </div>
          <h1 className="text-xl font-bold text-white">{assessment.name}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-400">
            {assessment.client_name && <span>👤 {assessment.client_name}</span>}
            <span className="font-mono text-xs bg-gray-800 px-2 py-0.5 rounded">{assessment.subnet}</span>
            <span>Assessor: {assessment.assessor || '—'}</span>
            <span>{assessment.iec62443_target_sl || 'SL-2'}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
              assessment.status === 'completed' ? 'bg-green-900/50 text-green-400' :
              assessment.status === 'scanning' ? 'bg-blue-900/50 text-blue-400 animate-pulse' :
              'bg-gray-800 text-gray-400'
            }`}>{assessment.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {assessment.status === 'completed' ? (
            <Link
              to={`/assessments/${id}/step/1`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm bg-purple-900/60 hover:bg-purple-800/80 text-purple-300 hover:text-purple-100 border border-purple-700/50 transition-all"
            >
              <ClipboardCheck className="w-4 h-4" />
              Wizard IEC 62443
            </Link>
          ) : (
            <div className="relative group">
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm bg-gray-800/60 text-gray-600 border border-gray-700/50 cursor-not-allowed"
              >
                <ClipboardCheck className="w-4 h-4" />
                Wizard IEC 62443
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                  Prima avvia una scansione
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
                </div>
              </div>
            </div>
          )}
          <button
            onClick={startScan}
            disabled={scanning}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              scanning ? 'bg-blue-900/50 text-blue-400 cursor-not-allowed animate-pulse' : 'btn-primary'
            }`}
          >
            <Play className="w-4 h-4" />
            {scanning ? 'Scansione in corso...' : 'Avvia Scansione'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-brand-green text-brand-green' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t}
            {t === 'Finding' && findings.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded ${
                findings.some(f => f.severity === 'critical') ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'
              }`}>{findings.length}</span>
            )}
            {t === 'Asset' && assets.length > 0 && (
              <span className="ml-1.5 text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{assets.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'Overview' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Asset', value: assets.length, color: 'text-blue-400' },
              { label: 'Finding', value: findings.length, color: 'text-yellow-400' },
              { label: 'Critical', value: findings.filter(f => f.severity === 'critical').length, color: 'text-red-400' },
              { label: 'High', value: findings.filter(f => f.severity === 'high').length, color: 'text-orange-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card text-center">
                <p className={`text-4xl font-bold ${color}`}>{value}</p>
                <p className="text-sm text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Zone summary */}
          {zones.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-3">Zone di Sicurezza</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {zones.map(z => (
                  <div key={z.id} className="bg-gray-800 rounded-lg p-3 flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: z.color }} />
                    <div>
                      <p className="font-medium text-white text-sm">{z.name}</p>
                      <p className="text-xs text-gray-500">{z.security_level} · {z.assets?.length || 0} asset</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top findings */}
          {findings.filter(f => f.severity === 'critical' || f.severity === 'high').length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-3">Finding Critici/Alti</h3>
              <div className="space-y-2">
                {findings.filter(f => f.severity === 'critical' || f.severity === 'high').slice(0, 5).map(f => (
                  <div key={f.id} className="flex items-start gap-3 py-2 border-b border-gray-800 last:border-0">
                    <SeverityBadge severity={f.severity} />
                    <div>
                      <p className="text-sm font-medium text-white">{f.title}</p>
                      <p className="text-xs text-gray-500">{f.asset_ip || '—'} · CVSS {f.cvss_score}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Asset */}
      {tab === 'Asset' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                <th className="text-left py-2 pr-3">IP</th>
                <th className="text-left py-2 pr-3">Vendor</th>
                <th className="text-left py-2 pr-3">Modello</th>
                <th className="text-left py-2 pr-3">Tipo</th>
                <th className="text-left py-2 pr-3">Zona</th>
                <th className="text-left py-2 pr-3">Criticità</th>
                <th className="text-left py-2">Porte</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 pr-3 font-mono text-brand-green text-xs">{a.ip}</td>
                  <td className="py-2 pr-3 text-gray-300 text-xs">{a.vendor || '—'}</td>
                  <td className="py-2 pr-3 text-gray-400 text-xs">{a.device_model || '—'}</td>
                  <td className="py-2 pr-3 text-xs"><span className="bg-gray-800 px-2 py-0.5 rounded text-gray-300">{a.device_type || '?'}</span></td>
                  <td className="py-2 pr-3 text-xs text-gray-400">{a.security_zone || '—'}</td>
                  <td className="py-2 pr-3">
                    <span className={`text-xs font-bold ${a.criticality === 'high' ? 'text-red-400' : a.criticality === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
                      {(a.criticality || 'medium').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 font-mono text-xs text-gray-500">
                    {(a.ports || []).map(p => p.port).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Finding */}
      {tab === 'Finding' && (
        <div className="space-y-3">
          {findings.length === 0 ? (
            <div className="card text-center py-8"><p className="text-gray-500">Nessun finding trovato.</p></div>
          ) : findings.map((f, i) => (
            <FindingCard key={f.id} finding={f} index={i} onToggle={() => closeFinding(f.id, f.status)} />
          ))}
        </div>
      )}

      {/* Tab: Zone */}
      {tab === 'Zone' && (
        <div className="space-y-4">
          {zones.length === 0 ? (
            <div className="card text-center py-8"><p className="text-gray-500">Nessuna zona definita.</p></div>
          ) : zones.map(z => (
            <div key={z.id} className="card" style={{ borderLeft: `4px solid ${z.color}` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: z.color }} />
                <h3 className="font-semibold text-white">{z.name}</h3>
                <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">{z.security_level}</span>
                {z.description && <span className="text-xs text-gray-500">{z.description}</span>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(z.assets || []).map(a => (
                  <div key={a.id} className="bg-gray-800 rounded p-2 text-xs">
                    <p className="font-mono text-brand-green">{a.ip}</p>
                    <p className="text-gray-400">{a.vendor?.split(' ')[0] || '?'} — {a.device_type || '?'}</p>
                  </div>
                ))}
                {(z.assets || []).length === 0 && <p className="text-gray-600 text-xs">Nessun asset assegnato</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Report */}
      {tab === 'Report' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Report HTML', desc: 'Report interattivo standalone', icon: FileText, format: 'html', color: 'text-blue-400' },
            { label: 'Report PDF', desc: 'PDF stampabile con logo Tecnopack', icon: FileText, format: 'pdf', color: 'text-red-400' },
            { label: 'Excel', desc: 'Asset inventory + finding tabellare', icon: FileSpreadsheet, format: 'excel', color: 'text-green-400' },
            { label: 'Export .otsa', desc: 'Formato portabile Tecnopack', icon: Package, format: 'otsa', color: 'text-purple-400' },
          ].map(({ label, desc, icon: Icon, format, color }) => (
            <button
              key={format}
              onClick={() => format === 'otsa' ? exportOtsa() : downloadReport(format)}
              className="card hover:border-gray-600 transition-colors text-left group"
            >
              <Icon className={`w-8 h-8 ${color} mb-3 group-hover:scale-110 transition-transform`} />
              <p className="font-semibold text-white">{label}</p>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
              <div className="flex items-center gap-1 mt-3">
                <Download className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500">Scarica</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Tab: Log */}
      {tab === 'Log' && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-brand-green" />
            <h3 className="font-semibold text-white">Log Scansione</h3>
            {scanning && <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded animate-pulse">in corso...</span>}
          </div>
          <div className="bg-gray-950 rounded-lg p-4 font-mono text-xs max-h-96 overflow-y-auto space-y-1">
            {liveLog.length === 0 && logs.length === 0 && (
              <p className="text-gray-600">Avvia una scansione per vedere i log in tempo reale.</p>
            )}
            {liveLog.map((entry, i) => (
              <div key={i} className={`flex gap-3 ${entry.level === 'error' ? 'text-red-400' : entry.level === 'warning' ? 'text-yellow-400' : entry.level === 'success' ? 'text-green-400' : 'text-gray-400'}`}>
                <span className="text-gray-700 shrink-0">{new Date(entry.timestamp).toLocaleTimeString('it-IT')}</span>
                <span>{entry.message}</span>
              </div>
            ))}
            {liveLog.length === 0 && logs.slice(0, 100).reverse().map(entry => (
              <div key={entry.id} className={`flex gap-3 ${entry.level === 'error' ? 'text-red-400' : entry.level === 'warning' ? 'text-yellow-400' : entry.level === 'success' ? 'text-green-400' : 'text-gray-400'}`}>
                <span className="text-gray-700 shrink-0">{new Date(entry.timestamp).toLocaleTimeString('it-IT')}</span>
                <span>{entry.message}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  )
}

function FindingCard({ finding: f, index, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  let srList = []
  try { srList = JSON.parse(f.iec62443_sr || '[]') } catch (e) {}

  return (
    <div className={`card border-l-4 ${f.severity === 'critical' ? 'border-l-red-500' : f.severity === 'high' ? 'border-l-orange-500' : f.severity === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
      <div className="flex items-start gap-3">
        <SeverityBadge severity={f.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-white text-sm">{f.title}</p>
            <div className="flex items-center gap-2 shrink-0">
              {f.cvss_score && (
                <span className="text-xs font-mono bg-gray-800 px-2 py-0.5 rounded text-gray-300">
                  CVSS {f.cvss_score}
                </span>
              )}
              <button
                onClick={onToggle}
                className={`text-xs px-2 py-0.5 rounded border ${f.status === 'resolved' ? 'border-green-700 text-green-400 bg-green-900/20' : 'border-gray-700 text-gray-400'}`}
              >
                {f.status === 'resolved' ? '✓ Risolto' : 'Aperto'}
              </button>
              <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-gray-300">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
            {f.asset_ip && <span className="font-mono text-gray-400">{f.asset_ip}</span>}
            {srList.length > 0 && <span>{srList.join(', ')}</span>}
            <span>{f.remediation_priority}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 pt-3 border-t border-gray-800">
          <p className="text-sm text-gray-300">{f.description}</p>
          {f.remediation && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Remediation</p>
              <p className="text-sm text-gray-300 whitespace-pre-line">{f.remediation}</p>
            </div>
          )}
          {f.cvss_vector && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">CVSS Vector</p>
              <code className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded block">{f.cvss_vector}</code>
            </div>
          )}
          {f.evidence && (
            <details>
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">Evidence</summary>
              <pre className="mt-2 text-xs text-gray-400 bg-gray-950 p-3 rounded overflow-x-auto">{f.evidence}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

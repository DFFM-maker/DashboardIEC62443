import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Plus, Play, Trash2, FileText, Search } from 'lucide-react'
import SeverityBadge from '../components/SeverityBadge'

export default function Assessments() {
  const navigate = useNavigate()
  const [assessments, setAssessments] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, name }
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', subnet: '172.16.224.0/20', client_id: '', assessor: '', iec62443_target_sl: 'SL-2', notes: '', snmp_community: 'tecnopack2026' })

  const load = () => {
    Promise.all([api.getAssessments(), api.getClients()])
      .then(([a, c]) => { setAssessments(a); setClients(c) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const created = await api.createAssessment(form)
      setShowModal(false)
      setForm({ name: '', subnet: '172.16.224.0/20', client_id: '', assessor: '', iec62443_target_sl: 'SL-2', notes: '', snmp_community: 'tecnopack2026' })
      navigate(`/assessments/${created.id}/step/1`)
    } catch (err) { alert(err.message) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try { await api.deleteAssessment(deleteTarget.id); setDeleteTarget(null); load() }
    catch (err) { alert(err.message) }
  }

  const filtered = assessments.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
    a.subnet.includes(search)
  )

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full" /></div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Assessment</h1>
          <p className="text-gray-400 text-sm mt-1">{assessments.length} assessment totali</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuovo Assessment
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
        <input
          className="input pl-9 w-full"
          placeholder="Cerca per nome, cliente, subnet..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">Nessun assessment trovato.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4">Crea il primo assessment</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(a => (
            <div key={a.id} className="card hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link to={`/assessments/${a.id}`} className="font-semibold text-white hover:text-brand-green text-lg transition-colors">
                      {a.name}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      a.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                      a.status === 'scanning' ? 'bg-blue-900/50 text-blue-400 animate-pulse' :
                      'bg-gray-800 text-gray-400'
                    }`}>{a.status}</span>
                    {a.critical_count > 0 && (
                      <span className="text-xs bg-red-900/50 text-red-400 border border-red-800 px-2 py-0.5 rounded font-bold">
                        {a.critical_count} CRITICAL
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-400">
                    {a.client_name && <span>👤 {a.client_name}</span>}
                    <span className="font-mono text-xs bg-gray-800 px-2 py-0.5 rounded">{a.subnet}</span>
                    <span>📡 {a.asset_count || 0} asset</span>
                    <span>🔴 {a.finding_count || 0} finding</span>
                    <span>🎯 {a.iec62443_target_sl || 'SL-2'}</span>
                    <span>{new Date(a.created_at).toLocaleDateString('it-IT')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/assessments/${a.id}`} className="btn-secondary flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Dettagli
                  </Link>
                  <button
                    onClick={() => setDeleteTarget({ id: a.id, name: a.name })}
                    className="btn-danger flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Create */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold text-white mb-4">Nuovo Assessment</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Nome Assessment *</label>
                <input className="input w-full" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Es. OT Assessment Impianto X" />
              </div>
              <div>
                <label className="label">Subnet Target *</label>
                <input className="input w-full font-mono" required value={form.subnet} onChange={e => setForm({...form, subnet: e.target.value})} placeholder="172.16.224.0/20" />
              </div>
              <div>
                <label className="label">Cliente</label>
                <select className="input w-full" value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}>
                  <option value="">— Nessun cliente —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Assessor</label>
                  <input className="input w-full" value={form.assessor} onChange={e => setForm({...form, assessor: e.target.value})} placeholder="Nome Cognome" />
                </div>
                <div>
                  <label className="label">SL Target</label>
                  <select className="input w-full" value={form.iec62443_target_sl} onChange={e => setForm({...form, iec62443_target_sl: e.target.value})}>
                    <option>SL-1</option><option>SL-2</option><option>SL-3</option><option>SL-4</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">SNMP Community</label>
                <input className="input w-full font-mono" value={form.snmp_community} onChange={e => setForm({...form, snmp_community: e.target.value})} placeholder="public" />
                <p className="text-xs text-gray-600 mt-1">Community string per fingerprinting SNMP dei device</p>
              </div>
              <div>
                <label className="label">Note</label>
                <textarea className="input w-full" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annulla</button>
                <button type="submit" className="btn-primary">Crea Assessment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal conferma eliminazione */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-red-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" /> Elimina Assessment
            </h2>
            <p className="text-gray-400 text-sm mb-1">Stai per eliminare:</p>
            <p className="text-white font-semibold mb-4">"{deleteTarget.name}"</p>
            <p className="text-red-400 text-sm mb-6">Tutti gli asset, finding e log verranno eliminati definitivamente.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Annulla</button>
              <button onClick={handleDelete} className="btn-danger">Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

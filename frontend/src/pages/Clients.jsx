import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react'

const emptyForm = { name: '', address: '', city: '', country: 'IT', contact_name: '', contact_email: '', contact_phone: '', notes: '' }

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    api.getClients().then(setClients).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditClient(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (c) => { setEditClient(c); setForm({ ...c }); setShowModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editClient) await api.updateClient(editClient.id, form)
      else await api.createClient(form)
      setShowModal(false)
      load()
    } catch (err) { alert(err.message) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try { await api.deleteClient(deleteTarget.id); setDeleteTarget(null); load() }
    catch (err) { alert(err.message) }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full" /></div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-green" /> Impianti / Clienti
          </h1>
          <p className="text-gray-400 text-sm mt-1">{clients.length} clienti registrati</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuovo Cliente
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="card text-center py-12">
          <Building2 className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">Nessun cliente registrato.</p>
          <button onClick={openCreate} className="btn-primary mt-4">Aggiungi primo cliente</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map(c => (
            <div key={c.id} className="card hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-semibold text-white">{c.name}</h3>
                  {c.city && <p className="text-sm text-gray-500">{c.address ? `${c.address}, ` : ''}{c.city} ({c.country})</p>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => openEdit(c)} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget({ id: c.id, name: c.name })} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {c.contact_name && (
                <div className="text-xs text-gray-500 mb-3 space-y-0.5">
                  <p>👤 {c.contact_name}</p>
                  {c.contact_email && <p>✉️ {c.contact_email}</p>}
                  {c.contact_phone && <p>📞 {c.contact_phone}</p>}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <span className="text-xs text-gray-500">{c.assessment_count || 0} assessment</span>
                {c.assessment_count > 0 && (
                  <Link to={`/assessments?client=${c.id}`} className="text-xs text-brand-green hover:underline">
                    Vedi assessment →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal conferma eliminazione */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-red-800 rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" /> Elimina Cliente
            </h2>
            <p className="text-gray-400 text-sm mb-4">Eliminare <strong className="text-white">"{deleteTarget.name}"</strong>?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Annulla</button>
              <button onClick={handleDelete} className="btn-danger">Elimina</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">{editClient ? 'Modifica Cliente' : 'Nuovo Cliente'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nome Azienda *</label>
                <input className="input w-full" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Es. Tecnopack S.r.l." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Indirizzo</label>
                  <input className="input w-full" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Via Industriale 1" />
                </div>
                <div>
                  <label className="label">Città</label>
                  <input className="input w-full" value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Milano" />
                </div>
              </div>
              <div>
                <label className="label">Referente</label>
                <input className="input w-full" value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} placeholder="Nome Cognome" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Email</label>
                  <input className="input w-full" type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} />
                </div>
                <div>
                  <label className="label">Telefono</label>
                  <input className="input w-full" value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Note</label>
                <textarea className="input w-full" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annulla</button>
                <button type="submit" className="btn-primary">{editClient ? 'Salva' : 'Crea Cliente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

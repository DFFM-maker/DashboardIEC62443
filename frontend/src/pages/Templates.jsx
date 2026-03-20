import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { LayoutTemplate, Lock, Trash2, Plus } from 'lucide-react'

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [applyModal, setApplyModal] = useState(null)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [applying, setApplying] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'info') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000) }

  const load = () => {
    Promise.all([api.getTemplates(), api.getAssessments()])
      .then(([t, a]) => { setTemplates(t); setAssessments(a) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    try { await api.deleteTemplate(id); load() } catch (err) { showToast(err.message, 'error') }
  }

  const handleApply = async () => {
    if (!selectedAssessmentId) return showToast('Seleziona un assessment', 'error')
    setApplying(true)
    try {
      const result = await api.applyTemplate(applyModal.id, selectedAssessmentId)
      showToast(`Template applicato: ${result.zones_created} zone, ${result.conduits_created} conduit creati`, 'success')
      setApplyModal(null)
    } catch (err) { showToast(err.message, 'error') }
    finally { setApplying(false) }
  }

  const builtin = templates.filter(t => t.is_builtin)
  const custom = templates.filter(t => !t.is_builtin)

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full" /></div>

  const TemplateCard = ({ t }) => (
    <div className="card hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{t.name}</h3>
            {t.is_builtin ? (
              <Lock className="w-3.5 h-3.5 text-gray-600" title="Built-in" />
            ) : null}
          </div>
          {t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>}
        </div>
        {!t.is_builtin && (
          <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Zone preview */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(t.zones || []).map((z, i) => (
          <span key={i} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: z.color + '33', color: z.color, border: `1px solid ${z.color}55` }}>
            {z.zone_name} ({z.security_level})
          </span>
        ))}
      </div>

      <button onClick={() => { setApplyModal(t); setSelectedAssessmentId(assessments[0]?.id || '') }} className="btn-secondary w-full text-center">
        Usa questo template →
      </button>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm shadow-lg border ${
          toast.type === 'error' ? 'bg-red-900/80 border-red-700 text-red-300' :
          toast.type === 'success' ? 'bg-green-900/80 border-green-700 text-green-300' :
          'bg-blue-900/80 border-blue-700 text-blue-300'
        }`}>{toast.msg}</div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-brand-green" /> Template Zone
          </h1>
          <p className="text-gray-400 text-sm mt-1">Template pre-configurati per tipi di impianto</p>
        </div>
      </div>

      {/* Built-in */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Template Built-in</h2>
        {builtin.length === 0 ? (
          <p className="text-gray-600 text-sm">Nessun template built-in.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {builtin.map(t => <TemplateCard key={t.id} t={t} />)}
          </div>
        )}
      </div>

      {/* Custom */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Template Personalizzati</h2>
        {custom.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500 text-sm">Nessun template personalizzato.</p>
            <p className="text-gray-600 text-xs mt-1">I template custom possono essere creati via API.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {custom.map(t => <TemplateCard key={t.id} t={t} />)}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {applyModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-white mb-2">Applica Template</h2>
            <p className="text-sm text-gray-400 mb-4">
              Applica <strong className="text-white">{applyModal.name}</strong> a un assessment:
            </p>
            <select className="input w-full mb-4" value={selectedAssessmentId} onChange={e => setSelectedAssessmentId(e.target.value)}>
              <option value="">— Scegli assessment —</option>
              {assessments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <p className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded p-3 mb-4">
              Questo creerà zone e conduit nell'assessment selezionato e tenterà di assegnare automaticamente gli asset per vendor/porta.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setApplyModal(null)} className="btn-secondary">Annulla</button>
              <button onClick={handleApply} disabled={applying} className="btn-primary">
                {applying ? 'Applicazione...' : 'Applica'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

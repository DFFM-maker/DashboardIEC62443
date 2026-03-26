import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Save, FileText, AlertTriangle, CheckCircle } from 'lucide-react'
import { api } from '../../lib/api'
import WizardStepper from '../../components/wizard/WizardStepper'

const SL_NUM = { 'SL-1': 1, 'SL-2': 2, 'SL-3': 3, 'SL-4': 4 }

const CATEGORY_LABELS = {
  IAC: 'Identification & Auth Control',
  UC:  'Use Control',
  SI:  'System Integrity',
  DC:  'Data Confidentiality',
  RDF: 'Restricted Data Flow',
  TRE: 'Timely Response to Events',
  RA:  'Resource Availability',
}

function slApplies(control, slNum) {
  if (slNum >= 1 && control.sl1) return true
  if (slNum >= 2 && control.sl2) return true
  if (slNum >= 3 && control.sl3) return true
  if (slNum >= 4 && control.sl4) return true
  return false
}

// Default policy template per categoria
const POLICY_TEMPLATES = {
  IAC: (sr, title) => `**${sr} — ${title}**\n\nAzione richiesta: Implementare meccanismi di identificazione e autenticazione conformi a IEC 62443-3-3 ${sr}.\n\nMisure:\n- [ ] Definire policy password/credenziali\n- [ ] Implementare autenticazione multi-fattore dove applicabile\n- [ ] Documentare gli account autorizzati\n\nResponsabile: \nScadenza: `,
  UC:  (sr, title) => `**${sr} — ${title}**\n\nAzione richiesta: Definire e applicare controlli di accesso per ${title.toLowerCase()}.\n\nMisure:\n- [ ] Mappare i ruoli e privilegi\n- [ ] Applicare principio di minimo privilegio\n- [ ] Implementare audit log degli accessi\n\nResponsabile: \nScadenza: `,
  SI:  (sr, title) => `**${sr} — ${title}**\n\nAzione richiesta: Garantire l'integrità del sistema per ${title.toLowerCase()}.\n\nMisure:\n- [ ] Verificare integrità software/firmware\n- [ ] Implementare meccanismi di rilevamento anomalie\n\nResponsabile: \nScadenza: `,
  DEFAULT: (sr, title) => `**${sr} — ${title}**\n\nAzione richiesta: Implementare il controllo richiesto da IEC 62443-3-3.\n\nMisure:\n- [ ] Analisi gap dettagliata\n- [ ] Piano di remediation\n- [ ] Verifica implementazione\n\nResponsabile: \nScadenza: `,
}

export default function WizardStep6_Policies() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState(null)
  const [zones, setZones] = useState([])
  const [controls, setControls] = useState([])
  const [zcMap, setZcMap] = useState({}) // `zone_id:control_id` → zoneControl
  const [policyDrafts, setPolicyDrafts] = useState({}) // `zone_id:control_id` → text
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [activeZoneId, setActiveZoneId] = useState(null)

  useEffect(() => {
    Promise.all([
      api.getAssessment(id),
      api.getZones(id),
      api.getIecControls(),
      api.getZoneControls({ assessment_id: id }),
    ]).then(([a, z, c, zc]) => {
      setAssessment(a)
      setZones(z)
      setControls(c)
      const map = {}
      const drafts = {}
      for (const item of (zc || [])) {
        const key = `${item.zone_id}:${item.control_id}`
        map[key] = item
        drafts[key] = item.policy_text || ''
      }
      setZcMap(map)
      setPolicyDrafts(drafts)
      if (z.length > 0) setActiveZoneId(z[0].id)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const activeZone = zones.find(z => z.id === activeZoneId)
  const slTNum = activeZone ? (SL_NUM[activeZone.security_level] || 2) : 2

  // All gap controls for active zone (applicable + not present)
  const gapControls = controls.filter(c => {
    if (!slApplies(c, slTNum)) return false
    const zc = zcMap[`${activeZoneId}:${c.id}`]
    return !zc?.present
  })

  // Counts per zone tab
  const getZoneGapCount = (zone) => {
    const slT = SL_NUM[zone.security_level] || 1
    return controls.filter(c => {
      if (!slApplies(c, slT)) return false
      return !zcMap[`${zone.id}:${c.id}`]?.present
    }).length
  }

  const handleSavePolicy = useCallback(async (control) => {
    const key = `${activeZoneId}:${control.id}`
    const draft = policyDrafts[key] || ''
    const existing = zcMap[key]

    setSaving(prev => ({ ...prev, [key]: true }))
    try {
      const updated = await api.upsertZoneControl({
        zone_id: activeZoneId,
        control_id: control.id,
        applicable: existing?.applicable ?? 1,
        present: existing?.present ?? 0,
        sl_achieved: existing?.sl_achieved ?? 0,
        sl_target: slTNum,
        policy_text: draft,
      })
      setZcMap(prev => ({ ...prev, [key]: updated }))
      setSaved(prev => ({ ...prev, [key]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [key]: false })), 2000)
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }))
    }
  }, [activeZoneId, zcMap, policyDrafts, slTNum])

  const handleGenerateTemplate = (control) => {
    const key = `${activeZoneId}:${control.id}`
    const tmpl = POLICY_TEMPLATES[control.category] || POLICY_TEMPLATES.DEFAULT
    setPolicyDrafts(prev => ({ ...prev, [key]: tmpl(control.sr_code, control.title) }))
  }

  // Group gap controls by category
  const byCategory = gapControls.reduce((acc, c) => {
    const cat = c.category || 'OTHER'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(c)
    return acc
  }, {})

  const totalGaps = zones.reduce((sum, z) => sum + getZoneGapCount(z), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green" />
      </div>
    )
  }

  if (!assessment) {
    return <div className="flex items-center justify-center h-full text-red-400 text-sm">Errore caricamento assessment.</div>
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">IEC 62443 Risk Assessment</h1>
        <p className="text-sm text-gray-400 mt-1">{assessment.name}</p>
      </div>

      <WizardStepper currentStep={6} />

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-green" /> Policy per controlli con Gap
          </h2>
          <p className="text-xs text-gray-500">
            Redigi le policy di remediation per i controlli IEC 62443-3-3 non ancora implementati.
            Usa "Generate" per un template predefinito per categoria.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-2xl font-bold text-red-400">{totalGaps}</span>
          <p className="text-xs text-gray-500">gap totali</p>
        </div>
      </div>

      {/* Zone tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {zones.map(zone => {
          const gaps = getZoneGapCount(zone)
          const isActive = zone.id === activeZoneId
          return (
            <button
              key={zone.id}
              onClick={() => setActiveZoneId(zone.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0
                ${isActive ? 'bg-brand-green text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700'}`}
            >
              {zone.name}
              {gaps > 0
                ? <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${isActive ? 'bg-red-400/30 text-white' : 'bg-red-900/40 text-red-400'}`}>{gaps} gap</span>
                : <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              }
            </button>
          )
        })}
      </div>

      {/* Policy editor per categoria */}
      {activeZone && gapControls.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center text-gray-500 text-sm mb-6">
          <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
          Nessun gap in questa zona — tutti i controlli SL-T sono implementati.
        </div>
      )}

      {activeZone && Object.entries(byCategory).sort().map(([cat, catControls]) => (
        <div key={cat} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-800 bg-gray-800/40 flex items-center gap-3">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">{cat}</span>
            <span className="text-xs text-gray-500">{CATEGORY_LABELS[cat] || cat}</span>
            <span className="ml-auto text-xs text-red-400 font-medium">{catControls.length} gap</span>
          </div>

          <div className="divide-y divide-gray-800">
            {catControls.map(control => {
              const key = `${activeZoneId}:${control.id}`
              const draft = policyDrafts[key] ?? ''
              const isSaving = saving[key]
              const isSaved = saved[key]

              return (
                <div key={control.id} className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">{control.sr_code}</span>
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                        <span className="text-xs text-red-400">GAP</span>
                      </div>
                      <p className="text-sm font-medium text-white">{control.title}</p>
                    </div>
                    <button
                      onClick={() => handleGenerateTemplate(control)}
                      className="shrink-0 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors"
                    >
                      Generate
                    </button>
                  </div>

                  <textarea
                    value={draft}
                    onChange={e => setPolicyDrafts(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`Descrivi le azioni di remediation per ${control.sr_code}...`}
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green resize-none font-mono"
                  />

                  <div className="flex items-center justify-end gap-3 mt-2">
                    {isSaved && <span className="text-xs text-green-400">Salvato</span>}
                    <button
                      onClick={() => handleSavePolicy(control)}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-green hover:opacity-90 text-white rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
                    >
                      <Save className="w-3 h-3" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => navigate(`/assessments/${id}/step/5`)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={() => navigate(`/assessments/${id}/step/7`)}
          className="flex items-center gap-2 px-5 py-2 bg-brand-green hover:opacity-90 text-white rounded-lg text-sm font-medium transition-opacity"
        >
          Generate Report <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

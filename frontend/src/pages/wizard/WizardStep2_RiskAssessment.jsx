import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Plus, Trash2, Edit2, X, Check } from 'lucide-react'
import { api } from '../../lib/api'
import WizardStepper from '../../components/wizard/WizardStepper'
import RiskMatrix5x5 from '../../components/wizard/RiskMatrix5x5'

const SESSION_KEY = (id) => `wizard-${id}-step2`

const LIKELIHOOD_LABELS = ['Remote', 'Unlikely', 'Possible', 'Likely', 'Certain']
const IMPACT_LABELS = ['Trivial', 'Minor', 'Moderate', 'Major', 'Critical']

const RISK_COLORS = {
  LOW: 'bg-green-500/20 text-green-400 border-green-500/30',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
  CATASTROPHIC: 'bg-red-900/30 text-red-300 border-red-900/50',
}

function calcRisk(likelihood, impact) {
  const score = likelihood * impact
  if (score <= 4) return { score, label: 'LOW' }
  if (score <= 9) return { score, label: 'MEDIUM' }
  if (score <= 14) return { score, label: 'HIGH' }
  if (score <= 19) return { score, label: 'CRITICAL' }
  return { score, label: 'CATASTROPHIC' }
}

const EMPTY_EVENT = {
  risk_description: '',
  consequence: '',
  likelihood: 3,
  safety_impact: 3,
}

export default function WizardStep2_RiskAssessment() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [assessment, setAssessment] = useState(null)
  const [riskEvents, setRiskEvents] = useState([])
  const [assumptions, setAssumptions] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editEvent, setEditEvent] = useState(null) // null = new, object = edit
  const [form, setForm] = useState(EMPTY_EVENT)
  const autoSaveTimer = useRef(null)

  useEffect(() => {
    Promise.all([
      api.getAssessment(id),
      api.getRiskEvents(id),
    ]).then(([a, events]) => {
      setAssessment(a)

      // 1. Auto-compilazione delle Assumptions
      const defaultAssumptions = "L'impianto si trova in un'area di produzione accessibile a personale non IT (operatori, manutentori esterni, addetti alle pulizie). Le prese di rete RJ45 sui quadri elettrici (cabinet) sono fisicamente accessibili e attive."
      const loadedAssumptions = a.assumptions || defaultAssumptions

      const saved = sessionStorage.getItem(SESSION_KEY(id))
      if (saved) {
        const parsed = JSON.parse(saved)
        setAssumptions(parsed.assumptions || loadedAssumptions)
      } else {
        setAssumptions(loadedAssumptions)
      }

      // 2. Auto-creazione del Risk Event (Scenario Rete Piatta) se la lista è vuota
      if (events.length === 0) {
        const defaultEvent = {
          risk_description: "Un manutentore esterno (o un dipendente disattento) collega il proprio portatile infetto da ransomware alla rete della macchina.",
          consequence: "Essendo una rete piatta e senza difese interne, il malware cripta o blocca istantaneamente tutti gli HMI e i PLC collegati.",
          likelihood: 2, // Unlikely
          safety_impact: 5, // Critical
          calculated_risk: 10,
          calculated_risk_label: "HIGH"
        }

        // Lo creiamo direttamente nel DB così ottiene un ID e diventa persistente
        api.createRiskEvent(id, defaultEvent)
          .then(created => {
            setRiskEvents([created])
          })
          .catch(err => {
            console.error("Errore durante l'auto-generazione del Risk Event:", err)
            setRiskEvents([]) // Fallback
          })
      } else {
        // Se ci sono già eventi (es. l'utente li ha creati o stiamo ricaricando), usiamo quelli
        setRiskEvents(events)
      }
    })
  }, [id])

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(autoSaveTimer.current), [])

  const handleAssumptionsChange = (value) => {
    setAssumptions(value)
    sessionStorage.setItem(SESSION_KEY(id), JSON.stringify({ assumptions: value }))
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      api.patchAssessment(id, { assumptions: value })
    }, 30000)
  }

  const handleOpenForm = (event = null) => {
    setEditEvent(event)
    setForm(event ? {
      risk_description: event.risk_description || '',
      consequence: event.consequence || '',
      likelihood: event.likelihood || 3,
      safety_impact: event.safety_impact || 3,
    } : EMPTY_EVENT)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditEvent(null)
    setForm(EMPTY_EVENT)
  }

  const handleSaveEvent = async () => {
    const { score, label } = calcRisk(form.likelihood, form.safety_impact)
    const payload = {
      ...form,
      calculated_risk: score,
      calculated_risk_label: label,
    }
    if (editEvent) {
      const updated = await api.updateRiskEvent(id, editEvent.id, payload)
      setRiskEvents(prev => prev.map(e => e.id === editEvent.id ? updated : e))
    } else {
      const created = await api.createRiskEvent(id, payload)
      setRiskEvents(prev => [...prev, created])
    }
    handleCloseForm()
  }

  const handleDeleteEvent = async (eventId) => {
    await api.deleteRiskEvent(id, eventId)
    setRiskEvents(prev => prev.filter(e => e.id !== eventId))
  }

  const handleMatrixClick = (l, i, score, label) => {
    setForm(prev => ({ ...prev, likelihood: l, safety_impact: i }))
  }

  const handleNext = async () => {
    clearTimeout(autoSaveTimer.current)
    await api.patchAssessment(id, { assumptions })
    navigate(`/assessments/${id}/step/3`)
  }

  const handleBack = () => {
    clearTimeout(autoSaveTimer.current)
    navigate(`/assessments/${id}/step/1`)
  }

  if (!assessment) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green" />
      </div>
    )
  }

  const currentRisk = calcRisk(form.likelihood, form.safety_impact)

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">IEC 62443 Risk Assessment</h1>
        <p className="text-sm text-gray-400 mt-1">{assessment.name}</p>
      </div>

      <WizardStepper currentStep={2} />

      {/* Assumptions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-base font-semibold text-white mb-1">Assumptions & Scope</h2>
        <p className="text-xs text-gray-500 mb-4">
          Elenca le assunzioni di sicurezza e i vincoli di scope per questo assessment.
        </p>
        <label htmlFor="field-assumptions" className="block text-sm font-medium text-gray-300 mb-1">
          Assumptions
        </label>
        <textarea
          id="field-assumptions"
          value={assumptions}
          onChange={e => handleAssumptionsChange(e.target.value)}
          placeholder="es. Il sistema è isolato dalla rete IT corporate..."
          rows={4}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green resize-none"
        />
      </div>

      {/* Risk Events */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Risk Events</h2>
            <p className="text-xs text-gray-500 mt-1">
              Identifica gli scenari di rischio secondo IEC 62443-3-2.
            </p>
          </div>
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 px-3 py-2 bg-brand-green hover:opacity-90 text-white rounded-lg text-sm font-medium transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Risk Event
          </button>
        </div>

        {riskEvents.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            No risk events added yet. Click "Add Risk Event" to start.
          </div>
        ) : (
          <div className="space-y-3">
            {riskEvents.map(event => {
              const colorClass = RISK_COLORS[event.calculated_risk_label] || RISK_COLORS.MEDIUM
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-4 bg-gray-800 border border-gray-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{event.risk_description}</p>
                    {event.consequence && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{event.consequence}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500">L={event.likelihood} × I={event.safety_impact}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${colorClass}`}>
                        {event.calculated_risk_label} ({event.calculated_risk})
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenForm(event)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Risk Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">
                {editEvent ? 'Edit Risk Event' : 'New Risk Event'}
              </h3>
              <button onClick={handleCloseForm} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="re-description" className="block text-sm font-medium text-gray-300 mb-1">
                  Risk Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="re-description"
                  value={form.risk_description}
                  onChange={e => setForm(prev => ({ ...prev, risk_description: e.target.value }))}
                  placeholder="Descrivi lo scenario di rischio..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green resize-none"
                />
              </div>

              <div>
                <label htmlFor="re-consequence" className="block text-sm font-medium text-gray-300 mb-1">
                  Consequence
                </label>
                <input
                  id="re-consequence"
                  type="text"
                  value={form.consequence}
                  onChange={e => setForm(prev => ({ ...prev, consequence: e.target.value }))}
                  placeholder="Conseguenza potenziale..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                />
              </div>

              {/* Risk Matrix */}
              <div>
                <p className="block text-sm font-medium text-gray-300 mb-4">Risk Assessment</p>

                {/* Likelihood Slider */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-400">Likelihood</label>
                    <span className="text-xs font-bold text-white">
                      {form.likelihood} — {LIKELIHOOD_LABELS[form.likelihood - 1]}
                    </span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={form.likelihood}
                    onChange={e => setForm(prev => ({ ...prev, likelihood: Number(e.target.value) }))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700"
                    style={{ accentColor: '#22c55e' }}
                  />
                  <div className="flex justify-between mt-1 px-0.5">
                    {LIKELIHOOD_LABELS.map((l, i) => (
                      <span key={i} className="text-[10px] text-gray-600">{l}</span>
                    ))}
                  </div>
                </div>

                {/* Impact Slider */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-400">Impact</label>
                    <span className="text-xs font-bold text-white">
                      {form.safety_impact} — {IMPACT_LABELS[form.safety_impact - 1]}
                    </span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={form.safety_impact}
                    onChange={e => setForm(prev => ({ ...prev, safety_impact: Number(e.target.value) }))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700"
                    style={{ accentColor: '#22c55e' }}
                  />
                  <div className="flex justify-between mt-1 px-0.5">
                    {IMPACT_LABELS.map((l, i) => (
                      <span key={i} className="text-[10px] text-gray-600">{l}</span>
                    ))}
                  </div>
                </div>

                {/* 5×5 Matrix */}
                <RiskMatrix5x5
                  likelihood={form.likelihood}
                  impact={form.safety_impact}
                  interactive
                  showLegend
                  onRiskChange={handleMatrixClick}
                />

                {/* Score below matrix */}
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-sm text-gray-400">Score:</span>
                  <span className="text-lg font-bold text-white">{currentRisk.score}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded border ${RISK_COLORS[currentRisk.label]}`}>
                    {currentRisk.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseForm}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={!form.risk_description.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-brand-green hover:opacity-90 text-white rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-5 py-2 bg-brand-green hover:opacity-90 text-white rounded-lg text-sm font-medium transition-opacity"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

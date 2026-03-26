import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Shield, AlertTriangle, Info } from 'lucide-react'
import { api } from '../../lib/api'
import WizardStepper from '../../components/wizard/WizardStepper'

const SL_OPTIONS = ['SL-1', 'SL-2', 'SL-3', 'SL-4']

const SL_COLORS = {
  'SL-1': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  'SL-2': 'text-green-400 bg-green-500/10 border-green-500/30',
  'SL-3': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  'SL-4': 'text-red-400 bg-red-500/10 border-red-500/30',
}

const SL_DESCRIPTIONS = {
  'SL-1': 'Protezione contro violazioni casuali o non intenzionali',
  'SL-2': 'Protezione contro attaccanti con risorse limitate e motivazione semplice',
  'SL-3': 'Protezione contro attaccanti con risorse sofisticate e motivazione specifica',
  'SL-4': 'Protezione contro attaccanti con risorse state-level e motivazione altamente specifica',
}

export default function WizardStep4_TolerableRisk() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [assessment, setAssessment] = useState(null)
  const [zones, setZones] = useState([])
  const [riskEvents, setRiskEvents] = useState([])
  const [saving, setSaving] = useState({})

  useEffect(() => {
    Promise.all([
      api.getAssessment(id),
      api.getZones(id),
      api.getRiskEvents(id),
    ]).then(([a, z, r]) => {
      setAssessment(a)
      setZones(z)
      setRiskEvents(r)
    })
  }, [id])

  const handleSlChange = async (zoneId, newSl, zone) => {
    setSaving(prev => ({ ...prev, [zoneId]: true }))
    setZones(prev => prev.map(z => z.id === zoneId ? { ...z, security_level: newSl } : z))
    try {
      await api.updateZone(zoneId, {
        name: zone.name,
        security_level: newSl,
        description: zone.description,
        color: zone.color,
        x: zone.x,
        y: zone.y,
        width: zone.width,
        height: zone.height,
      })
    } finally {
      setSaving(prev => ({ ...prev, [zoneId]: false }))
    }
  }

  if (!assessment) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green" />
      </div>
    )
  }

  // Highest risk from step 2 to inform decision
  const maxRisk = riskEvents.reduce((max, e) => (e.calculated_risk || 0) > (max?.calculated_risk || 0) ? e : max, null)

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">IEC 62443 Risk Assessment</h1>
        <p className="text-sm text-gray-400 mt-1">{assessment.name}</p>
      </div>

      <WizardStepper currentStep={4} />

      {/* Context banner */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Info className="w-4 h-4 text-brand-green" />
          Tolerable Risk — Target Security Level (SL-T)
        </h2>
        <p className="text-sm text-gray-400">
          Definisci per ogni zona il livello di sicurezza target (SL-T) secondo IEC 62443-3-2.
          Il SL-T rappresenta il livello di protezione tollerabile in relazione ai rischi identificati nello Step 2.
        </p>
        {maxRisk && (
          <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              Rischio massimo identificato: <strong>{maxRisk.calculated_risk_label}</strong> (score {maxRisk.calculated_risk}) — {maxRisk.risk_description}
            </span>
          </div>
        )}
      </div>

      {/* Zones table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-green" />
            Zone — Security Level Target
          </h2>
        </div>

        {zones.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            No zones defined. Go back to Step 3 to add zones.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="text-left px-5 py-3 font-medium">Zona</th>
                <th className="text-left px-5 py-3 font-medium">SL-T (Target)</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Descrizione</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {zones.map(zone => {
                const sl = zone.security_level || 'SL-1'
                const colorClass = SL_COLORS[sl] || SL_COLORS['SL-1']
                return (
                  <tr key={zone.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-white">{zone.name}</span>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={sl}
                        onChange={e => handleSlChange(zone.id, e.target.value, zone)}
                        className={`text-sm font-semibold px-3 py-1.5 rounded-lg border bg-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-green cursor-pointer ${colorClass}`}
                      >
                        {SL_OPTIONS.map(s => (
                          <option key={s} value={s} className="bg-gray-800 text-white">{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-xs text-gray-500">{SL_DESCRIPTIONS[sl]}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {saving[zone.id] && (
                        <span className="text-xs text-yellow-500">Saving...</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* SL legend */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Guida ai Security Level (IEC 62443-3-3)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SL_OPTIONS.map(sl => (
            <div key={sl} className={`flex items-start gap-3 p-3 rounded-lg border ${SL_COLORS[sl]}`}>
              <span className="text-sm font-bold shrink-0">{sl}</span>
              <span className="text-xs">{SL_DESCRIPTIONS[sl]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/assessments/${id}/step/3`)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={() => navigate(`/assessments/${id}/step/5`)}
          className="flex items-center gap-2 px-5 py-2 bg-brand-green hover:opacity-90 text-white rounded-lg text-sm font-medium transition-opacity"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

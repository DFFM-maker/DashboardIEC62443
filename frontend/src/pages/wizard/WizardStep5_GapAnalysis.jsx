import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { api } from '../../lib/api'
import WizardStepper from '../../components/wizard/WizardStepper'

const BASELINE_SR = new Set([
  'SR 1.2', 'SR 1.3', 'SR 1.7', 'SR 2.1', 'SR 2.8',
  'SR 3.2', 'SR 3.4', 'SR 4.1', 'SR 4.3', 'SR 5.1',
  'SR 5.2', 'SR 6.2', 'SR 7.1', 'SR 7.3', 'SR 7.8'
])

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

function gapBadge(slT, slA, present) {
  if (!present) return <span className="text-xs px-1.5 py-0.5 rounded border bg-red-900/20 text-red-400 border-red-800">GAP</span>
  const diff = slT - slA
  if (diff <= 0) return <span className="text-xs px-1.5 py-0.5 rounded border bg-green-900/20 text-green-400 border-green-800">OK</span>
  return <span className="text-xs px-1.5 py-0.5 rounded border bg-yellow-900/20 text-yellow-400 border-yellow-800">GAP Δ{diff}</span>
}

function slApplies(control, slNum) {
  if (slNum >= 1 && control.sl1) return true
  if (slNum >= 2 && control.sl2) return true
  if (slNum >= 3 && control.sl3) return true
  if (slNum >= 4 && control.sl4) return true
  return false
}

export default function WizardStep5_GapAnalysis() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState(null)
  const [zones, setZones] = useState([])
  const [excludedZoneNames, setExcludedZoneNames] = useState([])
  const [controls, setControls] = useState([])
  const [zoneControlsMap, setZoneControlsMap] = useState({}) // keyed by zone_id:control_id
  const [activeZoneId, setActiveZoneId] = useState(null)
  const [showAllSR, setShowAllSR] = useState(false)

  useEffect(() => {
    Promise.all([
      api.getAssessment(id),
      api.getZones(id),
      api.getIecControls(),
      api.getZoneControls({ assessment_id: id }),
    ]).then(([a, z, c, zc]) => {
      setAssessment(a)
      // Separate excluded zones from operational zones
      const excluded = z.filter(zone => zone.excluded_from_assessment)
      const operational = z.filter(zone => !zone.excluded_from_assessment)
      setExcludedZoneNames(excluded.map(zone => zone.name))
      setZones(operational)
      setControls(c)
      // Build lookup map — works fine with empty array []
      const map = {}
      for (const item of (zc || [])) {
        map[`${item.zone_id}:${item.control_id}`] = item
      }
      setZoneControlsMap(map)
      if (operational.length > 0) setActiveZoneId(operational[0].id)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const activeZone = zones.find(z => z.id === activeZoneId)
  const slTNum = activeZone ? (SL_NUM[activeZone.security_level] || 2) : 2

  // Controls applicable for this zone's SL-T, filtered to baseline by default
  const applicableControls = controls.filter(c =>
    slApplies(c, slTNum) && (showAllSR || BASELINE_SR.has(c.sr_code))
  )

  // Group by category
  const byCategory = applicableControls.reduce((acc, c) => {
    const cat = c.category || 'OTHER'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(c)
    return acc
  }, {})

  const handleTogglePresent = useCallback(async (control) => {
    if (!activeZoneId) return
    const key = `${activeZoneId}:${control.id}`
    const existing = zoneControlsMap[key]
    const newPresent = existing ? (existing.present ? 0 : 1) : 1
    const newSlA = newPresent ? slTNum : 0

    const updated = await api.upsertZoneControl({
      zone_id: activeZoneId,
      control_id: control.id,
      applicable: 1,
      present: newPresent,
      sl_achieved: newSlA,
      sl_target: slTNum,
    })
    setZoneControlsMap(prev => ({ ...prev, [key]: updated }))
  }, [activeZoneId, zoneControlsMap, slTNum])

  // Summary stats per zone
  const getZoneSummary = (zone) => {
    const zSlTNum = SL_NUM[zone.security_level] || 1
    const applicable = controls.filter(c =>
      slApplies(c, zSlTNum) && (showAllSR || BASELINE_SR.has(c.sr_code))
    )
    const covered = applicable.filter(c => {
      const zc = zoneControlsMap[`${zone.id}:${c.id}`]
      return zc?.present
    })
    return { total: applicable.length, covered: covered.length }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green" />
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">
        Errore caricamento assessment.
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">IEC 62443 Risk Assessment</h1>
        <p className="text-sm text-gray-400 mt-1">{assessment.name}</p>
      </div>

      <WizardStepper currentStep={5} />

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
        <h2 className="text-base font-semibold text-white mb-1">Gap Analysis — SL-T vs SL-A</h2>
        <p className="text-xs text-gray-500">
          Per ogni zona, verifica quali controlli IEC 62443-3-3 sono implementati (SL-A) rispetto al target (SL-T).
          Spunta i controlli presenti per calcolare il gap residuo.
        </p>
      </div>

      {/* Exclusion banner */}
      {excludedZoneNames.length > 0 && (
        <div className="flex items-start gap-2 bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 mb-4 text-xs text-gray-400">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span>
            La Gap Analysis include solo le zone operative.{' '}
            <strong className="text-gray-300">{excludedZoneNames.join(', ')}</strong>{' '}
            {excludedZoneNames.length === 1 ? 'è esclusa' : 'sono escluse'} (solo inventario asset).
          </span>
        </div>
      )}

      {/* Baseline toggle */}
      <div className="flex items-center justify-end gap-2 mb-3">
        <span className="text-xs text-gray-500">Mostra tutti gli SR IEC 62443-3-3</span>
        <button
          onClick={() => setShowAllSR(v => !v)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${showAllSR ? 'bg-brand-green' : 'bg-gray-600'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${showAllSR ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Zone tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1" role="tablist">
        {zones.map(zone => {
          const { total, covered } = getZoneSummary(zone)
          const pct = total > 0 ? Math.round((covered / total) * 100) : 0
          const isActive = zone.id === activeZoneId
          return (
            <button
              key={zone.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveZoneId(zone.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0
                ${isActive
                  ? 'bg-brand-green text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700'
                }`}
            >
              {zone.name}
              <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${isActive ? 'bg-white/20' : 'bg-gray-700'}`}>
                {covered}/{total}
              </span>
            </button>
          )
        })}
      </div>

      {/* Controls table */}
      {activeZone && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white">{activeZone.name}</span>
              <span className="text-xs px-2 py-0.5 rounded border bg-brand-green/10 text-brand-green border-brand-green/30 font-semibold">
                SL-T: {activeZone.security_level}
              </span>
            </div>
            <span className="text-xs text-gray-500">{applicableControls.length} controlli applicabili</span>
          </div>

          {Object.entries(byCategory).sort().map(([cat, catControls]) => (
            <div key={cat}>
              {/* Category header */}
              <div className="px-5 py-2 bg-gray-800/50 border-b border-gray-800">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {cat} — {CATEGORY_LABELS[cat] || cat}
                </span>
              </div>

              {/* Control rows */}
              {catControls.map(control => {
                const key = `${activeZoneId}:${control.id}`
                const zc = zoneControlsMap[key]
                const present = zc?.present ?? 0
                const slA = zc?.sl_achieved ?? 0

                return (
                  <div
                    key={control.id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={!!present}
                      onChange={() => handleTogglePresent(control)}
                      className="w-4 h-4 rounded accent-brand-green cursor-pointer shrink-0"
                    />
                    <span className="text-xs font-mono text-gray-500 w-16 shrink-0">{control.sr_code}{control.re_code ? ` ${control.re_code}` : ''}</span>
                    <span className="flex-1 text-sm text-gray-200 min-w-0">{control.title}</span>
                    <span className="text-xs text-gray-600 shrink-0 hidden lg:block">SL-A: {slA}</span>
                    <div className="shrink-0">
                      {gapBadge(slTNum, slA, present)}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/assessments/${id}/step/4`)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={() => navigate(`/assessments/${id}/step/6`)}
          className="flex items-center gap-2 px-5 py-2 bg-brand-green hover:opacity-90 text-white rounded-lg text-sm font-medium transition-opacity"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

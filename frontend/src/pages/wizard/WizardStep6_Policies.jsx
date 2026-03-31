import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  Loader2, 
  Target,
  Shield,
  Layers
} from 'lucide-react'
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

export default function WizardStep6_Policies() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState(null)
  const [zones, setZones] = useState([])
  const [controls, setControls] = useState([])
  const [zcMap, setZcMap] = useState({})
  const [policyDrafts, setPolicyDrafts] = useState({})
  const [policiesMap, setPoliciesMap] = useState({}) // zone_id:control_id → policy row
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [generating, setGenerating] = useState({})
  const [finalizing, setFinalizing] = useState({})
  const [activeZoneId, setActiveZoneId] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const [a, z, c, zc, pols] = await Promise.all([
        api.getAssessment(id),
        api.getZones(id),
        api.getIecControls(),
        api.getZoneControls({ assessment_id: id }),
        api.getPolicies(id),
      ])
      
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

      const pmap = {}
      for (const p of (pols || [])) {
        pmap[`${p.zone_id}:${p.control_id}`] = p
      }
      setPoliciesMap(pmap)

      if (z.length > 0 && !activeZoneId) setActiveZoneId(z[0].id)
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [id, activeZoneId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const activeZone = useMemo(() => zones.find(z => z.id === activeZoneId), [zones, activeZoneId])
  const slTNum = activeZone ? (SL_NUM[activeZone.security_level] || 2) : 2

  const gapControls = useMemo(() => {
    if (!activeZone) return []
    return controls.filter(c => {
      if (!slApplies(c, slTNum)) return false
      const zc = zcMap[`${activeZoneId}:${c.id}`]
      return !zc?.present
    })
  }, [controls, slTNum, activeZoneId, zcMap, activeZone])

  const getZoneGapCount = useCallback((zone) => {
    const slT = SL_NUM[zone.security_level] || 1
    return controls.filter(c => {
      if (!slApplies(c, slT)) return false
      return !zcMap[`${zone.id}:${c.id}`]?.present
    }).length
  }, [controls, zcMap])

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

  const handleGenerateAI = useCallback(async (control) => {
    const key = `${activeZoneId}:${control.id}`
    setGenerating(prev => ({ ...prev, [key]: true }))
    try {
      const result = await api.generatePolicy(id, {
        zone_id: activeZoneId,
        control_id: control.id,
        sr_code: control.sr_code,
        title: control.title,
        suc_function: assessment?.suc_function || '',
      })
      
      const generatedText = result.policy_markdown
      setPolicyDrafts(prev => ({ ...prev, [key]: generatedText }))
      
      // Update local state for immediate feedback
      setZcMap(prev => ({
        ...prev,
        [key]: { ...(prev[key] || {}), policy_text: generatedText }
      }))
      
      // Refresh policies to get the new policy entry (for finalization)
      const pols = await api.getPolicies(id)
      const pmap = {}
      for (const p of (pols || [])) pmap[`${p.zone_id}:${p.control_id}`] = p
      setPoliciesMap(pmap)
    } catch (err) {
      alert('Errore generazione AI LM Studio: ' + err.message)
    } finally {
      setGenerating(prev => ({ ...prev, [key]: false }))
    }
  }, [id, activeZoneId, assessment])

  const handleFinalize = useCallback(async (control) => {
    const key = `${activeZoneId}:${control.id}`
    const policy = policiesMap[key]
    if (!policy) return
    
    setFinalizing(prev => ({ ...prev, [key]: true }))
    try {
      const newFinalStatus = policy.final ? 0 : 1
      const updated = await api.patchPolicy(id, policy.id, { final: newFinalStatus })
      setPoliciesMap(prev => ({ ...prev, [key]: updated }))
    } catch (err) {
      alert('Errore finalizzazione: ' + err.message)
    } finally {
      setFinalizing(prev => ({ ...prev, [key]: false }))
    }
  }, [id, activeZoneId, policiesMap])

  const byCategory = useMemo(() => {
    return gapControls.reduce((acc, c) => {
      const cat = c.category || 'OTHER'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(c)
      return acc
    }, {})
  }, [gapControls])

  // Count finalized policies vs total gaps across all zones
  const totalGapsCount = useMemo(() => 
    zones.reduce((sum, z) => sum + getZoneGapCount(z), 0)
  , [zones, getZoneGapCount])

  const finalizedPoliciesCount = useMemo(() => 
    Object.values(policiesMap).filter(p => p.final === 1).length
  , [policiesMap])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black">
        <Loader2 className="w-10 h-10 text-brand-green animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Caricamento policy engine...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-gray-100 pb-20">
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Header Section */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-brand-green/10 rounded-lg">
              <Shield className="w-6 h-6 text-brand-green" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Security Policies Generation
              </h1>
              <p className="text-sm text-gray-500">{assessment?.name || 'Loading...'}</p>
            </div>
          </div>
          <WizardStepper currentStep={6} />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar: Zone List & Global Stats */}
          <aside className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-5 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/5 blur-3xl rounded-full -mr-16 -mt-16" />
              
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                <Target className="w-3 h-3" /> Status Overview
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="block text-2xl font-bold text-white">{finalizedPoliciesCount} / {totalGapsCount}</span>
                    <span className="text-[10px] text-gray-500 uppercase">Policy Finalizzate</span>
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-brand-green/20 flex items-center justify-center text-[10px] font-bold text-brand-green">
                    {totalGapsCount > 0 ? Math.round((finalizedPoliciesCount/totalGapsCount)*100) : 100}%
                  </div>
                </div>
                
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${totalGapsCount > 0 ? (finalizedPoliciesCount/totalGapsCount)*100 : 100}%` }}
                    className="h-full bg-brand-green shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                  />
                </div>
              </div>

              <div className="mt-8 space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Security Zones</h3>
                {zones.map(zone => {
                  const gaps = getZoneGapCount(zone)
                  const isActive = zone.id === activeZoneId
                  return (
                    <button
                      key={zone.id}
                      onClick={() => setActiveZoneId(zone.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${
                        isActive 
                          ? 'bg-brand-green/20 border-brand-green/50 text-white' 
                          : 'bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.color }} />
                        <span className="text-sm font-medium truncate">{zone.name}</span>
                      </div>
                      {gaps > 0 ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isActive ? 'bg-brand-green text-white' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {gaps} GAP
                        </span>
                      ) : (
                        <CheckCircle className="w-4 h-4 text-brand-green" />
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </aside>

          {/* Main Content: Policy Cards */}
          <main className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {activeZone && (
                <motion.div
                  key={activeZoneId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold">{activeZone.name}</h2>
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-[10px] font-bold text-gray-400 border border-white/5 uppercase">
                        {activeZone.security_level}
                      </span>
                    </div>
                    {gapControls.length > 0 && (
                      <span className="text-sm text-gray-500">
                        Mostrando <span className="text-white font-bold">{gapControls.length}</span> vulnerabilità da mitigare
                      </span>
                    )}
                  </div>

                  {gapControls.length === 0 ? (
                    <div className="bg-gray-900/40 border border-white/5 rounded-3xl p-16 flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="w-8 h-8 text-brand-green" />
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-white">Zero Gaps Detected</h3>
                      <p className="text-gray-500 max-w-md">
                        Tutti i controlli previsti per il {activeZone.security_level} sono stati implementati correttamente in questa zona.
                      </p>
                    </div>
                  ) : (
                    Object.entries(byCategory).sort().map(([cat, catControls]) => (
                      <div key={cat} className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                          <Layers className="w-4 h-4 text-gray-500" />
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {cat} — {CATEGORY_LABELS[cat] || cat}
                          </h4>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {catControls.map(control => {
                            const key = `${activeZoneId}:${control.id}`
                            const draft = policyDrafts[key] ?? ''
                            const isSaving = saving[key]
                            const isSaved = saved[key]
                            const isGenerating = generating[key]
                            const isFinalizing = finalizing[key]
                            const policy = policiesMap[key]
                            const isFinal = !!policy?.final

                            return (
                              <motion.div 
                                key={control.id}
                                layout
                                className={`group bg-gray-900/40 backdrop-blur-md border rounded-2xl overflow-hidden transition-all duration-300 ${
                                  isFinal ? 'border-brand-green/30' : 'border-white/5 hover:border-white/10'
                                }`}
                              >
                                <div className="p-5">
                                  {/* Card Header */}
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex gap-4">
                                      <div className={`p-2.5 rounded-xl border ${
                                        isFinal ? 'bg-brand-green/10 border-brand-green/20' : 'bg-red-500/5 border-red-500/10'
                                      }`}>
                                        <Shield className={`w-5 h-5 ${isFinal ? 'text-brand-green' : 'text-red-400'}`} />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="px-1.5 py-0.5 rounded bg-gray-800 text-[10px] font-mono font-bold text-gray-500 border border-white/5 uppercase tracking-tighter">
                                            {control.sr_code}
                                          </span>
                                          {isFinal && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-full border border-brand-green/20">
                                              <CheckCircle className="w-3 h-3" /> FINALIZZATA
                                            </span>
                                          )}
                                        </div>
                                        <h4 className="text-sm font-bold text-white leading-tight">{control.title}</h4>
                                      </div>
                                    </div>
                                    
                                    <button
                                      onClick={() => handleGenerateAI(control)}
                                      disabled={isGenerating}
                                      className="relative flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-900/20"
                                    >
                                      {isGenerating ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Sparkles className="w-4 h-4" />
                                      )}
                                      {isGenerating ? 'GENERAZIONE...' : 'GENERA CON AI ✨'}
                                    </button>
                                  </div>

                                  {/* Policy Textarea */}
                                  <div className="relative">
                                    <textarea
                                      value={draft}
                                      onChange={e => setPolicyDrafts(prev => ({ ...prev, [key]: e.target.value }))}
                                      placeholder={`Nessuna policy generata. Clicca su "Genera con AI" per creare una policy IEC 62443 per ${control.sr_code}...`}
                                      rows={6}
                                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-brand-green/50 focus:ring-1 focus:ring-brand-green/20 transition-all font-mono leading-relaxed"
                                    />
                                    {isGenerating && (
                                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
                                        <div className="flex items-center gap-3 px-6 py-3 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl">
                                          <Loader2 className="w-4 h-4 text-brand-green animate-spin" />
                                          <span className="text-xs font-bold text-white tracking-widest uppercase">Gemini 1.5 sta scrivendo...</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Card Footer */}
                                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-6">
                                      {policy && (
                                        <label className="group/toggle flex items-center gap-3 cursor-pointer select-none">
                                          <div className={`relative w-9 h-5 rounded-full transition-colors ${isFinal ? 'bg-brand-green' : 'bg-gray-800'}`}>
                                            <input
                                              type="checkbox"
                                              className="sr-only"
                                              checked={isFinal}
                                              disabled={isFinalizing}
                                              onChange={() => handleFinalize(control)}
                                            />
                                            <motion.div 
                                              animate={{ x: isFinal ? 18 : 2 }}
                                              className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                                            />
                                          </div>
                                          <span className={`text-[11px] font-bold uppercase tracking-wider ${isFinal ? 'text-brand-green' : 'text-gray-500'}`}>
                                            {isFinalizing ? '...' : 'Finalizza per report'}
                                          </span>
                                        </label>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <AnimatePresence>
                                        {isSaved && (
                                          <motion.span 
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="text-[10px] uppercase font-bold text-brand-green flex items-center gap-1"
                                          >
                                            <CheckCircle className="w-3 h-3" /> Salvato
                                          </motion.span>
                                        )}
                                      </AnimatePresence>
                                      
                                      <button
                                        onClick={() => handleSavePolicy(control)}
                                        disabled={isSaving}
                                        className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                                          isSaving 
                                            ? 'bg-gray-800 text-gray-500' 
                                            : 'bg-white text-black hover:bg-gray-200'
                                        }`}
                                      >
                                        <Save className="w-4 h-4" />
                                        {isSaving ? 'SALVATAGGIO...' : 'SALVA BOZZA'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* Global Footer Controls */}
        <div className="fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl border-t border-white/5 p-6 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <button
              onClick={() => navigate(`/assessments/${id}/step/5`)}
              data-testid="back-button"
              className="group flex items-center gap-2 px-6 py-3 bg-transparent border border-white/10 hover:border-white/20 text-gray-400 hover:text-white rounded-2xl text-sm font-bold transition-all"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
              GAP ANALYSIS
            </button>
            <div className="flex items-center gap-8">
              <div className="hidden sm:block text-right">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-tight">Prossimo Step</p>
                <p className="text-white font-bold leading-tight">Generazione Report</p>
              </div>
              <button
                onClick={() => navigate(`/assessments/${id}/step/7`)}
                data-testid="next-button"
                className="group flex items-center gap-2 px-8 py-3 bg-brand-green hover:bg-brand-green/90 text-white rounded-2xl text-sm font-black transition-all shadow-[0_10px_30px_rgba(34,197,94,0.3)]"
              >
                GENERA REPORT <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

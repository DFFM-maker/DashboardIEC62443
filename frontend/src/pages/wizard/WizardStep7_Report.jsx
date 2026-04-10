import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Download, FileText, CheckCircle, AlertTriangle,
  Shield, FileDown, ExternalLink
} from 'lucide-react'
import { api } from '../../lib/api'
import WizardStepper from '../../components/wizard/WizardStepper'

const RISK_COLORS = {
  LOW:          'text-green-400',
  MEDIUM:       'text-yellow-400',
  HIGH:         'text-orange-400',
  CRITICAL:     'text-red-400',
  CATASTROPHIC: 'text-red-300',
}

const SL_COLORS = {
  'SL-1': 'text-blue-400',
  'SL-2': 'text-green-400',
  'SL-3': 'text-yellow-400',
  'SL-4': 'text-red-400',
}

export default function WizardStep7_Report() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)

  useEffect(() => {
    api.getReport(id)
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])


  const handleOpenHtml = () => {
    window.open(`/api/assessments/${id}/wizard-report/html`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green" />
      </div>
    )
  }

  if (!report) {
    return <div className="flex items-center justify-center h-full text-red-400 text-sm">Errore generazione report.</div>
  }

  const { assessment, suc, risk_events, zones, gap_controls } = report
  const totalGaps = zones.reduce((s, z) => s + z.gap_count, 0)
  const totalControls = zones.reduce((s, z) => s + z.controls_total, 0)
  const totalCovered = zones.reduce((s, z) => s + z.controls_covered, 0)
  const overallPct = totalControls > 0 ? Math.round((totalCovered / totalControls) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">IEC 62443 Risk Assessment</h1>
        <p className="text-sm text-gray-400 mt-1">{assessment.name}</p>
      </div>

      <WizardStepper currentStep={7} />

      {/* Completion message */}
      <div className="bg-green-900/20 border border-green-800/50 rounded-xl p-5 mb-6 flex items-center gap-4">
        <CheckCircle className="w-8 h-8 text-green-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-300">Assessment completato!</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Tutti i 7 step del wizard IEC 62443 sono stati completati. Scarica il report in uno dei formati disponibili.
          </p>
        </div>
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Markdown */}
        <a
          href={`/api/assessments/${id}/wizard-report`}
          className="flex flex-col items-center gap-3 p-6 bg-gray-900 border border-gray-800 hover:border-brand-green rounded-xl text-left transition-colors group"
        >
          <div className="w-10 h-10 bg-gray-800 group-hover:bg-brand-green/20 rounded-lg flex items-center justify-center transition-colors">
            <FileText className="w-5 h-5 text-brand-green" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Scarica Markdown</p>
            <p className="text-xs text-gray-500 mt-1">Report completo .md con tutte le sezioni</p>
          </div>
          <span className="text-xs text-brand-green font-medium flex items-center gap-1">
            <Download className="w-3 h-3" /> .md
          </span>
        </a>

        {/* PDF Wizard */}
        <a
          href={`/api/assessments/${id}/wizard-report/pdf`}
          className="flex flex-col items-center gap-3 p-6 bg-gray-900 border border-gray-800 hover:border-brand-green rounded-xl text-left transition-colors group"
        >
          <div className="w-10 h-10 bg-gray-800 group-hover:bg-brand-green/20 rounded-lg flex items-center justify-center transition-colors">
            <FileDown className="w-5 h-5 text-brand-green" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Scarica PDF Wizard</p>
            <p className="text-xs text-gray-500 mt-1">PDF con SUC, risk, gap analysis, policy</p>
          </div>
          <span className="text-xs text-brand-green font-medium flex items-center gap-1">
            <Download className="w-3 h-3" /> .pdf
          </span>
        </a>

        {/* HTML Report */}
        <a
          href={`/api/assessments/${id}/wizard-report/html`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-3 p-6 bg-gray-900 border border-gray-800 hover:border-brand-green rounded-xl text-left transition-colors group"
        >
          <div className="w-10 h-10 bg-gray-800 group-hover:bg-brand-green/20 rounded-lg flex items-center justify-center transition-colors">
            <ExternalLink className="w-5 h-5 text-brand-green" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Apri Report HTML</p>
            <p className="text-xs text-gray-500 mt-1">Report asset e finding nel browser</p>
          </div>
          <span className="text-xs text-brand-green font-medium flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> apre in nuova tab
          </span>
        </a>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Zone', value: zones.length, color: 'text-blue-400' },
          { label: 'Risk Events', value: risk_events.length, color: 'text-yellow-400' },
          { label: 'Copertura', value: `${overallPct}%`, color: overallPct >= 80 ? 'text-green-400' : 'text-orange-400' },
          { label: 'Gap residui', value: totalGaps, color: totalGaps === 0 ? 'text-green-400' : 'text-red-400' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Report body */}
      <div className="space-y-5">

        {/* 1. SUC */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wide">1. System Under Consideration</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {[
              ['Nome SUC', suc.suc_name],
              ['Funzione', suc.suc_function],
              ['Operatività', suc.machine_operation],
              ['Data Sharing', suc.data_sharing],
              ['Access Points', suc.access_points],
              ['Confine Fisico', suc.physical_boundary],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-gray-500">{label}</dt>
                <dd className="text-gray-200 mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>
          {suc.assumptions && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <dt className="text-xs text-gray-500 mb-1">Assumptions</dt>
              <dd className="text-sm text-gray-300 whitespace-pre-line">{suc.assumptions}</dd>
            </div>
          )}
        </section>

        {/* 2. Risk Events */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">2. Risk Events</h3>
          </div>
          {risk_events.length === 0 ? (
            <p className="text-gray-500 text-sm p-5">Nessun risk event definito.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="text-left px-5 py-2 font-medium">Descrizione</th>
                  <th className="text-center px-3 py-2 font-medium">L</th>
                  <th className="text-center px-3 py-2 font-medium">I</th>
                  <th className="text-center px-3 py-2 font-medium">Score</th>
                  <th className="text-left px-3 py-2 font-medium">Livello</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {risk_events.map(e => (
                  <tr key={e.id}>
                    <td className="px-5 py-3 text-gray-200">{e.risk_description}</td>
                    <td className="text-center px-3 py-3 text-gray-400">{e.likelihood}</td>
                    <td className="text-center px-3 py-3 text-gray-400">{e.safety_impact}</td>
                    <td className="text-center px-3 py-3 font-mono text-white">{e.calculated_risk}</td>
                    <td className={`px-3 py-3 font-semibold text-xs ${RISK_COLORS[e.calculated_risk_label] || 'text-gray-400'}`}>
                      {e.calculated_risk_label}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 3. Zones */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">3. Zone & Security Level Target</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="text-left px-5 py-2 font-medium">Zona</th>
                <th className="text-left px-3 py-2 font-medium">SL-T</th>
                <th className="text-center px-3 py-2 font-medium">Controlli</th>
                <th className="text-center px-3 py-2 font-medium">Copertura</th>
                <th className="text-center px-3 py-2 font-medium">Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {zones.map(z => {
                const pct = z.controls_total > 0 ? Math.round((z.controls_covered / z.controls_total) * 100) : 0
                return (
                  <tr key={z.id}>
                    <td className="px-5 py-3 font-medium text-white">
                      <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-gray-500" />{z.name}</div>
                    </td>
                    <td className={`px-3 py-3 font-bold text-xs ${SL_COLORS[z.security_level] || 'text-gray-400'}`}>
                      {z.security_level}
                    </td>
                    <td className="text-center px-3 py-3 text-gray-400">{z.controls_covered}/{z.controls_total}</td>
                    <td className="text-center px-3 py-3">
                      <span className={`font-semibold ${pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {pct}%
                      </span>
                    </td>
                    <td className="text-center px-3 py-3">
                      {z.gap_count === 0
                        ? <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                        : <span className="text-red-400 font-semibold">{z.gap_count}</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* 4. Gap & Policies */}
        {gap_controls.length > 0 && (
          <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">4. Gap Analysis & Policy</h3>
              <span className="text-xs text-red-400 font-medium">{gap_controls.length} controlli con gap</span>
            </div>
            <div className="divide-y divide-gray-800">
              {gap_controls.map((g, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-500">{g.sr_code}</span>
                    <span className="text-xs text-gray-600">·</span>
                    <span className="text-xs text-gray-500">{g.zone_name}</span>
                    <AlertTriangle className="w-3 h-3 text-red-400 ml-auto" />
                  </div>
                  <p className="text-sm font-medium text-white mb-2">{g.title}</p>
                  {g.policy_text ? (
                    <pre className="text-xs text-gray-400 whitespace-pre-wrap font-sans bg-gray-800 rounded p-3">
                      {g.policy_text}
                    </pre>
                  ) : (
                    <p className="text-xs text-gray-600 italic">Nessuna policy redatta.</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => navigate(`/assessments/${id}/step/6`)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={() => navigate(`/assessments/${id}`)}
          className="flex items-center gap-2 px-5 py-2 bg-brand-green hover:opacity-90 text-white rounded-lg text-sm font-medium transition-opacity"
        >
          <CheckCircle className="w-4 h-4" /> Completa Assessment
        </button>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { api } from '../lib/api'
import { Settings as SettingsIcon, CheckCircle, XCircle } from 'lucide-react'

export default function Settings() {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await fetch('/api/health')
      const j = await r.json()
      if (j.ok) setTestResult({ ok: true, msg: `Backend OK — v${j.version}` })
      else setTestResult({ ok: false, msg: 'Backend non risponde correttamente' })
    } catch (e) {
      setTestResult({ ok: false, msg: `Errore connessione: ${e.message}` })
    }
    finally { setTesting(false) }
  }

  const testCisa = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      await api.refreshAdvisories()
      setTestResult({ ok: true, msg: 'Connessione CISA/NVD OK — refresh avviato in background' })
    } catch (e) {
      setTestResult({ ok: false, msg: `Errore: ${e.message}` })
    }
    finally { setTesting(false) }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-brand-green" /> Impostazioni
        </h1>
        <p className="text-gray-400 text-sm mt-1">Configurazione dashboard Tecnopack OT Security</p>
      </div>

      {/* Info Dashboard */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-white">Informazioni Dashboard</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Versione', value: 'v2.0.0 — IEC 62443' },
            { label: 'Backend URL', value: 'http://172.16.224.250:3001' },
            { label: 'Frontend URL', value: 'http://172.16.224.250:3000' },
            { label: 'Database', value: 'SQLite (ot_dashboard.db)' },
            { label: 'Subnet default', value: '172.16.224.0/20' },
            { label: 'Standard', value: 'IEC 62443-3-3' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-800 rounded p-3">
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="font-mono text-sm text-gray-200">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Logo */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-white">Logo Tecnopack</h2>
        <div className="flex gap-4 items-start">
          <div className="bg-white p-4 rounded-lg">
            <img src="/assets/logo-tecnopack-light.svg" alt="Logo light" className="h-10" />
            <p className="text-xs text-gray-500 mt-1 text-center">Light (report)</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 p-4 rounded-lg">
            <img src="/assets/logo-tecnopack-dark.svg" alt="Logo dark" className="h-10" />
            <p className="text-xs text-gray-500 mt-1 text-center">Dark (sidebar)</p>
          </div>
        </div>
        <p className="text-xs text-gray-500">Logo caricato da: ~/ot-dashboard/assets/</p>
      </div>

      {/* Connectivity Test */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-white">Test Connettività</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={testConnection} disabled={testing} className="btn-secondary">
            Test Backend API
          </button>
          <button onClick={testCisa} disabled={testing} className="btn-secondary">
            Test CISA/NVD
          </button>
        </div>
        {testResult && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${testResult.ok ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
            {testResult.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            {testResult.msg}
          </div>
        )}
      </div>

      {/* Note operative */}
      <div className="card space-y-2">
        <h2 className="font-semibold text-white">Note Operative</h2>
        <ul className="text-sm text-gray-400 space-y-2">
          <li className="flex gap-2"><span className="text-brand-green shrink-0">•</span> La scansione nmap richiede <code className="text-xs bg-gray-800 px-1.5 py-0.5 rounded">sudo</code> — configurato automaticamente in /etc/sudoers.d/</li>
          <li className="flex gap-2"><span className="text-brand-green shrink-0">•</span> Advisory CISA KEV e NVD vengono aggiornati durante ogni scansione</li>
          <li className="flex gap-2"><span className="text-brand-green shrink-0">•</span> I report PDF usano Chromium in modalità headless</li>
          <li className="flex gap-2"><span className="text-brand-green shrink-0">•</span> Il formato .otsa è retrocompatibile dalla versione 2.0</li>
          <li className="flex gap-2"><span className="text-brand-green shrink-0">•</span> Non eseguire mai --script vuln su device OT in produzione</li>
        </ul>
      </div>
    </div>
  )
}

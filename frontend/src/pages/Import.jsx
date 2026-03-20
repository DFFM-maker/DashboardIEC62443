import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Upload, Package, CheckCircle } from 'lucide-react'

export default function ImportPage() {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(null)
  const inputRef = useRef()
  const navigate = useNavigate()

  const handleFile = async (f) => {
    if (!f || !f.name.endsWith('.otsa')) {
      alert('Seleziona un file .otsa valido')
      return
    }
    setFile(f)
    try {
      const text = await f.text()
      const data = JSON.parse(text)
      setPreview({
        name: data.assessment?.name,
        date: data.assessment?.created_at,
        assets: data.assets?.length || 0,
        findings: data.findings?.length || 0,
        subnet: data.assessment?.subnet,
        version: data.version
      })
      const c = await api.getClients()
      setClients(c)
    } catch (e) {
      alert('File non valido: ' + e.message)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    try {
      const result = await api.importAssessment(file, selectedClient || null)
      setDone(result.assessment_id)
    } catch (err) { alert(err.message) }
    finally { setImporting(false) }
  }

  if (done) return (
    <div className="p-6 flex flex-col items-center justify-center h-full gap-4">
      <CheckCircle className="w-16 h-16 text-green-400" />
      <h2 className="text-xl font-bold text-white">Import completato!</h2>
      <button onClick={() => navigate(`/assessments/${done}`)} className="btn-primary">
        Apri Assessment Importato →
      </button>
    </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Upload className="w-6 h-6 text-brand-green" /> Importa Assessment
        </h1>
        <p className="text-gray-400 text-sm mt-1">Importa un assessment esportato da un'altra installazione Tecnopack</p>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          dragOver ? 'border-brand-green bg-brand-green/10' : 'border-gray-700 hover:border-gray-500 bg-gray-900/50'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".otsa" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-lg font-semibold text-gray-300">Trascina il file .otsa qui</p>
        <p className="text-gray-500 text-sm mt-1">o clicca per selezionare</p>
        <p className="text-gray-600 text-xs mt-3">Importa assessment da un'altra installazione Tecnopack OT Security Dashboard</p>
      </div>

      {/* Preview */}
      {preview && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-white">Anteprima file: {file.name}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Nome Assessment', value: preview.name },
              { label: 'Subnet', value: preview.subnet },
              { label: 'Asset', value: preview.assets },
              { label: 'Finding', value: preview.findings },
              { label: 'Data', value: preview.date ? new Date(preview.date).toLocaleDateString('it-IT') : '—' },
              { label: 'Versione formato', value: preview.version },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800 rounded p-3">
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className="font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <label className="label">Associa a cliente esistente (opzionale)</label>
            <select className="input w-full" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
              <option value="">— Crea nuovo cliente / mantieni originale —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <button onClick={handleImport} disabled={importing} className="btn-primary w-full">
            {importing ? 'Importazione...' : 'Importa Assessment'}
          </button>
        </div>
      )}
    </div>
  )
}

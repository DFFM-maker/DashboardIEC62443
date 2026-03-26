import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight, Save } from 'lucide-react'
import { api } from '../../lib/api'
import WizardStepper from '../../components/wizard/WizardStepper'

const SESSION_KEY = (id) => `wizard-${id}-step1`

const FIELDS = [
  {
    key: 'suc_name',
    label: 'Nome SUC',
    placeholder: 'es. Linea di produzione CNC — Area 3',
    type: 'input',
    required: true,
    hint: 'Identificativo univoco del System Under Consideration'
  },
  {
    key: 'suc_function',
    label: 'Funzione del sistema IACS',
    placeholder: 'Descrivi la funzione principale del sistema...',
    type: 'textarea',
    required: true,
    hint: 'Descrivi cosa fa il sistema e quale processo industriale controlla'
  },
  {
    key: 'machine_operation',
    label: 'Operatività della macchina',
    placeholder: 'Come opera la macchina? Cicli di lavoro, modalità operative...',
    type: 'textarea',
    required: false,
    hint: 'Descrive le modalità operative: automatica, manuale, semi-automatica'
  },
  {
    key: 'data_sharing',
    label: 'Data Sharing',
    placeholder: 'Quali dati vengono condivisi e con chi?',
    type: 'textarea',
    required: false,
    hint: 'Dati scambiati con sistemi ERP, MES, cloud o operatori remoti'
  },
  {
    key: 'access_points',
    label: 'Access Points',
    placeholder: 'Punti di accesso: rete, fisico, remoto, wireless...',
    type: 'textarea',
    required: false,
    hint: 'Tutti i canali di accesso al sistema (rete IT, USB, VPN, HMI locale...)'
  },
  {
    key: 'physical_boundary',
    label: 'Confine Fisico del SUC',
    placeholder: 'Definisci il confine fisico: cabinet, sala controllo, impianto...',
    type: 'textarea',
    required: false,
    hint: 'Perimetro fisico del sistema: dove inizia e dove finisce il SUC'
  },
]

export default function WizardStep1_SUC() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [assessment, setAssessment] = useState(null)
  const [form, setForm] = useState({
    suc_name: '', suc_function: '', machine_operation: '',
    data_sharing: '', access_points: '', physical_boundary: ''
  })
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const autoSaveTimer = useRef(null)

  // Carica assessment e ripristina da sessionStorage
  useEffect(() => {
    api.getAssessment(id).then(a => {
      setAssessment(a)
      const saved = sessionStorage.getItem(SESSION_KEY(id))
      if (saved) {
        setForm(prev => ({ ...prev, ...JSON.parse(saved) }))
      } else {
        setForm({
          suc_name: a.suc_name || '',
          suc_function: a.suc_function || '',
          machine_operation: a.machine_operation || '',
          data_sharing: a.data_sharing || '',
          access_points: a.access_points || '',
          physical_boundary: a.physical_boundary || '',
        })
      }
    })
  }, [id])

  const doSave = useCallback(async (data) => {
    setSaving(true)
    try {
      await api.patchAssessment(id, data)
      setSavedAt(new Date())
    } finally {
      setSaving(false)
    }
  }, [id])

  const handleChange = (key, value) => {
    const updated = { ...form, [key]: value }
    setForm(updated)
    // Persisti in sessionStorage immediatamente
    sessionStorage.setItem(SESSION_KEY(id), JSON.stringify(updated))
    // Reset auto-save timer 30s
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => doSave(updated), 30000)
  }

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(autoSaveTimer.current), [])

  const handleNext = async () => {
    clearTimeout(autoSaveTimer.current)
    await doSave(form)
    navigate(`/assessments/${id}/step/2`)
  }

  const isValid = form.suc_name.trim() && form.suc_function.trim()

  if (!assessment) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">
          IEC 62443 Risk Assessment
        </h1>
        <p className="text-sm text-gray-400 mt-1">{assessment.name}</p>
      </div>

      {/* Stepper */}
      <WizardStepper currentStep={1} />

      {/* Card form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-white">
            System Under Consideration (SUC)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Definisci il sistema oggetto dell'assessment. I campi con * sono obbligatori.
          </p>
        </div>

        {FIELDS.map(({ key, label, placeholder, type, required, hint }) => (
          <div key={key}>
            <label
              htmlFor={`field-${key}`}
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              {label} {required && <span className="text-red-400">*</span>}
            </label>
            {type === 'input' ? (
              <input
                id={`field-${key}`}
                type="text"
                value={form[key]}
                onChange={e => handleChange(key, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
              />
            ) : (
              <textarea
                id={`field-${key}`}
                value={form[key]}
                onChange={e => handleChange(key, e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green resize-none"
              />
            )}
            <p className="text-xs text-gray-600 mt-1">{hint}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-xs text-gray-600">
          {saving && <span className="text-yellow-500">Salvataggio...</span>}
          {!saving && savedAt && (
            <span className="text-gray-500">
              Salvato alle {savedAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {!saving && !savedAt && (
            <span className="text-gray-700">Auto-save ogni 30s</span>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => doSave(form)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Salva
          </button>

          <button
            onClick={handleNext}
            disabled={!isValid || saving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-green hover:opacity-90 text-white rounded-lg text-sm font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

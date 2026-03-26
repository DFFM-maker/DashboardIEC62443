import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'

const STEPS = [
  { n: 1, label: 'SUC Definition' },
  { n: 2, label: 'Risk Assessment' },
  { n: 3, label: 'Zone & Conduits' },
  { n: 4, label: 'Tolerable Risk' },
  { n: 5, label: 'Gap Analysis' },
  { n: 6, label: 'Policies' },
  { n: 7, label: 'Report' },
]

export default function WizardStepper({ currentStep }) {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <nav aria-label="Wizard steps" className="w-full mb-8">
      <ol role="list" className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const done = step.n < currentStep
          const active = step.n === currentStep
          const future = step.n > currentStep

          return (
            <li key={step.n} className="flex-1 flex items-center" data-step={step.n}>
              {/* Connettore sinistro */}
              {idx > 0 && (
                <div className={`flex-1 h-0.5 ${done ? 'bg-brand-green' : 'bg-gray-700'}`} />
              )}

              {/* Cerchio step */}
              <button
                onClick={() => done && navigate(`/assessments/${id}/step/${step.n}`)}
                disabled={future}
                className={`
                  relative flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 transition-all
                  ${done ? 'bg-brand-green text-white cursor-pointer hover:opacity-80' : ''}
                  ${active ? 'bg-brand-green text-white ring-2 ring-brand-green ring-offset-2 ring-offset-gray-950' : ''}
                  ${future ? 'bg-gray-800 text-gray-500 cursor-default' : ''}
                `}
                title={step.label}
              >
                {done ? <Check className="w-4 h-4" /> : step.n}
              </button>

              {/* Connettore destro */}
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${done ? 'bg-brand-green' : 'bg-gray-700'}`} />
              )}
            </li>
          )
        })}
      </ol>

      {/* Label step corrente */}
      <div className="mt-3 text-center">
        <span className="text-xs text-gray-500">
          Step {currentStep}/7 —{' '}
          <span className="text-brand-green font-medium">{STEPS[currentStep - 1]?.label}</span>
        </span>
      </div>
    </nav>
  )
}

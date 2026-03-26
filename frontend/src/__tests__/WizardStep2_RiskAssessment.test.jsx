/**
 * TASK 1.2 — TDD: WizardStep2_RiskAssessment
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockGetAssessment = vi.fn()
const mockGetRiskEvents = vi.fn().mockResolvedValue([])
const mockCreateRiskEvent = vi.fn()
const mockUpdateRiskEvent = vi.fn()
const mockDeleteRiskEvent = vi.fn()
const mockPatchAssessment = vi.fn().mockResolvedValue({ id: 'test-id' })

vi.mock('../lib/api', () => ({
  api: {
    getAssessment: mockGetAssessment,
    getRiskEvents: mockGetRiskEvents,
    createRiskEvent: mockCreateRiskEvent,
    updateRiskEvent: mockUpdateRiskEvent,
    deleteRiskEvent: mockDeleteRiskEvent,
    patchAssessment: mockPatchAssessment,
  }
}))

const { default: WizardStep2_RiskAssessment } = await import('../pages/wizard/WizardStep2_RiskAssessment')

const mockAssessment = {
  id: 'test-id',
  name: 'Test Assessment',
  suc_name: 'Linea CNC',
  assumptions: '',
}

function renderStep2(assessment = mockAssessment, riskEvents = []) {
  mockGetAssessment.mockResolvedValue(assessment)
  mockGetRiskEvents.mockResolvedValue(riskEvents)
  return render(
    <MemoryRouter initialEntries={[`/assessments/${assessment.id}/step/2`]}>
      <Routes>
        <Route path="/assessments/:id/step/1" element={<div>Step 1</div>} />
        <Route path="/assessments/:id/step/2" element={<WizardStep2_RiskAssessment />} />
        <Route path="/assessments/:id/step/3" element={<div>Step 3</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('WizardStep2_RiskAssessment — rendering', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('mostra il titolo Risk Assessment', async () => {
    renderStep2()
    await waitFor(() => expect(screen.getByRole('heading', { name: /iec 62443 risk assessment/i })).toBeInTheDocument())
  })

  it('mostra lo stepper con Step 2/7', async () => {
    renderStep2()
    await waitFor(() => expect(screen.getByText(/step 2\/7/i)).toBeInTheDocument())
  })

  it('mostra il campo Assumptions', async () => {
    renderStep2()
    await waitFor(() => expect(screen.getByLabelText(/assumptions/i)).toBeInTheDocument())
  })

  it('mostra il pulsante "Add Risk Event"', async () => {
    renderStep2()
    await waitFor(() => expect(screen.getByRole('button', { name: /add risk event/i })).toBeInTheDocument())
  })

  it('mostra messaggio empty state quando non ci sono risk events', async () => {
    renderStep2()
    await waitFor(() => expect(screen.getByText(/no risk events/i)).toBeInTheDocument())
  })
})

describe('WizardStep2_RiskAssessment — risk events list', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('mostra i risk events esistenti', async () => {
    const events = [
      {
        id: 're-1',
        risk_description: 'Unauthorized remote access',
        likelihood: 3,
        safety_impact: 2,
        calculated_risk: 6,
        calculated_risk_label: 'MEDIUM',
      }
    ]
    renderStep2(mockAssessment, events)
    await waitFor(() => expect(screen.getByText(/unauthorized remote access/i)).toBeInTheDocument())
  })

  it('mostra il risk label per ogni evento', async () => {
    const events = [
      {
        id: 're-1',
        risk_description: 'Test risk',
        likelihood: 5,
        safety_impact: 5,
        calculated_risk: 25,
        calculated_risk_label: 'CATASTROPHIC',
      }
    ]
    renderStep2(mockAssessment, events)
    await waitFor(() => expect(screen.getByText(/catastrophic/i)).toBeInTheDocument())
  })
})

describe('WizardStep2_RiskAssessment — navigazione', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('ha il pulsante Back per tornare allo step 1', async () => {
    renderStep2()
    await waitFor(() => screen.getByText(/step 2\/7/i))
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('ha il pulsante Next per andare allo step 3', async () => {
    renderStep2()
    await waitFor(() => screen.getByText(/step 2\/7/i))
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })
})

describe('WizardStep2_RiskAssessment — assumptions auto-save', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('salva assumptions in sessionStorage', async () => {
    sessionStorage.clear()
    renderStep2()
    await waitFor(() => screen.getByLabelText(/assumptions/i))

    fireEvent.change(screen.getByLabelText(/assumptions/i), {
      target: { value: 'Sistema isolato dalla rete IT' }
    })

    const saved = JSON.parse(sessionStorage.getItem('wizard-test-id-step2') || '{}')
    expect(saved.assumptions).toBe('Sistema isolato dalla rete IT')
  })
})

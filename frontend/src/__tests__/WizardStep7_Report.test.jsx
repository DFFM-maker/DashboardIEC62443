/**
 * TASK 1.7 — TDD: WizardStep7_Report
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockGetReport = vi.fn()

vi.mock('../lib/api', () => ({
  api: { getReport: mockGetReport }
}))

const { default: WizardStep7_Report } = await import('../pages/wizard/WizardStep7_Report')

const mockReport = {
  assessment: { id: 'test-id', name: 'Test Assessment', assessor: 'Mario Rossi', created_at: '2026-03-26' },
  suc: { suc_name: 'Linea CNC', suc_function: 'Controllo processo', assumptions: 'Sistema isolato' },
  risk_events: [
    { id: 're1', risk_description: 'Unauthorized access', calculated_risk: 9, calculated_risk_label: 'MEDIUM', likelihood: 3, safety_impact: 3 },
  ],
  zones: [
    { id: 'z1', name: 'PLC Zone', security_level: 'SL-2', controls_total: 64, controls_covered: 50, gap_count: 14 },
  ],
  gap_controls: [
    { zone_name: 'PLC Zone', sr_code: 'SR 1.1', title: 'Human User Identification', policy_text: 'Implementare MFA' },
  ],
  generated_at: '2026-03-26T12:00:00Z',
}

function renderStep7() {
  mockGetReport.mockResolvedValue(mockReport)
  return render(
    <MemoryRouter initialEntries={['/assessments/test-id/step/7']}>
      <Routes>
        <Route path="/assessments/:id/step/6" element={<div>Step 6</div>} />
        <Route path="/assessments/:id/step/7" element={<WizardStep7_Report />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('WizardStep7_Report — rendering', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mostra Step 7/7 nello stepper', async () => {
    renderStep7()
    await waitFor(() => expect(screen.getByText(/step 7\/7/i)).toBeInTheDocument())
  })

  it('mostra il nome assessment nel report', async () => {
    renderStep7()
    await waitFor(() => expect(screen.getByText('Test Assessment')).toBeInTheDocument())
  })

  it('mostra la sezione SUC', async () => {
    renderStep7()
    await waitFor(() => expect(screen.getByText(/linea cnc/i)).toBeInTheDocument())
  })

  it('mostra la sezione Risk Events con lo scenario', async () => {
    renderStep7()
    await waitFor(() => expect(screen.getByText(/unauthorized access/i)).toBeInTheDocument())
  })

  it('mostra la sezione Zone con SL-T', async () => {
    renderStep7()
    await waitFor(() => expect(screen.getAllByText(/plc zone/i).length).toBeGreaterThan(0))
  })

  it('mostra la sezione Gap Analysis con SR code', async () => {
    renderStep7()
    await waitFor(() => expect(screen.getByText('SR 1.1')).toBeInTheDocument())
  })
})

describe('WizardStep7_Report — export', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mostra pulsante Export Markdown', async () => {
    renderStep7()
    await waitFor(() => screen.getByText(/step 7\/7/i))
    expect(screen.getByRole('button', { name: /markdown/i })).toBeInTheDocument()
  })

  it('mostra pulsante Print / PDF', async () => {
    renderStep7()
    await waitFor(() => screen.getByText(/step 7\/7/i))
    expect(screen.getByRole('button', { name: /print|pdf/i })).toBeInTheDocument()
  })
})

describe('WizardStep7_Report — navigazione', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ha pulsante Back (step 6)', async () => {
    renderStep7()
    await waitFor(() => screen.getByText(/step 7\/7/i))
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })
})

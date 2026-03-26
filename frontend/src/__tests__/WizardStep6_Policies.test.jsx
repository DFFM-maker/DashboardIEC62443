/**
 * TASK 1.6 — TDD: WizardStep6_Policies
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockGetAssessment = vi.fn()
const mockGetZones = vi.fn()
const mockGetIecControls = vi.fn()
const mockGetZoneControls = vi.fn()
const mockUpsertZoneControl = vi.fn()

vi.mock('../lib/api', () => ({
  api: {
    getAssessment: mockGetAssessment,
    getZones: mockGetZones,
    getIecControls: mockGetIecControls,
    getZoneControls: mockGetZoneControls,
    upsertZoneControl: mockUpsertZoneControl,
  }
}))

const { default: WizardStep6_Policies } = await import('../pages/wizard/WizardStep6_Policies')

const mockAssessment = { id: 'test-id', name: 'Test Assessment' }
const mockZones = [
  { id: 'z1', name: 'PLC Zone', security_level: 'SL-2' },
]
const mockControls = [
  { id: 'c1', sr_code: 'SR 1.1', re_code: null, title: 'Human User Identification', sl1: 1, sl2: 1, sl3: 1, sl4: 1, category: 'IAC' },
  { id: 'c2', sr_code: 'SR 2.1', re_code: null, title: 'Authorization Enforcement', sl1: 1, sl2: 1, sl3: 1, sl4: 1, category: 'UC' },
]
// c1 = gap (present=0), c2 = ok (present=1)
const mockZoneControls = [
  { id: 'zc1', zone_id: 'z1', control_id: 'c1', applicable: 1, present: 0, sl_achieved: 0, sl_target: 2, policy_text: '' },
  { id: 'zc2', zone_id: 'z1', control_id: 'c2', applicable: 1, present: 1, sl_achieved: 2, sl_target: 2, policy_text: '' },
]

function renderStep6() {
  mockGetAssessment.mockResolvedValue(mockAssessment)
  mockGetZones.mockResolvedValue(mockZones)
  mockGetIecControls.mockResolvedValue(mockControls)
  mockGetZoneControls.mockResolvedValue(mockZoneControls)
  return render(
    <MemoryRouter initialEntries={['/assessments/test-id/step/6']}>
      <Routes>
        <Route path="/assessments/:id/step/5" element={<div>Step 5</div>} />
        <Route path="/assessments/:id/step/6" element={<WizardStep6_Policies />} />
        <Route path="/assessments/:id/step/7" element={<div>Step 7</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('WizardStep6_Policies — rendering', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mostra Step 6/7 nello stepper', async () => {
    renderStep6()
    await waitFor(() => expect(screen.getByText(/step 6\/7/i)).toBeInTheDocument())
  })

  it('mostra solo i controlli con GAP (present=0)', async () => {
    renderStep6()
    await waitFor(() => expect(screen.getByText(/human user identification/i)).toBeInTheDocument())
    // c2 è present=1, non deve apparire nella lista dei gap
    expect(screen.queryByText(/authorization enforcement/i)).not.toBeInTheDocument()
  })

  it('mostra il codice SR del controllo con gap', async () => {
    renderStep6()
    await waitFor(() => expect(screen.getByText('SR 1.1')).toBeInTheDocument())
  })

  it('mostra una textarea per editare la policy', async () => {
    renderStep6()
    await waitFor(() => screen.getByText(/human user identification/i))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('mostra il contatore gap totale', async () => {
    renderStep6()
    await waitFor(() => expect(screen.getAllByText(/1.*gap|gap.*1/i).length).toBeGreaterThan(0))
  })
})

describe('WizardStep6_Policies — salvataggio policy', () => {
  beforeEach(() => vi.clearAllMocks())

  it('chiama upsertZoneControl con policy_text al salvataggio', async () => {
    mockUpsertZoneControl.mockResolvedValue({ ...mockZoneControls[0], policy_text: 'Implementare MFA' })
    renderStep6()
    await waitFor(() => screen.getByRole('textbox'))

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Implementare MFA' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(mockUpsertZoneControl).toHaveBeenCalledWith(
      expect.objectContaining({ policy_text: 'Implementare MFA' })
    ))
  })
})

describe('WizardStep6_Policies — navigazione', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ha pulsante Back (step 5)', async () => {
    renderStep6()
    await waitFor(() => screen.getByText(/step 6\/7/i))
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('ha pulsante Next / Generate Report (step 7)', async () => {
    renderStep6()
    await waitFor(() => screen.getByText(/step 6\/7/i))
    expect(screen.getByRole('button', { name: /next|report/i })).toBeInTheDocument()
  })
})

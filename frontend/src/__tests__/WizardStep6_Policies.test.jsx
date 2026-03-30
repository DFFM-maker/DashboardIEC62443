/**
 * TASK 1.6 — TDD Update: WizardStep6_Policies with Gemini & Finalization
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import React from 'react'

const mockGetAssessment = vi.fn()
const mockGetZones = vi.fn()
const mockGetIecControls = vi.fn()
const mockGetZoneControls = vi.fn()
const mockUpsertZoneControl = vi.fn()
const mockGeneratePolicy = vi.fn()
const mockGetPolicies = vi.fn()
const mockPatchPolicy = vi.fn()

vi.mock('../lib/api', () => ({
  api: {
    getAssessment: mockGetAssessment,
    getZones: mockGetZones,
    getIecControls: mockGetIecControls,
    getZoneControls: mockGetZoneControls,
    upsertZoneControl: mockUpsertZoneControl,
    generatePolicy: mockGeneratePolicy,
    getPolicies: mockGetPolicies,
    patchPolicy: mockPatchPolicy,
  }
}))

// We need to import the component after the mock
const { default: WizardStep6_Policies } = await import('../pages/wizard/WizardStep6_Policies')

const mockAssessment = { id: 'test-id', name: 'Test Assessment', suc_function: 'Water Treatment' }
const mockZones = [
  { id: 'z1', name: 'PLC Zone', security_level: 'SL-2', color: '#ff0000' },
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
  mockGetPolicies.mockResolvedValue([])
  
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

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
    await waitFor(() => expect(screen.getByText(/1 \/ 1/)).toBeInTheDocument())
  })
})

describe('WizardStep6_Policies — salvataggio policy', () => {
  beforeEach(() => vi.clearAllMocks())

  it('chiama upsertZoneControl con policy_text al salvataggio', async () => {
    mockUpsertZoneControl.mockResolvedValue({ ...mockZoneControls[0], policy_text: 'Implementare MFA' })
    renderStep6()
    await waitFor(() => screen.getByRole('textbox'))

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Implementare MFA' } })
    fireEvent.click(screen.getByRole('button', { name: /salva bozza/i }))

    await waitFor(() => expect(mockUpsertZoneControl).toHaveBeenCalledWith(
      expect.objectContaining({ policy_text: 'Implementare MFA' })
    ))
  })
})

describe('WizardStep6_Policies — AI & Finalizzazione', () => {
  beforeEach(() => vi.clearAllMocks())

  it('chiama generatePolicy quando si clicca su Genera con AI', async () => {
    mockGeneratePolicy.mockResolvedValue({ policy_markdown: 'Policy da Gemini' })
    mockGetPolicies.mockResolvedValue([{ id: 'p1', zone_id: 'z1', control_id: 'c1', final: 0 }])
    
    renderStep6()
    await waitFor(() => screen.getByRole('button', { name: /genera con ai/i }))
    
    fireEvent.click(screen.getByRole('button', { name: /genera con ai/i }))
    
    await waitFor(() => expect(mockGeneratePolicy).toHaveBeenCalledWith(
      'test-id',
      expect.objectContaining({ control_id: 'c1', sr_code: 'SR 1.1' })
    ))
    
    await waitFor(() => expect(screen.getByRole('textbox').value).toBe('Policy da Gemini'))
  })

  it('mostra checkbox finalizza se esiste una policy', async () => {
    mockGetPolicies.mockResolvedValue([{ id: 'p1', zone_id: 'z1', control_id: 'c1', final: 0 }])
    renderStep6()
    await waitFor(() => expect(screen.getByText(/finalizza per report/i)).toBeInTheDocument())
  })

  it('chiama patchPolicy quando si clicca su finalizza', async () => {
    const mockPolicy = { id: 'p1', zone_id: 'z1', control_id: 'c1', final: 0 }
    mockGetPolicies.mockResolvedValue([mockPolicy])
    mockPatchPolicy.mockResolvedValue({ ...mockPolicy, final: 1 })
    
    renderStep6()
    await waitFor(() => screen.getByText(/finalizza per report/i))
    
    fireEvent.click(screen.getByLabelText(/finalizza per report/i))
    
    await waitFor(() => expect(mockPatchPolicy).toHaveBeenCalledWith(
      'test-id',
      'p1',
      { final: 1 }
    ))
  })
})

describe('WizardStep6_Policies — navigazione', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ha pulsante GAP ANALYSIS (torna allo step 5)', async () => {
    renderStep6()
    await waitFor(() => screen.getByText(/step 6\/7/i))
    expect(screen.getByTestId('back-button')).toBeInTheDocument()
  })

  it('ha pulsante GENERA REPORT (va allo step 7)', async () => {
    renderStep6()
    await waitFor(() => screen.getByText(/step 6\/7/i))
    expect(screen.getByTestId('next-button')).toBeInTheDocument()
  })
})

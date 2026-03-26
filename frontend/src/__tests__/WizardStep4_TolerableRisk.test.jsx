/**
 * TASK 1.4 — TDD: WizardStep4_TolerableRisk
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockGetAssessment = vi.fn()
const mockGetZones = vi.fn()
const mockGetRiskEvents = vi.fn().mockResolvedValue([])
const mockUpdateZone = vi.fn()

vi.mock('../lib/api', () => ({
  api: {
    getAssessment: mockGetAssessment,
    getZones: mockGetZones,
    getRiskEvents: mockGetRiskEvents,
    updateZone: mockUpdateZone,
  }
}))

const { default: WizardStep4_TolerableRisk } = await import('../pages/wizard/WizardStep4_TolerableRisk')

const mockAssessment = { id: 'test-id', name: 'Test Assessment', suc_name: 'Linea CNC' }
const mockZones = [
  { id: 'z1', name: 'PLC Zone',  security_level: 'SL-2', assessment_id: 'test-id' },
  { id: 'z2', name: 'HMI Zone',  security_level: 'SL-1', assessment_id: 'test-id' },
  { id: 'z3', name: 'DMZ Zone',  security_level: 'SL-3', assessment_id: 'test-id' },
]

function renderStep4(zones = mockZones) {
  mockGetAssessment.mockResolvedValue(mockAssessment)
  mockGetZones.mockResolvedValue(zones)
  return render(
    <MemoryRouter initialEntries={['/assessments/test-id/step/4']}>
      <Routes>
        <Route path="/assessments/:id/step/3" element={<div>Step 3</div>} />
        <Route path="/assessments/:id/step/4" element={<WizardStep4_TolerableRisk />} />
        <Route path="/assessments/:id/step/5" element={<div>Step 5</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('WizardStep4_TolerableRisk — rendering', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mostra Step 4/7 nello stepper', async () => {
    renderStep4()
    await waitFor(() => expect(screen.getByText(/step 4\/7/i)).toBeInTheDocument())
  })

  it('mostra una riga per ogni zona', async () => {
    renderStep4()
    await waitFor(() => {
      expect(screen.getByText('PLC Zone')).toBeInTheDocument()
      expect(screen.getByText('HMI Zone')).toBeInTheDocument()
      expect(screen.getByText('DMZ Zone')).toBeInTheDocument()
    })
  })

  it('mostra il security level corrente per ogni zona', async () => {
    renderStep4()
    await waitFor(() => {
      expect(screen.getAllByDisplayValue('SL-2').length).toBeGreaterThan(0)
      expect(screen.getAllByDisplayValue('SL-1').length).toBeGreaterThan(0)
    })
  })

  it('mostra empty state se non ci sono zone', async () => {
    renderStep4([])
    await waitFor(() => expect(screen.getByText(/no zones/i)).toBeInTheDocument())
  })
})

describe('WizardStep4_TolerableRisk — modifica SL-T', () => {
  beforeEach(() => vi.clearAllMocks())

  it('chiama updateZone al cambio del security level', async () => {
    mockUpdateZone.mockResolvedValue({ id: 'z1', security_level: 'SL-3' })
    renderStep4()
    await waitFor(() => screen.getByText('PLC Zone'))

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'SL-3' } })

    await waitFor(() => expect(mockUpdateZone).toHaveBeenCalledWith('z1', expect.objectContaining({
      security_level: 'SL-3'
    })))
  })
})

describe('WizardStep4_TolerableRisk — navigazione', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ha pulsante Back (step 3)', async () => {
    renderStep4()
    await waitFor(() => screen.getByText(/step 4\/7/i))
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('ha pulsante Next (step 5)', async () => {
    renderStep4()
    await waitFor(() => screen.getByText(/step 4\/7/i))
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })
})

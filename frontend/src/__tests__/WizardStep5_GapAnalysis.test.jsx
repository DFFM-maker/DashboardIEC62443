/**
 * TASK 1.5 — TDD: WizardStep5_GapAnalysis (Detailed Risk / Gap Analysis)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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

const { default: WizardStep5_GapAnalysis } = await import('../pages/wizard/WizardStep5_GapAnalysis')

const mockAssessment = { id: 'test-id', name: 'Test Assessment' }
const mockZones = [
  { id: 'z1', name: 'PLC Zone', security_level: 'SL-2' },
  { id: 'z2', name: 'HMI Zone', security_level: 'SL-1' },
]
const mockControls = [
  { id: 'c1', sr_code: 'SR 1.1', re_code: null, title: 'Human User Identification and Authentication', sl1: 1, sl2: 1, sl3: 1, sl4: 1, category: 'IAC' },
  { id: 'c2', sr_code: 'SR 1.2', re_code: null, title: 'Software Process and Device Identification', sl1: 1, sl2: 1, sl3: 1, sl4: 1, category: 'IAC' },
  { id: 'c3', sr_code: 'SR 2.1', re_code: null, title: 'Authorization Enforcement', sl1: 1, sl2: 1, sl3: 1, sl4: 1, category: 'UC' },
]
const mockZoneControls = [
  { id: 'zc1', zone_id: 'z1', control_id: 'c1', applicable: 1, present: 1, sl_achieved: 2 },
]

function renderStep5() {
  mockGetAssessment.mockResolvedValue(mockAssessment)
  mockGetZones.mockResolvedValue(mockZones)
  mockGetIecControls.mockResolvedValue(mockControls)
  mockGetZoneControls.mockResolvedValue(mockZoneControls)
  return render(
    <MemoryRouter initialEntries={['/assessments/test-id/step/5']}>
      <Routes>
        <Route path="/assessments/:id/step/4" element={<div>Step 4</div>} />
        <Route path="/assessments/:id/step/5" element={<WizardStep5_GapAnalysis />} />
        <Route path="/assessments/:id/step/6" element={<div>Step 6</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('WizardStep5_GapAnalysis — rendering', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mostra Step 5/7 nello stepper', async () => {
    renderStep5()
    await waitFor(() => expect(screen.getByText(/step 5\/7/i)).toBeInTheDocument())
  })

  it('mostra i tab delle zone', async () => {
    renderStep5()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /plc zone/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /hmi zone/i })).toBeInTheDocument()
    })
  })

  it('mostra la tabella dei controlli per la zona attiva', async () => {
    renderStep5()
    await waitFor(() => expect(screen.getByText(/human user identification/i)).toBeInTheDocument())
  })

  it('mostra il codice SR per ogni controllo', async () => {
    renderStep5()
    await waitFor(() => expect(screen.getByText('SR 1.1')).toBeInTheDocument())
  })

  it('mostra la categoria dei controlli', async () => {
    renderStep5()
    await waitFor(() => expect(screen.getByText(/IAC/)).toBeInTheDocument())
  })
})

describe('WizardStep5_GapAnalysis — gap calculation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mostra SL-T per la zona selezionata', async () => {
    renderStep5()
    await waitFor(() => screen.getAllByText(/plc zone/i))
    expect(screen.getByText(/sl-t.*sl-2|sl-2.*sl-t/i)).toBeInTheDocument()
  })

  it('mostra badge GAP per controlli non completi', async () => {
    renderStep5()
    await waitFor(() => expect(screen.getAllByText(/gap/i).length).toBeGreaterThan(0))
  })
})

describe('WizardStep5_GapAnalysis — interazione controlli', () => {
  beforeEach(() => vi.clearAllMocks())

  it('chiama upsertZoneControl al toggle "Present"', async () => {
    mockUpsertZoneControl.mockResolvedValue({ id: 'zc-new', zone_id: 'z1', control_id: 'c2', present: 1 })
    renderStep5()
    await waitFor(() => screen.getByText('SR 1.2'))

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    await waitFor(() => expect(mockUpsertZoneControl).toHaveBeenCalled())
  })
})

describe('WizardStep5_GapAnalysis — navigazione', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ha pulsante Back (step 4)', async () => {
    renderStep5()
    await waitFor(() => screen.getByText(/step 5\/7/i))
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('ha pulsante Next (step 6)', async () => {
    renderStep5()
    await waitFor(() => screen.getByText(/step 5\/7/i))
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })
})

/**
 * TASK 1.3 — TDD: WizardStep3_ZonesConduits
 *
 * React Flow non è testabile via jsdom (richiede canvas/WebGL), quindi:
 * - il canvas viene mockato
 * - i test coprono: sidebar zone, form aggiunta zona, navigazione, API calls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// Mock React Flow: restituisce solo i children passati come overlay
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }) => <div data-testid="react-flow-canvas">{children}</div>,
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  Panel: ({ children }) => <div data-testid="react-flow-panel">{children}</div>,
  useNodesState: () => [[], vi.fn(), vi.fn()],
  useEdgesState: () => [[], vi.fn(), vi.fn()],
  addEdge: vi.fn((_edge, edges) => edges),
  Handle: () => null,
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
  MarkerType: { ArrowClosed: 'arrowclosed' },
}))

const mockGetAssessment = vi.fn()
const mockGetZones = vi.fn().mockResolvedValue([])
const mockCreateZone = vi.fn()
const mockUpdateZone = vi.fn()
const mockDeleteZone = vi.fn()
const mockGetConduits = vi.fn().mockResolvedValue([])
const mockCreateConduit = vi.fn()
const mockDeleteConduit = vi.fn()

vi.mock('../lib/api', () => ({
  api: {
    getAssessment: mockGetAssessment,
    getZones: mockGetZones,
    createZone: mockCreateZone,
    updateZone: mockUpdateZone,
    deleteZone: mockDeleteZone,
    getConduits: mockGetConduits,
    createConduit: mockCreateConduit,
    deleteConduit: mockDeleteConduit,
  }
}))

const { default: WizardStep3_ZonesConduits } = await import('../pages/wizard/WizardStep3_ZonesConduits')

const mockAssessment = { id: 'test-id', name: 'Test Assessment', suc_name: 'Linea CNC' }

function renderStep3(assessment = mockAssessment, zones = [], conduits = []) {
  mockGetAssessment.mockResolvedValue(assessment)
  mockGetZones.mockResolvedValue(zones)
  mockGetConduits.mockResolvedValue(conduits)
  return render(
    <MemoryRouter initialEntries={[`/assessments/${assessment.id}/step/3`]}>
      <Routes>
        <Route path="/assessments/:id/step/2" element={<div>Step 2</div>} />
        <Route path="/assessments/:id/step/3" element={<WizardStep3_ZonesConduits />} />
        <Route path="/assessments/:id/step/4" element={<div>Step 4</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('WizardStep3_ZonesConduits — rendering', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mostra il canvas React Flow', async () => {
    renderStep3()
    await waitFor(() => expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument())
  })

  it('mostra lo stepper Step 3/7', async () => {
    renderStep3()
    await waitFor(() => expect(screen.getByText(/step 3\/7/i)).toBeInTheDocument())
  })

  it('mostra il pannello laterale con pulsante "Add Zone"', async () => {
    renderStep3()
    await waitFor(() => expect(screen.getByRole('button', { name: /add zone/i })).toBeInTheDocument())
  })

  it('mostra le zone esistenti nella sidebar', async () => {
    const zones = [
      { id: 'z1', name: 'Safety Zone', security_level: 'SL-2', x: 0, y: 0, width: 200, height: 150 },
      { id: 'z2', name: 'Control Zone', security_level: 'SL-3', x: 300, y: 0, width: 200, height: 150 },
    ]
    renderStep3(mockAssessment, zones)
    await waitFor(() => {
      expect(screen.getByText('Safety Zone')).toBeInTheDocument()
      expect(screen.getByText('Control Zone')).toBeInTheDocument()
    })
  })

  it('mostra empty state quando non ci sono zone', async () => {
    renderStep3()
    await waitFor(() => expect(screen.getByText(/no zones/i)).toBeInTheDocument())
  })
})

describe('WizardStep3_ZonesConduits — add zone', () => {
  beforeEach(() => vi.clearAllMocks())

  it('apre il form inline al click su "Add Zone"', async () => {
    renderStep3()
    await waitFor(() => screen.getByRole('button', { name: /add zone/i }))
    fireEvent.click(screen.getByRole('button', { name: /add zone/i }))
    expect(screen.getByPlaceholderText(/zone name/i)).toBeInTheDocument()
  })

  it('chiama createZone con nome e security level', async () => {
    mockCreateZone.mockResolvedValue({ id: 'z-new', name: 'New Zone', security_level: 'SL-2', x: 50, y: 50, width: 200, height: 150 })
    renderStep3()
    await waitFor(() => screen.getByRole('button', { name: /add zone/i }))

    fireEvent.click(screen.getByRole('button', { name: /add zone/i }))
    fireEvent.change(screen.getByPlaceholderText(/zone name/i), { target: { value: 'New Zone' } })
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => expect(mockCreateZone).toHaveBeenCalledWith(expect.objectContaining({
      assessment_id: 'test-id',
      name: 'New Zone',
    })))
  })

  it('non chiama createZone se il nome è vuoto', async () => {
    renderStep3()
    await waitFor(() => screen.getByRole('button', { name: /add zone/i }))
    fireEvent.click(screen.getByRole('button', { name: /add zone/i }))
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))
    expect(mockCreateZone).not.toHaveBeenCalled()
  })
})

describe('WizardStep3_ZonesConduits — navigazione', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ha il pulsante Back (step 2)', async () => {
    renderStep3()
    await waitFor(() => screen.getByText(/step 3\/7/i))
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('ha il pulsante Next (step 4)', async () => {
    renderStep3()
    await waitFor(() => screen.getByText(/step 3\/7/i))
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })
})

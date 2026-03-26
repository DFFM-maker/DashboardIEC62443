/**
 * TASK 1.1 — TDD: WizardStep1_SUC
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// Mock api PRIMA di importare il componente
const mockGetAssessment = vi.fn()
const mockPatchAssessment = vi.fn().mockResolvedValue({ id: 'test-id' })

vi.mock('../lib/api', () => ({
  api: {
    getAssessment: mockGetAssessment,
    patchAssessment: mockPatchAssessment,
  }
}))

// Import DOPO il mock
const { default: WizardStep1_SUC } = await import('../pages/wizard/WizardStep1_SUC')

const mockAssessment = {
  id: 'test-id',
  name: 'Test Assessment',
  suc_name: '',
  suc_function: '',
  machine_operation: '',
  data_sharing: '',
  access_points: '',
  physical_boundary: '',
}

function renderStep1(assessment = mockAssessment) {
  mockGetAssessment.mockResolvedValue(assessment)
  return render(
    <MemoryRouter initialEntries={[`/assessments/${assessment.id}/step/1`]}>
      <Routes>
        <Route path="/assessments/:id/step/1" element={<WizardStep1_SUC />} />
        <Route path="/assessments/:id/step/2" element={<div>Step 2</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('WizardStep1_SUC — form validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('mostra il campo Nome SUC', async () => {
    renderStep1()
    await waitFor(() => expect(screen.getByLabelText(/nome suc/i)).toBeInTheDocument())
  })

  it('il pulsante Next è disabilitato se suc_name è vuoto', async () => {
    renderStep1()
    await waitFor(() => screen.getByLabelText(/nome suc/i))
    const nextBtn = screen.getByRole('button', { name: /next/i })
    expect(nextBtn).toBeDisabled()
  })

  it('il pulsante Next si abilita quando suc_name e suc_function sono compilati', async () => {
    renderStep1()
    await waitFor(() => screen.getByLabelText(/nome suc/i))

    fireEvent.change(screen.getByLabelText(/nome suc/i), {
      target: { value: 'Linea Produzione A' }
    })
    fireEvent.change(screen.getByLabelText(/funzione del sistema/i), {
      target: { value: 'Controllo processo' }
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
    })
  })

  it('mostra tutti e 6 i campi del SUC', async () => {
    renderStep1()
    await waitFor(() => screen.getByLabelText(/nome suc/i))

    expect(screen.getByLabelText(/nome suc/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/funzione del sistema/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/operatività della macchina/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/data sharing/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/access points/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confine fisico/i)).toBeInTheDocument()
  })
})

describe('WizardStep1_SUC — stepper', () => {
  beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear() })

  it('mostra lo stepper con 7 step', async () => {
    renderStep1()
    await waitFor(() => screen.getByLabelText(/nome suc/i))
    const stepItems = screen.getAllByRole('listitem')
    expect(stepItems.length).toBeGreaterThanOrEqual(7)
  })

  it('mostra il testo Step 1/7', async () => {
    renderStep1()
    await waitFor(() => screen.getByText(/step 1\/7/i))
    expect(screen.getByText(/step 1\/7/i)).toBeInTheDocument()
  })
})

describe('WizardStep1_SUC — sessionStorage', () => {
  beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear() })

  it('salva i dati in sessionStorage ad ogni modifica', async () => {
    renderStep1()
    await waitFor(() => screen.getByLabelText(/nome suc/i))

    fireEvent.change(screen.getByLabelText(/nome suc/i), {
      target: { value: 'Test SUC' }
    })

    const saved = JSON.parse(sessionStorage.getItem('wizard-test-id-step1') || '{}')
    expect(saved.suc_name).toBe('Test SUC')
  })
})

describe('WizardStep1_SUC — auto-save', () => {
  beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear() })

  it('chiama patchAssessment dopo 30 secondi (real timer, timeout esteso)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    try {
      renderStep1()
      // Aspetta che il componente carichi senza usare waitFor (usa polling manuale)
      for (let i = 0; i < 20; i++) {
        await act(async () => { await Promise.resolve() })
        if (screen.queryByLabelText(/nome suc/i)) break
      }

      act(() => {
        fireEvent.change(screen.getByLabelText(/nome suc/i), {
          target: { value: 'Auto-save test' }
        })
      })

      // Avanza il timer di 30s
      await act(async () => {
        vi.advanceTimersByTime(30001)
      })

      expect(mockPatchAssessment).toHaveBeenCalledWith('test-id', expect.objectContaining({
        suc_name: 'Auto-save test'
      }))
    } finally {
      vi.useRealTimers()
    }
  }, 10000)
})

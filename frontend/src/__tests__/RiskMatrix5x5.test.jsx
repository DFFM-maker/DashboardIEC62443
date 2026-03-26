/**
 * TASK 1.2 — TDD: RiskMatrix5x5
 * Test del componente matrice di rischio 5x5 IEC 62443.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import RiskMatrix5x5 from '../components/wizard/RiskMatrix5x5'

describe('RiskMatrix5x5 — rendering', () => {
  it('renderizza 25 celle (5x5)', () => {
    const { container } = render(<RiskMatrix5x5 likelihood={1} impact={1} />)
    const cells = container.querySelectorAll('[data-cell]')
    expect(cells.length).toBe(25)
  })

  it('mostra le label degli assi X (Likelihood)', () => {
    render(<RiskMatrix5x5 likelihood={1} impact={1} />)
    expect(screen.getByText(/remote/i)).toBeInTheDocument()
    expect(screen.getByText(/certain/i)).toBeInTheDocument()
  })

  it('mostra le label degli assi Y (Impact)', () => {
    render(<RiskMatrix5x5 likelihood={1} impact={1} />)
    expect(screen.getByText(/trivial/i)).toBeInTheDocument()
    expect(screen.getByText(/critical/i)).toBeInTheDocument()
  })
})

describe('RiskMatrix5x5 — calcolo risk score', () => {
  it('cella (1,1) = score 1 = LOW', () => {
    const { container } = render(<RiskMatrix5x5 likelihood={1} impact={1} />)
    const active = container.querySelector('[data-active="true"]')
    expect(active).not.toBeNull()
    expect(active.dataset.score).toBe('1')
    expect(active.dataset.label).toBe('LOW')
  })

  it('cella (3,3) = score 9 = MEDIUM', () => {
    const { container } = render(<RiskMatrix5x5 likelihood={3} impact={3} />)
    const active = container.querySelector('[data-active="true"]')
    expect(active.dataset.score).toBe('9')
    expect(active.dataset.label).toBe('MEDIUM')
  })

  it('cella (4,3) = score 12 = HIGH (boundary esatto)', () => {
    const { container } = render(<RiskMatrix5x5 likelihood={4} impact={3} />)
    const active = container.querySelector('[data-active="true"]')
    expect(active.dataset.score).toBe('12')
    expect(active.dataset.label).toBe('HIGH')
  })

  it('cella (5,5) = score 25 = CATASTROPHIC', () => {
    const { container } = render(<RiskMatrix5x5 likelihood={5} impact={5} />)
    const active = container.querySelector('[data-active="true"]')
    expect(active.dataset.score).toBe('25')
    expect(active.dataset.label).toBe('CATASTROPHIC')
  })

  it('boundary esatti: score 4 = LOW, score 5 = MEDIUM', () => {
    const { container: c1 } = render(<RiskMatrix5x5 likelihood={4} impact={1} />)
    expect(c1.querySelector('[data-active="true"]').dataset.label).toBe('LOW')

    const { container: c2 } = render(<RiskMatrix5x5 likelihood={5} impact={1} />)
    expect(c2.querySelector('[data-active="true"]').dataset.label).toBe('MEDIUM')
  })

  it('boundary esatti: score 9 = MEDIUM, score 10 = HIGH', () => {
    const { container: c1 } = render(<RiskMatrix5x5 likelihood={3} impact={3} />)
    expect(c1.querySelector('[data-active="true"]').dataset.label).toBe('MEDIUM')

    const { container: c2 } = render(<RiskMatrix5x5 likelihood={2} impact={5} />)
    expect(c2.querySelector('[data-active="true"]').dataset.label).toBe('HIGH')
  })
})

describe('RiskMatrix5x5 — modalità interattiva', () => {
  it('emette onRiskChange al click su una cella', () => {
    const onRiskChange = vi.fn()
    const { container } = render(
      <RiskMatrix5x5 likelihood={1} impact={1} interactive onRiskChange={onRiskChange} />
    )
    const cells = container.querySelectorAll('[data-cell]')
    // Clicca sulla cella (likelihood=3, impact=3) = score 9
    const cell_3_3 = container.querySelector('[data-cell="3-3"]')
    fireEvent.click(cell_3_3)
    expect(onRiskChange).toHaveBeenCalledWith(3, 3, 9, 'MEDIUM')
  })

  it('non emette onRiskChange in modalità display (interactive=false)', () => {
    const onRiskChange = vi.fn()
    const { container } = render(
      <RiskMatrix5x5 likelihood={1} impact={1} interactive={false} onRiskChange={onRiskChange} />
    )
    const cell = container.querySelector('[data-cell="3-3"]')
    fireEvent.click(cell)
    expect(onRiskChange).not.toHaveBeenCalled()
  })
})

describe('RiskMatrix5x5 — legenda', () => {
  it('mostra la legenda con showLegend=true', () => {
    render(<RiskMatrix5x5 likelihood={1} impact={1} showLegend />)
    const legend = screen.getByTestId('risk-legend')
    expect(within(legend).getByText(/low/i)).toBeInTheDocument()
    expect(within(legend).getByText(/medium/i)).toBeInTheDocument()
    expect(within(legend).getByText(/high/i)).toBeInTheDocument()
    expect(within(legend).getByText(/critical/i)).toBeInTheDocument()
    expect(within(legend).getByText(/catastrophic/i)).toBeInTheDocument()
  })

  it('non mostra la legenda con showLegend=false', () => {
    render(<RiskMatrix5x5 likelihood={1} impact={1} showLegend={false} />)
    // CATASTROPHIC appare solo nella legenda, non nelle celle normali
    expect(screen.queryByText(/catastrophic/i)).not.toBeInTheDocument()
  })
})

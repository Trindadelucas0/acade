import { describe, it, expect } from 'vitest'
import { defaultTab, validTab, elapsedLabel, liveOf } from './start.js'

describe('Meus treinos — aba inicial', () => {
  it('prioriza fichas do profissional, depois programa ativo, depois rotinas', () => {
    expect(defaultTab({ plans: 1, active: true, routines: 3 })).toBe('profissionais')
    expect(defaultTab({ active: true, routines: 3 })).toBe('programas')
    expect(defaultTab({ routines: 2 })).toBe('rotinas')
    expect(defaultTab({})).toBe('programas')
  })
  it('valida a aba da URL', () => { expect(validTab('rotinas')).toBe(true); expect(validTab('duplicar')).toBe(false) })
})
describe('retomar treino', () => {
  const now = Date.parse('2026-10-15T12:00:00Z')
  it('tempo decorrido legível', () => {
    expect(elapsedLabel(now - 20000, now)).toBe('começou agora')
    expect(elapsedLabel('2026-10-15T11:35:00Z', now)).toBe('há 25 min')
    expect(elapsedLabel(now - 65 * 60000, now)).toBe('há 1 h 05 min')
    expect(elapsedLabel('x', now)).toBe('')
  })
  it('treino guiado concluído e não salvo vai para o resumo', () => {
    expect(liveOf({ workout_name: 'A', started_at: 'x', finished_at: 'y' }, null).to).toBe('/concluido')
    expect(liveOf({ workout_name: 'A', started_at: 'x' }, { name: 'B' }).to).toBe('/treinar')
    expect(liveOf(null, { name: 'B', start: 1 })).toMatchObject({ kind: 'livre', to: '/workout' })
    expect(liveOf(null, null)).toBe(null)
  })
})

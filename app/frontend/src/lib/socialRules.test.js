import { describe, it, expect } from 'vitest'
import { normHandle, validHandle, cropRect, CARD_FORMATS, fmtDur, fmtVol, initials } from './socialRules.js'
import { cardStats } from './shareCard.js'

describe('V5 - @identificador', () => {
  it('normaliza (sem @, minúsculas, sem espaços)', () => { expect(normHandle(' @Marina.Fit ')).toBe('marina.fit') })
  it('valida formato e reservados', () => {
    expect(validHandle('marina_fit')).toBe(true)
    for (const h of ['ab', '.abc', 'abc.', 'a..b', 'admin', 'Maiusc', 'com espaço', 'x'.repeat(31)]) expect(validHandle(h)).toBe(false)
  })
})
describe('V5 - recorte da foto', () => {
  it('quadrado central sem zoom', () => { expect(cropRect(1000, 500)).toEqual({ sx: 250, sy: 0, side: 500 }) })
  it('zoom reduz a janela e o deslocamento respeita os limites', () => {
    expect(cropRect(1000, 500, 2)).toEqual({ sx: 375, sy: 125, side: 250 })
    const r = cropRect(1000, 500, 2, 5, -5); expect(r.sx + r.side).toBe(1000); expect(r.sy).toBe(0)
  })
  it('iniciais quando não há foto', () => { expect(initials('Marina Souza Lima')).toBe('MS'); expect(initials('')).toBe('?') })
})
describe('V5 - cartões #TáPago', () => {
  it('formatos 1:1, 4:5 e 9:16', () => { expect(CARD_FORMATS['1:1']).toEqual([1080, 1080]); expect(CARD_FORMATS['4:5']).toEqual([1080, 1350]); expect(CARD_FORMATS['9:16']).toEqual([1080, 1920]) })
  it('formata tempo e volume sem inventar', () => {
    expect(fmtDur(2700)).toBe('45 min'); expect(fmtDur(3900)).toBe('1h05'); expect(fmtDur(null)).toBe(null)
    expect(fmtVol(800)).toBe('800 kg'); expect(fmtVol(1250)).toBe('1,3 t'); expect(fmtVol(0)).toBe(null); expect(fmtVol(null)).toBe(null)
  })
  it('indicadores ausentes não aparecem; zero real aparece', () => {
    expect(cardStats('treino', { duration_sec: null, exercises: 5, sets: 12, volume_kg: null })).toEqual([['Exercícios', 5], ['Séries', 12]])
    expect(cardStats('semana', { workouts: 0, minutes: 0, sets: 0 })).toHaveLength(3)
    expect(cardStats('musculos', {})).toEqual([])
  })
})
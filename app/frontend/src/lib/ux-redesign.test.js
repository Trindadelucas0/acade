import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

const src = file => fs.readFileSync(file, 'utf8')

describe('UX 1.10 — próximo passo e registro de treino', () => {
  it('Início apresenta a tarefa do dia antes do progresso semanal', () => {
    const today = src('src/views/guided/Today.jsx')
    expect(today.indexOf('data-testid="today-card"')).toBeLessThan(today.indexOf('data-testid="week-ring"'))
    expect(today.indexOf('<StartHere')).toBeLessThan(today.indexOf('data-testid="week-ring"'))
  })

  it('execução permite edição direta e repetição explícita sem concluir a série', () => {
    const train = src('src/views/guided/Train.jsx')
    expect(train).toMatch(/NumberField value=\{ex\.weight/)
    expect(train).toMatch(/NumberField value=\{ex\.reps/)
    expect(train).toMatch(/data-testid="repeat-previous-set"/)
    const repeat = train.slice(train.indexOf('const repeatPrevious'), train.indexOf('const goNext'))
    expect(repeat).not.toMatch(/done\.push|finishSet/)
  })

  it('Progresso exige dados suficientes antes de desenhar tendência', () => {
    const progress = src('src/views/guided/Progress.jsx')
    expect(progress).toMatch(/enoughForTrend = d\.totals\.n >= 2/)
    expect(progress).toMatch(/data-testid="progress-insufficient"/)
  })
})


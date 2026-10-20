# ORNY — Design system de interface

## Direção

Fitness tecnológico, direto e confiável. A interface usa superfícies neutras e reserva o verde ORNY para ação, foco, progresso e confirmação. Montserrat marca títulos e controles; Inter mantém a leitura contínua.

## Tokens semânticos

| Papel | Token |
| --- | --- |
| Fundo | `--ui-background` |
| Superfície | `--ui-surface` |
| Superfície elevada/controle | `--ui-surface-elevated` |
| Ação principal | `--ui-primary` |
| Ação pressionada | `--ui-primary-pressed` |
| Texto principal/secundário | `--ui-text-primary`, `--ui-text-secondary` |
| Borda | `--ui-border` |
| Sucesso, aviso e erro | `--ui-success`, `--ui-warning`, `--ui-error` |
| Desabilitado e foco | `--ui-disabled`, `--ui-focus` |

Os tokens apontam para os valores de tema já existentes. Isso evita duplicar paletas e mantém claro/escuro compatíveis.

## Hierarquia e densidade

- Base de espaçamento: 4 px; grupos usuais em 8, 12, 16, 24 e 32 px.
- Alvos de toque: mínimo de 44 × 44 px.
- Inputs mobile: mínimo de 16 px para evitar zoom do iOS.
- Um CTA principal por contexto; ações secundárias usam ghost/link.
- Cards apenas para unidades independentes; listas agrupadas para ações relacionadas.
- Números de treino e timers usam algarismos tabulares.

## Componentes governantes

- Controles base: `frontend/src/components/ui.jsx`.
- Feedback global: `Toast`, `DialogHost` e `ErrorBoundary`.
- Sessão: `ResumeBar`, `RestTimer`, estados de recuperação e bloqueio.
- Navegação: barra inferior com cinco destinos por público.
- Estados: loading, vazio, erro, sucesso, bloqueado, pendente e offline devem estar explícitos.

## Padrão da execução

- Exercício e série atual lideram a tela.
- Carga/repetições aceitam digitação e incremento/decremento.
- Valores permanecem no armazenamento local a cada alteração.
- Série anterior pode ser reaplicada, mas nunca é tratada como recomendação clínica.
- Timer de série e descanso nunca aparecem simultaneamente.

## Acessibilidade

- Foco visível por `--ui-focus`.
- Estado nunca depende somente de cor.
- Respeito a `prefers-reduced-motion`.
- Labels acessíveis em campos numéricos e ações por botão semântico.
- Tema claro usa verdes mais escuros para contraste de texto/ação.


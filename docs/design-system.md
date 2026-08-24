# Design System

---

## Paleta de colores

| Rol | Nombre | Hex |
|-----|--------|-----|
| Primary | Terracota | #E0714A |
| Secondary | Verde salvia | #4E7C6B |
| Accent | Mostaza suave | #E8B85A |
| Background | Crema | #FBF7F2 |
| Surface | Fondo de cards | #FFFFFF |
| Text primary | Marrón oscuro casi negro | #2B211C |
| Text secondary | Marrón grisáceo | #7A6D63 |
| Success | Verde | #4E9963 |
| Error | Rojo terracota | #C0503A |
| Warning | Ámbar | #D99A3D |

Paleta cálida y humana a propósito: el tono del producto es cercano y conversacional (el
agente tutea, evita jerga), y los colores acompañan eso en vez de sentirse como un banco
corporativo. Se evita el azul frío típico de fintech.

---

## Tipografía

- **Display / Headings:** Fraunces, serif — le da calidez sin perder seriedad en los títulos.
- **Body:** Inter, sans-serif — legibilidad alta para números y texto largo (entrevista, fichas).
- **Monospace / Code:** no aplica (no hay bloques de código de cara al usuario).

| Nivel | Fuente | Tamaño | Peso |
|-------|--------|--------|------|
| H1 | Fraunces | 32px | 600 |
| H2 | Fraunces | 24px | 600 |
| H3 | Inter | 18px | 600 |
| Body | Inter | 16px | 400 |
| Caption | Inter | 13px | 400 |

---

## Espaciado y grid

- Escala: 4px base (4, 8, 12, 16, 24, 32, 48, 64).
- Grid: 12 columnas en dashboard (desktop-first, el asesor lo usa en escritorio), gutter 24px,
  max-width 1120px.
- La entrevista del cliente es de una sola columna, ancho máximo 640px, centrada — un solo foco
  de atención por pantalla, sin distracciones mientras responde.

---

## Estilo de componentes

- Border radius: 12px en cards y botones, 8px en inputs — esquinas suaves, coherente con el tono
  cálido.
- Sombras: sutiles, solo en cards del dashboard y modales; nunca decorativas.
- Densidad: estándar en la entrevista (una pregunta a la vez, espacio para respirar); compacta en
  la tabla de clientes del dashboard.
- Iconos: Lucide React, tamaño base 20px.
- Números financieros: siempre alineados a la derecha en tablas, formateados con separador de
  miles y símbolo de moneda explícito (ARS/USD) — nunca un número sin su moneda al lado, dado que
  el producto maneja ambas.

---

## Tono visual

Cercano y cálido, coherente con cómo ya habla el agente con el cliente: tuteo, sin tecnicismos,
"en cristiano". El dashboard del asesor puede ser algo más denso e informativo (es una
herramienta de trabajo), pero nunca frío ni corporativo — nada de azul-gris genérico de fintech.
La entrevista del cliente final debe sentirse como una conversación, no como completar un
formulario bancario: una pregunta a la vez, lenguaje simple, feedback inmediato de progreso.

Qué NO debe parecer: un banco tradicional, una app de trading, o un formulario burocrático.

---

## Componentes definidos

<!-- Se completa a medida que se construyen componentes reutilizables durante el desarrollo. -->

---

## Referencias visuales

<!-- Sin referencias externas por ahora — paleta y tono definidos desde cero para este proyecto. -->

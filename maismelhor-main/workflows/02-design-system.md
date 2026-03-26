# 02 — Design System
> **Mais Melhor** · Visual Identity, Tokens, Components & Motion Guide

---

## 🎨 Identidade Visual

**Mais Melhor** transmite: **profissionalidade · agilidade · eficiência · qualidade**

O sistema visual é construído em torno de três pilares:
- **Glassmorphism** — profundidade e modernidade
- **Laranja vibrante** — energia, confiança, ação
- **Motion fluido** — feedback instantâneo, sensação premium

---

## 🎨 Paleta de Cores

```typescript
// tailwind.config.ts — extend colors

const colors = {
  // Brand
  brand: {
    50:  '#FFF5EC',
    100: '#FFE8D0',
    200: '#FFD0A3',
    300: '#FFB06B',
    400: '#FF8C32',
    500: '#FF6B00',   // ← Primary (ajuste aqui quando tiver o hex exato)
    600: '#E05A00',
    700: '#B84A00',
    800: '#8F3A00',
    900: '#6B2C00',
  },

  // Neutrals (warm-tinted para harmonizar com o laranja)
  neutral: {
    0:   '#FFFFFF',
    50:  '#FAFAF9',
    100: '#F5F4F2',
    200: '#ECEAE7',
    300: '#D6D3CE',
    400: '#B0ACA5',
    500: '#8A8580',
    600: '#605C58',
    700: '#3D3A37',
    800: '#252320',
    900: '#141210',
    950: '#0A0908',
  },

  // Semânticas
  success: { DEFAULT: '#22C55E', light: '#DCFCE7', dark: '#15803D' },
  warning: { DEFAULT: '#F59E0B', light: '#FEF3C7', dark: '#B45309' },
  error:   { DEFAULT: '#EF4444', light: '#FEE2E2', dark: '#B91C1C' },
  info:    { DEFAULT: '#3B82F6', light: '#DBEAFE', dark: '#1D4ED8' },
};
```

---

## 🔤 Tipografia

```typescript
// Fonte principal: Inter (moderna, legível, profissional)
// Fonte display: Cal Sans ou Sora (para títulos impactantes)

fontFamily: {
  sans:    ['Inter', 'system-ui', 'sans-serif'],
  display: ['Sora', 'Inter', 'sans-serif'],
  mono:    ['JetBrains Mono', 'monospace'],
},

fontSize: {
  'xs':   ['0.75rem',  { lineHeight: '1rem' }],
  'sm':   ['0.875rem', { lineHeight: '1.25rem' }],
  'base': ['1rem',     { lineHeight: '1.5rem' }],
  'lg':   ['1.125rem', { lineHeight: '1.75rem' }],
  'xl':   ['1.25rem',  { lineHeight: '1.75rem' }],
  '2xl':  ['1.5rem',   { lineHeight: '2rem' }],
  '3xl':  ['1.875rem', { lineHeight: '2.25rem' }],
  '4xl':  ['2.25rem',  { lineHeight: '2.5rem' }],
  '5xl':  ['3rem',     { lineHeight: '1.1' }],
},
```

---

## 🪟 Glassmorphism — Sistema de Tokens

O Glassmorphism do Mais Melhor usa 3 níveis de profundidade:

```css
/* globals.css */

/* ── NÍVEL 1: Cards flutuantes leves ── */
.glass-1 {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);   /* luz no topo */
}

/* ── NÍVEL 2: Modais, painéis principais ── */
.glass-2 {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px) saturate(1.6);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    inset 0 -1px 0 rgba(0, 0, 0, 0.06);       /* sombra interna inferior */
}

/* ── NÍVEL 3: Sidebar, overlays densos ── */
.glass-3 {
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(32px) saturate(1.8);
  -webkit-backdrop-filter: blur(32px) saturate(1.8);
  border: 1px solid rgba(255, 255, 255, 0.24);
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.16),
    0 4px 12px rgba(0, 0, 0, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05); /* rim light */
}

/* ── DARK MODE: glass escuro ── */
.dark .glass-1 {
  background: rgba(20, 18, 16, 0.55);
  border-color: rgba(255, 255, 255, 0.08);
}
.dark .glass-2 {
  background: rgba(20, 18, 16, 0.70);
  border-color: rgba(255, 255, 255, 0.10);
}
.dark .glass-3 {
  background: rgba(20, 18, 16, 0.82);
  border-color: rgba(255, 255, 255, 0.12);
}
```

---

## 🔵 Border Radius & Spacing

```typescript
borderRadius: {
  'none':  '0',
  'sm':    '6px',
  'DEFAULT':'10px',
  'md':    '12px',
  'lg':    '16px',
  'xl':    '20px',
  '2xl':   '24px',
  '3xl':   '32px',
  'full':  '9999px',
},

// Spacing scale: base 4px
spacing: {
  // usa o padrão do Tailwind (4px base), customizações:
  '18': '4.5rem',
  '22': '5.5rem',
  '88': '22rem',
  '112': '28rem',
  '128': '32rem',
},
```

---

## 🌟 Efeito de Luz nas Bordas (Edge Glow)

```css
/* Efeito de brilho laranja nas bordas — para cards de destaque */
.glow-brand {
  box-shadow:
    0 0 0 1px rgba(255, 107, 0, 0.3),
    0 0 16px rgba(255, 107, 0, 0.15),
    0 0 32px rgba(255, 107, 0, 0.08);
}

.glow-brand:hover {
  box-shadow:
    0 0 0 1px rgba(255, 107, 0, 0.5),
    0 0 24px rgba(255, 107, 0, 0.25),
    0 0 48px rgba(255, 107, 0, 0.12);
  transition: box-shadow 0.3s ease;
}

/* Linha de luz superior (highlight) */
.highlight-top::before {
  content: '';
  position: absolute;
  top: 0; left: 10%; right: 10%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.6) 50%,
    transparent
  );
}
```

---

## 🎬 Motion System (Framer Motion)

### Variantes Reutilizáveis

```typescript
// src/lib/motion/variants.ts

export const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }
  },
};

export const fadeInScale = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] } // spring-like
  },
};

export const slideFromRight = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  },
};

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  },
};

export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.015, y: -2,
    transition: { duration: 0.25, ease: 'easeOut' }
  },
};
```

### Componente: AnimatedCard

```tsx
// src/components/ui/AnimatedCard.tsx
import { motion } from 'framer-motion';
import { fadeInScale, cardHover } from '@/lib/motion/variants';

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number;
  glass?: 1 | 2 | 3;
}

export function AnimatedCard({ children, delay = 0, glass = 1, className, ...props }: AnimatedCardProps) {
  return (
    <motion.div
      variants={fadeInScale}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      transition={{ delay }}
      className={cn(`glass-${glass} rounded-2xl p-6 relative overflow-hidden highlight-top`, className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

### Page Transitions

```tsx
// src/components/layout/PageTransition.tsx
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.25 } },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## 🧩 Componentes Base

### Button System

```tsx
// Variantes: primary | secondary | ghost | danger
// Tamanhos: sm | md | lg

const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:   'bg-brand-500 text-white hover:bg-brand-600 active:scale-95 shadow-lg shadow-brand-500/25',
        secondary: 'glass-1 text-neutral-700 dark:text-neutral-200 hover:glass-2 border border-neutral-200/50',
        ghost:     'hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 text-neutral-600',
        danger:    'bg-error text-white hover:bg-error/90 shadow-lg shadow-error/25',
      },
      size: {
        sm: 'h-8 px-3 text-sm gap-1.5',
        md: 'h-10 px-4 text-sm gap-2',
        lg: 'h-12 px-6 text-base gap-2.5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);
```

### Input System

```tsx
const inputVariants = cva(
  'w-full rounded-xl border bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm px-4 transition-all duration-200',
  {
    variants: {
      state: {
        default: 'border-neutral-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
        error:   'border-error focus:border-error focus:ring-2 focus:ring-error/20',
        success: 'border-success focus:border-success focus:ring-2 focus:ring-success/20',
      },
      size: {
        sm: 'h-9 text-sm',
        md: 'h-11 text-sm',
        lg: 'h-13 text-base',
      },
    },
    defaultVariants: { state: 'default', size: 'md' },
  }
);
```

---

## 📊 Dashboard — Estilo Visual

```
Background: gradient sutil de neutral-50 para neutral-100 (light)
            ou neutral-950 para neutral-900 (dark)

Cards KPI:  glass-2, glow-brand no hover, ícone com fundo brand-500/15
Sidebar:    glass-3, largura 240px, nav items com transição suave
Charts:     cores brand-500, success, info — sem bordas, apenas fills suaves
Tables:     rows com hover glass-1, header neutral-100/50
```

---

## 🌙 Dark Mode

```typescript
// Estratégia: class-based (recomendado para SSR)
// tailwind.config.ts
darkMode: 'class',

// Aplicar no <html>:
// <html class="dark"> ou <html>
// Controlado via ui.store.ts (Zustand)
```

---

## ♿ Acessibilidade

- Todos os componentes interativos com `focus-visible` visível
- Contraste mínimo WCAG AA (4.5:1) para textos
- `aria-label` obrigatório em ícones sem texto
- `prefers-reduced-motion`: desativar animações complexas
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

---

## 📦 Dependências de Design

```json
{
  "framer-motion": "^11.x",
  "tailwind-merge": "^2.x",
  "class-variance-authority": "^0.7.x",
  "clsx": "^2.x",
  "@radix-ui/react-*": "via shadcn",
  "lucide-react": "^0.400.x"
}
```

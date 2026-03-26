# 01 — Project Setup & Architecture
> **Mais Melhor** · Stack Configuration, Structure & Scalability Guide

---

## 🧭 Vision

Sistema SaaS multi-tenant para empresas locais. Estrutura pensada para escalar do Supabase (MVP) até infraestrutura própria (AWS/GCP) sem reescrever lógica de negócio. Separação clara entre camadas: UI, lógica, dados e infra.

---

## 🏗️ Tech Stack

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | Astro 4+ | Islands architecture, SSR/SSG híbrido, performance |
| UI Components | React 18 | Componentes interativos dentro das islands |
| Component Library | shadcn/ui | Headless, customizável, sem lock-in |
| State Management | Zustand | Leve, sem boilerplate, fácil de testar |
| Form Management | React Hook Form + Zod | Performance + validação type-safe |
| Animations | Framer Motion | Animações fluidas, gestos, layout animations |
| Styling | Tailwind CSS v3 | Utility-first, design system via tokens |
| Database | Supabase (PostgreSQL) | Auth, RLS, Realtime, Edge Functions prontas |
| ORM / Query | Drizzle ORM | Type-safe, migration-friendly, agnóstico de DB |
| Auth | Supabase Auth | JWT + Row Level Security |
| Storage | Supabase Storage | CDN integrado, migração futura para S3 |
| Deploy | Vercel / Cloudflare Pages | Edge deployment, CI/CD |

---

## 📁 Estrutura de Pastas

```
mais-melhor/
├── src/
│   ├── components/          # Componentes React reutilizáveis
│   │   ├── ui/              # shadcn/ui base (button, input, card...)
│   │   ├── layout/          # Header, Sidebar, Footer
│   │   ├── dashboard/       # Widgets, charts, KPIs
│   │   └── shared/          # Componentes cross-domain
│   │
│   ├── pages/               # Astro pages (file-based routing)
│   │   ├── index.astro      # Landing page
│   │   ├── auth/
│   │   │   ├── login.astro
│   │   │   └── register.astro
│   │   ├── dashboard/
│   │   │   ├── vendor/      # Área do vendedor/empresa
│   │   │   └── client/      # Área do cliente
│   │   └── admin/           # Painel administrativo
│   │
│   ├── layouts/             # Astro layouts base
│   │   ├── BaseLayout.astro
│   │   ├── AuthLayout.astro
│   │   └── DashboardLayout.astro
│   │
│   ├── lib/                 # Core business logic (framework-agnostic)
│   │   ├── db/
│   │   │   ├── schema.ts    # Drizzle schema definitions
│   │   │   ├── migrations/  # SQL migrations versionadas
│   │   │   └── queries/     # Query functions organizadas por domínio
│   │   ├── auth/
│   │   │   ├── session.ts
│   │   │   └── permissions.ts
│   │   ├── plans/
│   │   │   └── plans.config.ts
│   │   └── utils/           # Helpers puros (sem side effects)
│   │
│   ├── services/            # Integrações externas (API calls, Supabase)
│   │   ├── supabase/
│   │   │   ├── client.ts    # Singleton do cliente Supabase
│   │   │   └── server.ts    # Client para SSR (cookies)
│   │   ├── storage.service.ts
│   │   └── email.service.ts
│   │
│   ├── stores/              # Zustand stores
│   │   ├── auth.store.ts
│   │   ├── vendor.store.ts
│   │   └── ui.store.ts
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useVendor.ts
│   │   └── useDebounce.ts
│   │
│   ├── types/               # TypeScript types & interfaces
│   │   ├── database.types.ts  # Auto-gerado pelo Supabase CLI
│   │   ├── domain.types.ts    # Tipos de negócio
│   │   └── api.types.ts
│   │
│   └── constants/           # Enums, configs estáticas
│       ├── plans.ts
│       ├── routes.ts
│       └── permissions.ts
│
├── public/                  # Assets estáticos
│   ├── fonts/
│   └── images/
│
├── drizzle/                 # Drizzle config + migrations
│   ├── drizzle.config.ts
│   └── migrations/
│
├── .env                     # Variáveis de ambiente (nunca no git)
├── .env.example             # Template das variáveis
├── astro.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🗄️ Database Schema (Drizzle + PostgreSQL)

```typescript
// src/lib/db/schema.ts

// --- PLANOS ---
export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull(), // 'basic' | 'pro' | 'business'
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  maxProducts: integer('max_products').notNull(),
  maxOrders: integer('max_orders'),         // null = ilimitado
  hasDelivery: boolean('has_delivery').default(false),
  hasAnalytics: boolean('has_analytics').default(false),
  hasCustomDomain: boolean('has_custom_domain').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- EMPRESAS / VENDORS ---
export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  planId: uuid('plan_id').references(() => plans.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  logoUrl: text('logo_url'),
  phone: varchar('phone', { length: 20 }),
  address: jsonb('address'),               // { street, city, state, zip }
  isActive: boolean('is_active').default(true),
  planExpiresAt: timestamp('plan_expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// --- USUÁRIOS (estende Supabase Auth) ---
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),             // mesmo ID do auth.users
  role: varchar('role', { length: 20 }).notNull(), // 'admin' | 'vendor' | 'client' | 'delivery'
  fullName: varchar('full_name', { length: 100 }),
  avatarUrl: text('avatar_url'),
  phone: varchar('phone', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- PRODUTOS ---
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').references(() => vendors.id).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  imageUrl: text('image_url'),
  categoryId: uuid('category_id').references(() => categories.id),
  stock: integer('stock').default(0),
  isAvailable: boolean('is_available').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- PEDIDOS ---
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => profiles.id).notNull(),
  vendorId: uuid('vendor_id').references(() => vendors.id).notNull(),
  status: varchar('status', { length: 30 }).notNull(), // 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'done' | 'cancelled'
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  deliveryAddress: jsonb('delivery_address'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

---

## 🔐 Autenticação & Autorização

### Fluxo de Auth
```
User → Supabase Auth (email/password ou OAuth)
     → JWT token armazenado em cookie httpOnly
     → Middleware Astro valida token em cada request SSR
     → RLS no Postgres garante isolamento de dados por tenant
```

### Middleware Astro
```typescript
// src/middleware.ts
export const onRequest = defineMiddleware(async ({ locals, request, redirect }, next) => {
  const supabase = createServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  locals.user = user;
  locals.supabase = supabase;

  const protectedRoutes = ['/dashboard', '/admin'];
  const isProtected = protectedRoutes.some(r => request.url.includes(r));

  if (isProtected && !user) return redirect('/auth/login');

  return next();
});
```

### Row Level Security (RLS)
```sql
-- Vendors só veem seus próprios dados
CREATE POLICY "vendors_own_data" ON products
  FOR ALL USING (
    vendor_id = (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

-- Clientes só veem seus próprios pedidos
CREATE POLICY "clients_own_orders" ON orders
  FOR ALL USING (client_id = auth.uid());
```

---

## 💳 Planos

```typescript
// src/constants/plans.ts
export const PLANS = {
  basic: {
    id: 'basic',
    label: 'Básico',
    price: 49.90,
    maxProducts: 30,
    maxOrders: 100,
    features: ['Cardápio digital', 'Pedidos online', 'Suporte básico'],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    price: 99.90,
    maxProducts: 200,
    maxOrders: null,
    features: ['Tudo do Básico', 'Analytics', 'Promoções', 'Suporte prioritário'],
  },
  business: {
    id: 'business',
    label: 'Business',
    price: 199.90,
    maxProducts: null,
    maxOrders: null,
    features: ['Tudo do Pro', 'Sistema de entrega', 'Domínio próprio', 'API access'],
  },
} as const;
```

---

## 🔄 Estratégia de Migração (Supabase → AWS)

A abstração via Drizzle ORM e a camada `services/` garante que a migração seja cirúrgica:

| O que muda | O que NÃO muda |
|---|---|
| `services/supabase/client.ts` → novo adapter | Toda lógica de negócio em `lib/` |
| Connection string no `.env` | Schema Drizzle (100% portável) |
| RLS policies → IAM/middleware | Queries, tipos, stores, UI |
| Supabase Auth → Cognito/Auth.js | Fluxo de autenticação na UI |

**Regra:** Nunca chame Supabase diretamente em componentes. Sempre via `services/` ou `hooks/`.

---

## ⚙️ Variáveis de Ambiente

```bash
# .env.example
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # apenas server-side
DATABASE_URL=postgresql://...       # Drizzle direct connection
APP_URL=https://maismelhor.com.br
```

---

## 🚀 Scripts de Desenvolvimento

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "types:supabase": "supabase gen types typescript --local > src/types/database.types.ts",
    "lint": "eslint src --ext .ts,.tsx,.astro",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## ✅ Checklist de Setup

- [ ] Inicializar projeto Astro com `--template minimal`
- [ ] Adicionar integração React: `astro add react`
- [ ] Instalar e configurar Tailwind: `astro add tailwind`
- [ ] Configurar shadcn/ui com tema customizado
- [ ] Instalar Zustand, RHF + Zod, Framer Motion
- [ ] Configurar Drizzle ORM + Supabase client
- [ ] Criar schema inicial + primeira migration
- [ ] Configurar middleware de autenticação
- [ ] Setup CI/CD com GitHub Actions
- [ ] Configurar variáveis de ambiente por ambiente (dev/staging/prod)

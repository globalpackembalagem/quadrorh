# 03 — Clean Code Rules
> **Mais Melhor** · Standards for Performance, Maintainability & Scalability

---

## 🧠 Filosofia Central

> "Código é lido 10x mais do que é escrito. Escreva para o próximo dev — que provavelmente será você em 3 meses."

Três princípios guiam tudo aqui:
1. **Funções fazem UMA coisa** — e fazem bem feito
2. **Nomes dizem a intenção** — não o mecanismo
3. **Camadas não se misturam** — UI não chama banco, banco não conhece UI

---

## 📏 Regras de Nomenclatura

### Variáveis e Funções
```typescript
// ❌ Evitar
const d = new Date();
const x = users.filter(u => u.a === true);
function proc(data: any) { ... }

// ✅ Correto
const currentDate = new Date();
const activeUsers = users.filter(user => user.isActive);
function processVendorRegistration(vendorData: VendorInput) { ... }
```

### Booleanos — sempre com prefixo semântico
```typescript
// ❌
const vendor = true;
const check = false;

// ✅
const isVendorActive = true;
const hasDeliveryEnabled = false;
const canAccessAnalytics = plan === 'pro' || plan === 'business';
```

### Funções assíncronas — deixar claro o que retorna
```typescript
// ❌
async function vendor(id: string) { ... }

// ✅
async function fetchVendorById(id: string): Promise<Vendor | null> { ... }
async function createOrder(input: OrderInput): Promise<Order> { ... }
```

---

## 🔧 Funções: Regras Absolutas

### 1. Uma função = uma responsabilidade

```typescript
// ❌ Faz tudo junto: valida, transforma e salva
async function registerVendor(data: any) {
  if (!data.name || data.name.length < 3) throw new Error('Nome inválido');
  if (!data.email.includes('@')) throw new Error('Email inválido');
  const slug = data.name.toLowerCase().replace(/ /g, '-');
  const plan = await db.query.plans.findFirst({ where: eq(plans.name, 'basic') });
  return await db.insert(vendors).values({ ...data, slug, planId: plan.id });
}

// ✅ Separado por responsabilidade
const vendorSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
});

function buildVendorSlug(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function getDefaultPlanId(): Promise<string> {
  const plan = await db.query.plans.findFirst({ where: eq(plans.name, 'basic') });
  if (!plan) throw new Error('Default plan not found');
  return plan.id;
}

async function createVendor(input: VendorInput): Promise<Vendor> {
  const validated = vendorSchema.parse(input);
  const slug = buildVendorSlug(validated.name);
  const planId = await getDefaultPlanId();
  const [vendor] = await db.insert(vendors).values({ ...validated, slug, planId }).returning();
  return vendor;
}
```

### 2. Máximo 3 parâmetros — use objetos além disso

```typescript
// ❌
function sendNotification(userId: string, type: string, message: string, channel: string, priority: number) { ... }

// ✅
interface NotificationPayload {
  userId: string;
  type: NotificationType;
  message: string;
  channel: 'email' | 'push' | 'sms';
  priority?: 'low' | 'normal' | 'high';
}
function sendNotification(payload: NotificationPayload): Promise<void> { ... }
```

### 3. Early return — elimine o aninhamento

```typescript
// ❌ Pyramid of doom
async function getVendorDashboard(userId: string) {
  const user = await getUser(userId);
  if (user) {
    const vendor = await getVendorByUserId(userId);
    if (vendor) {
      if (vendor.isActive) {
        const orders = await getOrdersByVendor(vendor.id);
        return { vendor, orders };
      } else {
        return { error: 'Vendor inactive' };
      }
    } else {
      return { error: 'Vendor not found' };
    }
  } else {
    return { error: 'User not found' };
  }
}

// ✅ Flat e legível
async function getVendorDashboard(userId: string) {
  const user = await getUser(userId);
  if (!user) return { error: 'User not found' };

  const vendor = await getVendorByUserId(userId);
  if (!vendor) return { error: 'Vendor not found' };
  if (!vendor.isActive) return { error: 'Vendor inactive' };

  const orders = await getOrdersByVendor(vendor.id);
  return { vendor, orders };
}
```

### 4. Sem flags booleanas como parâmetro de controle de fluxo

```typescript
// ❌ O parâmetro booleno controla comportamento completamente diferente
function getProducts(vendorId: string, includeInactive: boolean) {
  if (includeInactive) {
    return db.query.products.findMany({ where: eq(products.vendorId, vendorId) });
  }
  return db.query.products.findMany({
    where: and(eq(products.vendorId, vendorId), eq(products.isAvailable, true))
  });
}

// ✅ Duas funções claras
function getActiveProducts(vendorId: string) {
  return db.query.products.findMany({
    where: and(eq(products.vendorId, vendorId), eq(products.isAvailable, true))
  });
}

function getAllProducts(vendorId: string) {
  return db.query.products.findMany({ where: eq(products.vendorId, vendorId) });
}
```

---

## 🏛️ Arquitetura em Camadas — Nunca Pule Camadas

```
UI (components/) 
  → Hooks (hooks/) 
    → Services (services/) 
      → DB Queries (lib/db/queries/)
        → Database
```

```typescript
// ❌ Componente acessando banco direto
function ProductCard({ productId }: { productId: string }) {
  const [product, setProduct] = useState(null);
  useEffect(() => {
    supabase.from('products').select('*').eq('id', productId).then(...)
  }, []);
}

// ✅ Componente usa hook, hook usa service
function ProductCard({ productId }: { productId: string }) {
  const { product, isLoading } = useProduct(productId);
  // ...
}

// hooks/useProduct.ts
function useProduct(id: string) {
  return useQuery({ queryKey: ['product', id], queryFn: () => productService.findById(id) });
}

// services/product.service.ts
const productService = {
  findById: (id: string) => getProductById(id), // função de lib/db/queries/
};
```

---

## 🧹 Sem Código Morto

```typescript
// Regras:
// 1. Nunca comentar código — use git para histórico
// 2. Nunca deixar console.log em produção
// 3. Nunca imports não usados
// 4. TODOs devem ter ticket/issue: // TODO: [MM-123] - Implementar paginação

// ESLint rules obrigatórias:
// "no-unused-vars": "error"
// "no-console": "warn"
// "no-dead-code": via TypeScript strict mode
```

---

## 🎯 TypeScript: Regras Rígidas

```typescript
// tsconfig.json — strict mode SEMPRE
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}

// ❌ Nunca usar 'any'
function processData(data: any) { ... }

// ✅ Tipar corretamente ou usar unknown com narrowing
function processData(data: unknown) {
  if (!isVendorData(data)) throw new Error('Invalid data shape');
  // data é VendorData aqui
}

// Type Guards ao invés de casting
function isVendorData(data: unknown): data is VendorData {
  return typeof data === 'object' && data !== null && 'name' in data && 'email' in data;
}
```

---

## ✅ Validação com Zod — Única fonte de verdade

```typescript
// O schema Zod É o tipo — não duplicar
const createOrderSchema = z.object({
  vendorId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(100),
  })).min(1).max(50),
  deliveryAddress: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    zipCode: z.string().regex(/^\d{5}-?\d{3}$/),
  }).optional(),
  notes: z.string().max(500).optional(),
});

// O tipo vem do schema — nunca definir interface separada para inputs
type CreateOrderInput = z.infer<typeof createOrderSchema>;
```

---

## 🔄 Tratamento de Erros — Consistente e Tipado

```typescript
// src/lib/errors.ts — erros de negócio centralizados
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with id ${id} not found`, 404);
  }
}

export class PlanLimitError extends AppError {
  constructor(limit: string) {
    super('PLAN_LIMIT', `Seu plano não permite: ${limit}`, 403);
  }
}

// Uso em services:
async function addProduct(vendorId: string, data: ProductInput): Promise<Product> {
  const vendor = await getVendorById(vendorId);
  if (!vendor) throw new NotFoundError('Vendor', vendorId);

  const productCount = await countProductsByVendor(vendorId);
  const plan = PLANS[vendor.planName];

  if (plan.maxProducts !== null && productCount >= plan.maxProducts) {
    throw new PlanLimitError(`mais de ${plan.maxProducts} produtos`);
  }

  return createProduct({ ...data, vendorId });
}
```

---

## 🗂️ Zustand — Stores Focadas

```typescript
// ❌ Uma store gigante para tudo
const useStore = create(set => ({
  user: null, vendor: null, products: [], orders: [],
  cart: [], ui: { sidebarOpen: false, theme: 'light' },
  // 50 funções aqui...
}));

// ✅ Stores separadas por domínio
// stores/auth.store.ts — apenas auth
// stores/vendor.store.ts — estado do vendor logado
// stores/ui.store.ts — estado da UI (sidebar, modal, theme)

// stores/ui.store.ts
interface UIState {
  isSidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  theme: 'light',
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
  setTheme: (theme) => set({ theme }),
}));
```

---

## 📝 React Hook Form — Padrão de Forms

```typescript
// Padrão para todos os formulários do sistema
function VendorRegistrationForm() {
  const form = useForm<CreateVendorInput>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: { name: '', email: '', phone: '' },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await vendorService.create(data);
      toast.success('Empresa cadastrada com sucesso!');
    } catch (error) {
      if (error instanceof AppError) {
        form.setError('root', { message: error.message });
      }
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da empresa</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage /> {/* Erro automático do Zod */}
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
```

---

## 🚫 Anti-patterns Proibidos

| ❌ Proibido | ✅ Correto |
|---|---|
| `any` em TypeScript | Tipos explícitos ou `unknown` com narrowing |
| `console.log` em produção | Logger estruturado ou remover |
| Lógica de negócio em componentes | Mover para hooks ou services |
| Chamada direta ao Supabase em UI | Sempre via service/hook |
| IF/ELSE aninhados | Early return |
| Strings mágicas | Constantes/enums tipados |
| Mutação direta de estado | Imutabilidade (spread, Immer) |
| `useEffect` para buscar dados | TanStack Query / SWR |
| Componente com mais de 250 linhas | Extrair sub-componentes |
| Arquivo de utils genérico enorme | Organizar por domínio |

---

## 🔍 Checklist de Code Review

Antes de abrir PR, verificar:

- [ ] Nenhum `any` ou `@ts-ignore` sem justificativa documentada
- [ ] Funções com nome que descreve a intenção
- [ ] Sem `console.log` esquecidos
- [ ] Tratamento de erro adequado (try/catch ou Result pattern)
- [ ] Validação Zod em todos os inputs externos
- [ ] Tipos inferidos do Zod (sem interfaces duplicadas)
- [ ] Nenhuma lógica de negócio em componente React
- [ ] Nenhum import não utilizado
- [ ] Funções com mais de 30 linhas foram revisadas para extração
- [ ] RLS verificado para queries que envolvem dados de outros usuários

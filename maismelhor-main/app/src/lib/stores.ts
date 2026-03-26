export interface StoreProduct {
  id: string;
  name: string;
  price: string;
  image: string;
  category: string;
}

export interface Store {
  id: string;
  slug: string;
  name: string;
  category: string;
  position: [number, number]; // [longitude, latitude]
  deal: string;
  rating: number;
  reviews: number;
  distance: string;
  deliveryTime: string;
  deliveryFee: string;
  image: string;
  coverImage: string;
  description: string;
  address: string;
  hours: string;
  phone: string;
  products: StoreProduct[];
}

export const STORES: Store[] = [
  {
    id: '1',
    slug: 'pizzaria-bella-massa',
    name: 'Pizzaria Bella Massa',
    category: 'Restaurante',
    position: [-48.7663, -24.2245],
    deal: '50% OFF',
    rating: 4.8,
    reviews: 342,
    distance: '1.2km',
    deliveryTime: '30-45 min',
    deliveryFee: 'Grátis',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    description: 'A melhor pizza artesanal da região, feita com ingredientes frescos e massa fina crocante. Promoções exclusivas toda semana!',
    address: 'Rua das Flores, 123 — Centro',
    hours: 'Seg–Sex: 18h–23h | Sáb–Dom: 12h–00h',
    phone: '(47) 99999-1234',
    products: [
      { id: 'p1', name: 'Pizza Margherita', price: 'R$ 39,90', image: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?auto=format&fit=crop&w=300&q=80', category: 'Pizza' },
      { id: 'p2', name: 'Pizza Quatro Queijos', price: 'R$ 49,90', image: 'https://images.unsplash.com/photo-1548369937-47519962c11a?auto=format&fit=crop&w=300&q=80', category: 'Pizza' },
      { id: 'p3', name: 'Pizza Frango c/ Catupiry', price: 'R$ 44,90', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=300&q=80', category: 'Pizza' },
      { id: 'p4', name: 'Refrigerante 2L', price: 'R$ 9,90', image: 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?auto=format&fit=crop&w=300&q=80', category: 'Bebidas' },
    ],
  },
  {
    id: '2',
    slug: 'farmacia-vida-saude',
    name: 'Farmácia Vida & Saúde',
    category: 'Saúde & Bem-estar',
    position: [-48.7629, -24.2205],
    deal: '',
    rating: 4.9,
    reviews: 218,
    distance: '0.8km',
    deliveryTime: '15-25 min',
    deliveryFee: 'R$ 4,90',
    image: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=800&q=80',
    description: 'Farmácia completa com atendimento farmacêutico especializado, medicamentos de referência e genéricos, perfumaria e muito mais.',
    address: 'Av. Principal, 456 — Bairro Novo',
    hours: 'Seg–Sáb: 07h–22h | Dom: 08h–20h',
    phone: '(47) 99999-5678',
    products: [
      { id: 'p5', name: 'Vitamina C 1g (60 cáps)', price: 'R$ 24,90', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80', category: 'Vitaminas' },
      { id: 'p6', name: 'Protetor Solar FPS 70', price: 'R$ 38,90', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=300&q=80', category: 'Dermocosméticos' },
      { id: 'p7', name: 'Álcool Gel Antisséptico', price: 'R$ 12,90', image: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=300&q=80', category: 'Higiene' },
      { id: 'p8', name: 'Dipirona 500mg (20 comp)', price: 'R$ 6,90', image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=300&q=80', category: 'Medicamentos' },
    ],
  },
  {
    id: '3',
    slug: 'mercado-central',
    name: 'Mercado Central',
    category: 'Mercado & Hortifruti',
    position: [-48.7610, -24.2215],
    deal: 'Frete Grátis',
    rating: 4.7,
    reviews: 503,
    distance: '2.5km',
    deliveryTime: 'Hoje',
    deliveryFee: 'Grátis',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    description: 'O mercado mais completo da cidade! Frutas, verduras e legumes frescos diretamente do produtor. Carnes selecionadas e produtos importados.',
    address: 'Rua do Comércio, 789 — Mercado',
    hours: 'Seg–Sáb: 06h–20h | Dom: 06h–14h',
    phone: '(47) 99999-9012',
    products: [
      { id: 'p9', name: 'Cesta de Frutas (5kg)', price: 'R$ 29,90', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=300&q=80', category: 'Frutas' },
      { id: 'p10', name: 'Peito de Frango (kg)', price: 'R$ 14,90', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=300&q=80', category: 'Carnes' },
      { id: 'p11', name: 'Pão Francês (6 un)', price: 'R$ 5,90', image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=300&q=80', category: 'Padaria' },
      { id: 'p12', name: 'Leite Integral (1L)', price: 'R$ 4,50', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=300&q=80', category: 'Laticínios' },
    ],
  },
  {
    id: '4',
    slug: 'cafeteria-aroma',
    name: 'Cafeteria Aroma',
    category: 'Café & Confeitaria',
    position: [-48.7645, -24.2260],
    deal: 'Novo!',
    rating: 4.6,
    reviews: 89,
    distance: '0.5km',
    deliveryTime: '10-20 min',
    deliveryFee: 'R$ 2,90',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    description: 'Café especial da fazenda para sua xícara. Grãos selecionados, torrefação artesanal e bolos caseiros feitos com amor todos os dias.',
    address: 'Praça Central, 10 — Centro Histórico',
    hours: 'Seg–Sex: 07h–19h | Sáb–Dom: 08h–18h',
    phone: '(47) 99999-3456',
    products: [
      { id: 'p13', name: 'Café Especial 200ml', price: 'R$ 9,90', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=300&q=80', category: 'Café' },
      { id: 'p14', name: 'Cappuccino Italiano', price: 'R$ 12,90', image: 'https://images.unsplash.com/photo-1572286258217-40f579f7ad83?auto=format&fit=crop&w=300&q=80', category: 'Café' },
      { id: 'p15', name: 'Bolo de Cenoura (fatia)', price: 'R$ 11,90', image: 'https://images.unsplash.com/photo-1542826438-bd32f43d626f?auto=format&fit=crop&w=300&q=80', category: 'Confeitaria' },
      { id: 'p16', name: 'Croissant de Manteiga', price: 'R$ 8,90', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=300&q=80', category: 'Confeitaria' },
    ],
  },
];

export function getStoreBySlug(slug: string): Store | undefined {
  return STORES.find(s => s.slug === slug);
}

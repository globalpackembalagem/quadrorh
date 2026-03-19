import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Search, Download, Upload, UserPlus, Pencil, Trash2, Settings, Bell, Filter, Eye, EyeOff,
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Plus, X, Check, AlertTriangle, Info,
  Calendar, Clock, FileText, BarChart3, PieChart, TrendingUp, Users, Shield, Lock, Unlock,
  RefreshCw, Save, Copy, Printer, Mail, Phone, MapPin, Star, Heart, ThumbsUp, Zap,
  LayoutGrid, List, Table2, ArrowUpDown, SlidersHorizontal, Columns, Rows, Grid3x3,
  Megaphone, MessageSquare, Send, Archive, Bookmark, Flag, Tag, Hash, AtSign,
  Home, Building, Briefcase, GraduationCap, Award, Target, Rocket, Lightbulb,
  Moon, Sun, Palette, Paintbrush, Image, Camera, Video, Music, Mic,
  Wifi, Globe, Link, ExternalLink, QrCode, Scan, Fingerprint, Key,
  HardDrive, Database, Server, Cloud, Terminal, Code, Bug, Wrench,
  Car, Truck, Bus, Train, Plane, Ship, Bike, Footprints
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme, THEME_OPTIONS, Theme } from '@/contexts/ThemeContext';

const SECOES = [
  { id: 'temas', label: '🎨 Galeria de Temas' },
  { id: 'botoes', label: '🔘 Botões' },
  { id: 'badges', label: '🏷️ Badges' },
  { id: 'inputs', label: '📝 Inputs' },
  { id: 'tabelas', label: '📊 Tabelas' },
  { id: 'cards', label: '🃏 Cards' },
  { id: 'dialogs', label: '💬 Dialogs/Modais' },
  { id: 'tabs', label: '📑 Tabs/Abas' },
  { id: 'alertas', label: '⚠️ Alertas/Toasts' },
  { id: 'navegacao', label: '🧭 Navegação' },
  { id: 'dados', label: '📈 Dados/Gráficos' },
  { id: 'icones', label: '🎨 Ícones' },
  { id: 'extras', label: '✨ Extras' },
  { id: 'avancados', label: '🧩 Avançados' },
  { id: 'cores', label: '🎨 Paleta de Cores' },
];

export default function ReferenciaComponentes() {
  const [secaoAtiva, setSecaoAtiva] = useState('temas');
  const { theme: temaAtual, setTheme } = useTheme();
  const [temaPreview, setTemaPreview] = useState<Theme | null>(null);

  // Restaurar tema ao sair do preview
  useEffect(() => {
    return () => {
      if (temaPreview) {
        // cleanup handled by user clicking "voltar"
      }
    };
  }, [temaPreview]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📚 Guia de Referência — Componentes do Sistema</h1>
        <p className="text-muted-foreground mt-1">
          Use estes nomes ao pedir alterações. Cada item mostra o <strong>nome</strong>, a <strong>aparência</strong> e <strong>exemplos de pedidos</strong>.
        </p>
      </div>

      <Tabs value={secaoAtiva} onValueChange={setSecaoAtiva}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {SECOES.map(s => (
            <TabsTrigger key={s.id} value={s.id} className="text-xs">{s.label}</TabsTrigger>
          ))}
        </TabsList>

        {/* ==================== GALERIA DE TEMAS ==================== */}
        <TabsContent value="temas" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>🎨 Galeria de Temas</CardTitle>
              <CardDescription>
                Clique em um tema para visualizar como fica no sistema. Se gostar, clique em "Aplicar" para usar, ou copie o prompt para pedir ajustes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {temaPreview && (
                <Alert className="border-primary/40 bg-primary/5">
                  <Eye className="h-4 w-4" />
                  <AlertTitle>Visualizando: {THEME_OPTIONS.find(t => t.id === temaPreview)?.label}</AlertTitle>
                  <AlertDescription className="flex items-center gap-2 mt-2">
                    <Button size="sm" onClick={() => { setTheme(temaPreview); setTemaPreview(null); toast.success('Tema aplicado!'); }}>
                      ✅ Aplicar este tema
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setTheme(temaAtual); setTemaPreview(null); }}>
                      ↩️ Voltar ao anterior
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {THEME_OPTIONS.map((tema) => {
                  const isAtivo = temaAtual === tema.id && !temaPreview;
                  const isPreview = temaPreview === tema.id;
                  const prompt = `Altere o tema "${tema.label}" do sistema: mude as cores primary para [SUA COR], background para [SUA COR], sidebar para [SUA COR]. Mantenha o contraste e legibilidade.`;

                  return (
                    <div
                      key={tema.id}
                      className={cn(
                        'border-2 rounded-xl overflow-hidden transition-all cursor-pointer hover:shadow-lg',
                        isAtivo ? 'border-primary ring-2 ring-primary/30' : isPreview ? 'border-primary/60 ring-1 ring-primary/20' : 'border-border hover:border-primary/40'
                      )}
                    >
                      {/* Mini mockup */}
                      <div className="relative h-36 p-2" style={{ backgroundColor: tema.colors.background }}>
                        {/* Sidebar */}
                        <div className="absolute left-0 top-0 bottom-0 w-[30%] rounded-l-lg flex flex-col gap-1.5 p-2" style={{ backgroundColor: tema.colors.sidebar }}>
                          <div className="h-3 w-[80%] rounded" style={{ backgroundColor: tema.colors.primary, opacity: 0.9 }} />
                          <div className="h-2 w-[60%] rounded" style={{ backgroundColor: tema.colors.text, opacity: 0.2 }} />
                          <div className="h-2 w-[70%] rounded" style={{ backgroundColor: tema.colors.text, opacity: 0.2 }} />
                          <div className="h-2 w-[50%] rounded" style={{ backgroundColor: tema.colors.text, opacity: 0.2 }} />
                          <div className="h-2 w-[65%] rounded" style={{ backgroundColor: tema.colors.text, opacity: 0.15 }} />
                          <div className="h-2 w-[45%] rounded" style={{ backgroundColor: tema.colors.text, opacity: 0.15 }} />
                        </div>
                        {/* Content area */}
                        <div className="ml-[33%] space-y-2">
                          {/* Header */}
                          <div className="h-4 w-[50%] rounded" style={{ backgroundColor: tema.colors.text, opacity: 0.8 }} />
                          {/* Cards */}
                          <div className="grid grid-cols-3 gap-1.5">
                            {[0,1,2].map(i => (
                              <div key={i} className="rounded-md p-1.5 space-y-1" style={{ backgroundColor: tema.colors.card, border: `1px solid ${tema.colors.text}15` }}>
                                <div className="h-2 w-[60%] rounded" style={{ backgroundColor: tema.colors.text, opacity: 0.3 }} />
                                <div className="h-4 w-[80%] rounded" style={{ backgroundColor: tema.colors.primary, opacity: 0.7 }} />
                              </div>
                            ))}
                          </div>
                          {/* Table mock */}
                          <div className="rounded-md p-1" style={{ backgroundColor: tema.colors.card, border: `1px solid ${tema.colors.text}15` }}>
                            {[0,1,2].map(i => (
                              <div key={i} className="flex gap-1 py-0.5">
                                <div className="h-1.5 flex-1 rounded" style={{ backgroundColor: tema.colors.text, opacity: 0.15 }} />
                                <div className="h-1.5 flex-1 rounded" style={{ backgroundColor: tema.colors.text, opacity: 0.1 }} />
                                <div className="h-1.5 w-8 rounded" style={{ backgroundColor: tema.colors.primary, opacity: 0.4 }} />
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Active badge */}
                        {isAtivo && (
                          <div className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tema.colors.primary, color: '#fff' }}>
                            ✓ ATIVO
                          </div>
                        )}
                      </div>

                      {/* Info + actions */}
                      <div className="p-3 bg-card space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">{tema.label}</span>
                          <div className="flex gap-1">
                            <div className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: tema.colors.primary }} title="Primary" />
                            <div className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: tema.colors.background }} title="Background" />
                            <div className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: tema.colors.sidebar }} title="Sidebar" />
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant={isAtivo ? "default" : "outline"}
                            className="flex-1 text-[10px] h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isAtivo) {
                                setTemaPreview(tema.id);
                                setTheme(tema.id);
                              }
                            }}
                            disabled={isAtivo}
                          >
                            {isAtivo ? '✓ EM USO' : '👁 VISUALIZAR'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[10px] h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(prompt);
                              toast.success('Prompt copiado! Cole no chat para personalizar.');
                            }}
                            title="Copiar prompt para personalizar"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* Dicas */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-semibold text-sm mb-2">💡 Como personalizar temas</h3>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p>• Clique no botão <Copy className="inline h-3 w-3" /> de qualquer tema para copiar um prompt de personalização</p>
                  <p>• Cole no chat e substitua [SUA COR] pelas cores que deseja (ex: #2563EB, azul mais escuro, etc.)</p>
                  <p>• Você pode pedir: "Quero o tema Dark Tech mas com primary em verde #10B981"</p>
                  <p>• As cores da sidebar, cards e fundo podem ser ajustadas individualmente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== BOTÕES ==================== */}
        <TabsContent value="botoes" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>🔘 Botões (Button)</CardTitle>
              <CardDescription>Elemento clicável para ações. Variantes controlam a aparência.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ComponenteItem
                  nome="Button (Padrão/Primary)"
                  desc="Botão principal, ação mais importante"
                  pedido="'Coloca um botão de Salvar'"
                >
                  <Button>Salvar</Button>
                </ComponenteItem>

                <ComponenteItem
                  nome="Button Destructive"
                  desc="Ação perigosa (excluir, remover)"
                  pedido="'Botão de excluir vermelho'"
                >
                  <Button variant="destructive">Excluir</Button>
                </ComponenteItem>

                <ComponenteItem
                  nome="Button Outline"
                  desc="Botão com borda, menos destaque"
                  pedido="'Botão de cancelar com borda'"
                >
                  <Button variant="outline">Cancelar</Button>
                </ComponenteItem>

                <ComponenteItem
                  nome="Button Secondary"
                  desc="Ação secundária, cinza"
                  pedido="'Botão secundário de filtrar'"
                >
                  <Button variant="secondary">Filtrar</Button>
                </ComponenteItem>

                <ComponenteItem
                  nome="Button Ghost"
                  desc="Botão transparente, sutil"
                  pedido="'Botão ghost só com ícone'"
                >
                  <Button variant="ghost">Opções</Button>
                </ComponenteItem>

                <ComponenteItem
                  nome="Button Link"
                  desc="Parece um link clicável"
                  pedido="'Botão link para ver mais'"
                >
                  <Button variant="link">Ver mais</Button>
                </ComponenteItem>

                <ComponenteItem
                  nome="Button com Ícone"
                  desc="Botão com ícone à esquerda"
                  pedido="'Botão com ícone de download'"
                >
                  <Button><Download className="h-4 w-4 mr-1" /> Exportar</Button>
                </ComponenteItem>

                <ComponenteItem
                  nome="Button Ícone (Icon)"
                  desc="Botão quadrado só com ícone"
                  pedido="'Botão de editar só com ícone de lápis'"
                >
                  <Button variant="outline" size="icon"><Pencil className="h-4 w-4" /></Button>
                </ComponenteItem>

                <ComponenteItem
                  nome="Button Pequeno (sm)"
                  desc="Tamanho compacto"
                  pedido="'Botão pequeno de adicionar'"
                >
                  <Button size="sm"><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
                </ComponenteItem>

                <ComponenteItem
                  nome="Button Grande (lg)"
                  desc="Tamanho grande, destaque"
                  pedido="'Botão grande de confirmar'"
                >
                  <Button size="lg">Confirmar Ação</Button>
                </ComponenteItem>

                <ComponenteItem
                  nome="Button Desabilitado"
                  desc="Bloqueado, não pode clicar"
                  pedido="'Desabilita o botão se não tem permissão'"
                >
                  <Button disabled>Bloqueado</Button>
                </ComponenteItem>

                <ComponenteItem
                  nome="Button Loading"
                  desc="Mostra que está carregando"
                  pedido="'Mostra loading no botão ao salvar'"
                >
                  <Button disabled><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Salvando...</Button>
                </ComponenteItem>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== BADGES ==================== */}
        <TabsContent value="badges" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>🏷️ Badges / Etiquetas</CardTitle>
              <CardDescription>Pequenas marcações para status, categorias ou contadores.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ComponenteItem
                  nome="Badge Padrão"
                  desc="Destaque principal (azul/roxo)"
                  pedido="'Coloca um badge de ATIVO'"
                >
                  <Badge>ATIVO</Badge>
                </ComponenteItem>

                <ComponenteItem
                  nome="Badge Destructive"
                  desc="Vermelho, alerta ou perigo"
                  pedido="'Badge vermelho de DEMISSÃO'"
                >
                  <Badge variant="destructive">DEMISSÃO</Badge>
                </ComponenteItem>

                <ComponenteItem
                  nome="Badge Secondary"
                  desc="Cinza, informativo neutro"
                  pedido="'Badge cinza de FÉRIAS'"
                >
                  <Badge variant="secondary">FÉRIAS</Badge>
                </ComponenteItem>

                <ComponenteItem
                  nome="Badge Outline"
                  desc="Só borda, sem preenchimento"
                  pedido="'Badge outline de Prestador'"
                >
                  <Badge variant="outline">Prestador</Badge>
                </ComponenteItem>

                <ComponenteItem
                  nome="Badge com Animação Pulse"
                  desc="Pulsa para chamar atenção"
                  pedido="'Badge pulsante de URGENTE'"
                >
                  <Badge variant="destructive" className="animate-pulse">🔴 URGENTE</Badge>
                </ComponenteItem>

                <ComponenteItem
                  nome="Badge Contador"
                  desc="Mostra quantidade"
                  pedido="'Badge com número de pendentes'"
                >
                  <Badge className="bg-orange-500">3 pendentes</Badge>
                </ComponenteItem>

                <ComponenteItem
                  nome="Badge com Emoji"
                  desc="Emoji + texto para status visual"
                  pedido="'Badge com emoji de aprovado'"
                >
                  <Badge variant="secondary">✅ Aprovado</Badge>
                </ComponenteItem>

                <ComponenteItem
                  nome="Badge Colorido Custom"
                  desc="Cor personalizada"
                  pedido="'Badge verde de AUXÍLIO DOENÇA'"
                >
                  <div className="flex gap-2 flex-wrap">
                    <Badge className="bg-emerald-500 text-white">ATIVO</Badge>
                    <Badge className="bg-amber-500 text-white">FÉRIAS</Badge>
                    <Badge className="bg-red-600 text-white">AUX. DOENÇA</Badge>
                    <Badge className="bg-blue-500 text-white">TREINAMENTO</Badge>
                  </div>
                </ComponenteItem>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== INPUTS ==================== */}
        <TabsContent value="inputs" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>📝 Campos de Entrada (Input / Select)</CardTitle>
              <CardDescription>Onde o usuário digita ou seleciona dados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ComponenteItem
                  nome="Input (Campo de Texto)"
                  desc="Campo para digitar texto"
                  pedido="'Coloca um campo de nome'"
                >
                  <Input placeholder="Digite o nome..." />
                </ComponenteItem>

                <ComponenteItem
                  nome="Input com Ícone de Busca"
                  desc="Campo de pesquisa"
                  pedido="'Campo de busca com lupa'"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." className="pl-9" />
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Select (Dropdown/Lista)"
                  desc="Escolher uma opção de uma lista"
                  pedido="'Coloca um select de setores'"
                >
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sopro">Sopro</SelectItem>
                      <SelectItem value="deco">Decoração</SelectItem>
                    </SelectContent>
                  </Select>
                </ComponenteItem>

                <ComponenteItem
                  nome="Switch (Liga/Desliga)"
                  desc="Alternar entre sim e não"
                  pedido="'Coloca um switch de ativo/inativo'"
                >
                  <div className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <span className="text-sm">Ativo</span>
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Checkbox (Caixa de Seleção)"
                  desc="Marcar/desmarcar opções"
                  pedido="'Checkbox para selecionar múltiplos'"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="c1" defaultChecked /><label htmlFor="c1" className="text-sm">Opção 1</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="c2" /><label htmlFor="c2" className="text-sm">Opção 2</label>
                    </div>
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Input Desabilitado / Somente Leitura"
                  desc="Campo que não pode ser editado"
                  pedido="'Campo somente leitura para matrícula'"
                >
                  <Input value="12345" disabled className="bg-muted" />
                </ComponenteItem>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TABELAS ==================== */}
        <TabsContent value="tabelas" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>📊 Tabelas (Table)</CardTitle>
              <CardDescription>Exibir dados em linhas e colunas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ComponenteItem
                nome="Tabela Padrão"
                desc="Linhas, colunas, cabeçalho fixo"
                pedido="'Coloca uma tabela com colunas Nome, Setor e Situação'"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Maria Silva</TableCell>
                      <TableCell>Sopro A</TableCell>
                      <TableCell><Badge className="bg-emerald-500 text-white text-xs">ATIVO</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Ana Santos</TableCell>
                      <TableCell>Decoração Dia</TableCell>
                      <TableCell><Badge variant="destructive" className="text-xs">AUX. DOENÇA</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ComponenteItem>

              <ComponenteItem
                nome="Tabela com Scroll"
                desc="Tabela com rolagem e cabeçalho fixo"
                pedido="'Tabela com scroll vertical e cabeçalho fixo'"
              >
                <div className="text-xs text-muted-foreground p-3 bg-muted rounded">
                  Usa <code>max-h-[65vh] overflow-y-auto</code> com <code>sticky top-0</code> no header.
                  Exemplo: a lista de armários já usa isso.
                </div>
              </ComponenteItem>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== CARDS ==================== */}
        <TabsContent value="cards" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>🃏 Cards</CardTitle>
              <CardDescription>Caixas para agrupar informações.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ComponenteItem
                  nome="Card Estatístico (StatCard)"
                  desc="Mostra um número com título"
                  pedido="'Card mostrando total de funcionários'"
                >
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-primary">247</div>
                      <div className="text-xs text-muted-foreground">Total Funcionários</div>
                    </CardContent>
                  </Card>
                </ComponenteItem>

                <ComponenteItem
                  nome="Card com Título e Descrição"
                  desc="Card organizado com header"
                  pedido="'Card com título Resumo e dados dentro'"
                >
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Resumo do Dia</CardTitle>
                      <CardDescription>Atualizado às 08:00</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">5 faltas • 2 atestados</div>
                    </CardContent>
                  </Card>
                </ComponenteItem>

                <ComponenteItem
                  nome="Card com Cor/Destaque"
                  desc="Card com borda colorida"
                  pedido="'Card vermelho para alertas'"
                >
                  <Card className="border-destructive bg-destructive/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <span className="font-medium text-destructive">3 Demissões Pendentes</span>
                      </div>
                    </CardContent>
                  </Card>
                </ComponenteItem>

                <ComponenteItem
                  nome="Card Grid (Dashboard)"
                  desc="Múltiplos cards em grade"
                  pedido="'Dashboard com 4 cards de estatísticas'"
                >
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { num: '247', label: 'Total', color: 'text-foreground' },
                      { num: '12', label: 'Faltas', color: 'text-destructive' },
                      { num: '8', label: 'Férias', color: 'text-primary' },
                      { num: '3', label: 'Afastados', color: 'text-amber-500' },
                    ].map(s => (
                      <Card key={s.label}>
                        <CardContent className="p-2 text-center">
                          <div className={`text-lg font-bold ${s.color}`}>{s.num}</div>
                          <div className="text-[10px] text-muted-foreground">{s.label}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ComponenteItem>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== DIALOGS ==================== */}
        <TabsContent value="dialogs" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>💬 Dialog / Modal</CardTitle>
              <CardDescription>Janela que abre por cima da tela para formulários ou confirmações.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ComponenteItem
                  nome="Dialog / Modal"
                  desc="Janela flutuante com formulário"
                  pedido="'Abre um modal para editar dados'"
                >
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>Abrir Modal Exemplo</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Editar Funcionária</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input placeholder="Nome completo" defaultValue="Maria Silva" />
                        <Select>
                          <SelectTrigger><SelectValue placeholder="Setor" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sopro">Sopro A</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button variant="outline">Cancelar</Button>
                        <Button>Salvar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </ComponenteItem>

                <ComponenteItem
                  nome="Dialog de Confirmação"
                  desc="Pergunta antes de executar ação perigosa"
                  pedido="'Confirmação antes de excluir'"
                >
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive">Excluir Exemplo</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Tem certeza?</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
                      <DialogFooter>
                        <Button variant="outline">Cancelar</Button>
                        <Button variant="destructive">Confirmar Exclusão</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </ComponenteItem>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TABS ==================== */}
        <TabsContent value="tabs" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>📑 Tabs / Abas</CardTitle>
              <CardDescription>Dividir conteúdo em seções clicáveis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ComponenteItem
                nome="Tabs (Abas)"
                desc="Alterna entre diferentes visões"
                pedido="'Coloca abas de Geral, Pendentes e Histórico'"
              >
                <Tabs defaultValue="geral" className="w-full">
                  <TabsList>
                    <TabsTrigger value="geral">Geral</TabsTrigger>
                    <TabsTrigger value="pendentes">Pendentes (5)</TabsTrigger>
                    <TabsTrigger value="historico">Histórico</TabsTrigger>
                  </TabsList>
                  <TabsContent value="geral" className="p-3 bg-muted rounded mt-2 text-sm">
                    Conteúdo da aba Geral
                  </TabsContent>
                  <TabsContent value="pendentes" className="p-3 bg-muted rounded mt-2 text-sm">
                    Conteúdo da aba Pendentes
                  </TabsContent>
                </Tabs>
              </ComponenteItem>

              <ComponenteItem
                nome="Accordion (Sanfona)"
                desc="Expande e recolhe seções"
                pedido="'Coloca uma sanfona com FAQ'"
              >
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="1">
                    <AccordionTrigger className="text-sm">Como cadastrar armário?</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      Clique em "Cadastrar", selecione a funcionária e o número do armário.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="2">
                    <AccordionTrigger className="text-sm">Como liberar armário de demitida?</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      Vá na aba "Demissão" e clique em "Liberar".
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </ComponenteItem>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== ALERTAS ==================== */}
        <TabsContent value="alertas" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>⚠️ Alertas, Toasts e Notificações</CardTitle>
              <CardDescription>Mensagens de feedback para o usuário.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ComponenteItem
                  nome="Toast de Sucesso"
                  desc="Mensagem verde que aparece no canto"
                  pedido="'Mostra toast de sucesso ao salvar'"
                >
                  <Button variant="outline" onClick={() => toast.success('Dados salvos com sucesso!')}>
                    Testar Toast Sucesso ✅
                  </Button>
                </ComponenteItem>

                <ComponenteItem
                  nome="Toast de Erro"
                  desc="Mensagem vermelha de erro"
                  pedido="'Toast de erro se falhar'"
                >
                  <Button variant="outline" onClick={() => toast.error('Erro ao salvar dados!')}>
                    Testar Toast Erro ❌
                  </Button>
                </ComponenteItem>

                <ComponenteItem
                  nome="Toast de Aviso"
                  desc="Mensagem amarela de atenção"
                  pedido="'Toast de aviso'"
                >
                  <Button variant="outline" onClick={() => toast.warning('Atenção: verifique os dados!')}>
                    Testar Toast Aviso ⚠️
                  </Button>
                </ComponenteItem>

                <ComponenteItem
                  nome="Toast Informativo"
                  desc="Mensagem azul informativa"
                  pedido="'Toast info quando carregar'"
                >
                  <Button variant="outline" onClick={() => toast.info('Dados atualizados automaticamente')}>
                    Testar Toast Info ℹ️
                  </Button>
                </ComponenteItem>

                <ComponenteItem
                  nome="Alert (Alerta em Bloco)"
                  desc="Aviso fixo na página"
                  pedido="'Alerta de atenção no topo da página'"
                >
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Informação</AlertTitle>
                    <AlertDescription>Período de faltas fecha em 3 dias.</AlertDescription>
                  </Alert>
                </ComponenteItem>

                <ComponenteItem
                  nome="Alert Destrutivo"
                  desc="Alerta de erro/perigo"
                  pedido="'Alerta vermelho de erro'"
                >
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Atenção!</AlertTitle>
                    <AlertDescription>5 funcionárias sem armário atribuído.</AlertDescription>
                  </Alert>
                </ComponenteItem>
              </div>
            </CardContent>
          </Card>

          {/* Tipos de Notificação do Sistema */}
          <Card>
            <CardHeader>
              <CardTitle>🔔 Tipos de Notificação do Sistema</CardTitle>
              <CardDescription>Todas as notificações automáticas usadas no sistema. Cada tipo gera um modal ou toast com formato padronizado.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[120px]">Entrega</TableHead>
                    <TableHead className="w-[120px]">Destino</TableHead>
                    <TableHead className="w-[80px]">Teste</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/40">admissao</Badge></TableCell>
                    <TableCell>Nova admissão cadastrada ou previsão ativada</TableCell>
                    <TableCell><Badge variant="outline">Modal</Badge></TableCell>
                    <TableCell>Gestores do setor</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => toast.info('🟢 ADMISSÃO — João Silva entrou no setor SOPRO A', { duration: 5000, position: 'bottom-left' })}>▶</Button></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-blue-500/20 text-blue-700 border-blue-500/40">transferencia</Badge></TableCell>
                    <TableCell>Funcionário transferido entre setores (DE → PARA)</TableCell>
                    <TableCell><Badge variant="outline">Modal</Badge></TableCell>
                    <TableCell>Gestores origem + destino</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => toast.info('🔄 TRANSFERÊNCIA — Maria de SOPRO A → DECO DIA', { duration: 5000, position: 'bottom-left' })}>▶</Button></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-red-500/20 text-red-700 border-red-500/40">demissao</Badge></TableCell>
                    <TableCell>Funcionário desligado do quadro</TableCell>
                    <TableCell><Badge variant="outline">Modal</Badge></TableCell>
                    <TableCell>Gestores do setor</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => toast.info('🔴 DEMISSÃO — Carlos foi desligado do setor DECO NOITE', { duration: 5000, position: 'bottom-left' })}>▶</Button></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-orange-500/20 text-orange-700 border-orange-500/40">divergencia_nova</Badge></TableCell>
                    <TableCell>Divergência criada por gestor (SUMIDO, COB. FÉRIAS etc.)</TableCell>
                    <TableCell><Badge variant="outline">Modal obrigatório</Badge></TableCell>
                    <TableCell>Admins + Gestores</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => toast.info('⚠️ DIVERGÊNCIA — SUMIDO: Pedro Silva (SOPRO B) por Silvia', { duration: 5000, position: 'bottom-left' })}>▶</Button></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-purple-500/20 text-purple-700 border-purple-500/40">troca_turno</Badge></TableCell>
                    <TableCell>Solicitação de troca de turno entre setores</TableCell>
                    <TableCell><Badge variant="outline">Modal</Badge></TableCell>
                    <TableCell>Gestores origem + destino</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => toast.info('🔁 TROCA TURNO — Ana: SOPRO A → SOPRO B', { duration: 5000, position: 'bottom-left' })}>▶</Button></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-amber-500/20 text-amber-700 border-amber-500/40">experiencia</Badge></TableCell>
                    <TableCell>Funcionário com período de experiência vencendo</TableCell>
                    <TableCell><Badge variant="outline">Modal</Badge></TableCell>
                    <TableCell>Gestores do setor</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => toast.info('⏰ EXPERIÊNCIA — Lucas vence em 5 dias (DECO DIA)', { duration: 5000, position: 'bottom-left' })}>▶</Button></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-cyan-500/20 text-cyan-700 border-cyan-500/40">cobertura</Badge></TableCell>
                    <TableCell>Cobertura ou treinamento cadastrado/encerrado</TableCell>
                    <TableCell><Badge variant="outline">Modal</Badge></TableCell>
                    <TableCell>Gestores do setor</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => toast.info('🔵 COBERTURA — Felipe cobre férias em SOPRO A', { duration: 5000, position: 'bottom-left' })}>▶</Button></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-teal-500/20 text-teal-700 border-teal-500/40">previsao</Badge></TableCell>
                    <TableCell>Previsão de admissão criada ou ativada</TableCell>
                    <TableCell><Badge variant="outline">Modal</Badge></TableCell>
                    <TableCell>Gestores do setor</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => toast.info('📋 PREVISÃO — 3 admissões previstas para SOPRO A', { duration: 5000, position: 'bottom-left' })}>▶</Button></TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Separator className="my-4" />

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Toasts automáticos do Admin (tempo real)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ComponenteItem
                    nome="🟢 Login — Toast"
                    desc="Admin vê quando alguém entra no sistema"
                    pedido="Toast automático em bottom-left"
                  >
                    <Button variant="outline" size="sm" onClick={() => toast.info('🟢 SILVIA entrou no sistema', { duration: 4000, position: 'bottom-left' })}>
                      Simular Login
                    </Button>
                  </ComponenteItem>
                  <ComponenteItem
                    nome="👁️ Ciência — Toast"
                    desc="Admin vê quando gestor visualiza notificação"
                    pedido="Toast automático em bottom-left"
                  >
                    <Button variant="outline" size="sm" onClick={() => toast.info('👁️ SILVIA viu a notificação', { duration: 5000, position: 'bottom-left' })}>
                      Simular Ciência
                    </Button>
                  </ComponenteItem>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== NAVEGAÇÃO ==================== */}
        <TabsContent value="navegacao" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>🧭 Elementos de Navegação e Layout</CardTitle>
              <CardDescription>Componentes estruturais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ComponenteItem
                  nome="Sidebar / Menu Lateral"
                  desc="Menu fixo à esquerda com links"
                  pedido="'Adiciona item no menu lateral'"
                >
                  <div className="text-xs text-muted-foreground p-3 bg-muted rounded">
                    O menu lateral do sistema (RHSidebarLayout) contém todos os links de navegação.
                    Para pedir: "Adiciona o link X no sidebar"
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Breadcrumb (Caminho)"
                  desc="Mostra onde você está: Home > Armários > Editar"
                  pedido="'Coloca breadcrumb na página'"
                >
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>Home</span> <ChevronRight className="h-3 w-3" /> <span>Armários</span> <ChevronRight className="h-3 w-3" /> <span className="text-foreground font-medium">Editar</span>
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Separator (Linha Divisória)"
                  desc="Linha horizontal para separar seções"
                  pedido="'Coloca uma linha separadora'"
                >
                  <div className="space-y-2">
                    <div className="text-sm">Seção 1</div>
                    <Separator />
                    <div className="text-sm">Seção 2</div>
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Skeleton (Carregando)"
                  desc="Placeholder animado enquanto carrega"
                  pedido="'Mostra skeleton enquanto carrega'"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Progress Bar (Barra de Progresso)"
                  desc="Mostra progresso de uma tarefa"
                  pedido="'Barra de progresso do preenchimento'"
                >
                  <div className="space-y-1">
                    <Progress value={65} />
                    <span className="text-xs text-muted-foreground">65% concluído</span>
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Tooltip (Dica ao Passar o Mouse)"
                  desc="Texto que aparece ao hover"
                  pedido="'Tooltip explicando o botão'"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">Passe o mouse aqui</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Esta é uma dica de tooltip!</p>
                    </TooltipContent>
                  </Tooltip>
                </ComponenteItem>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== DADOS ==================== */}
        <TabsContent value="dados" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>📈 Visualização de Dados</CardTitle>
              <CardDescription>Formas de exibir números e estatísticas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ComponenteItem
                  nome="Gráfico de Barras"
                  desc="Compara valores entre categorias"
                  pedido="'Gráfico de barras com faltas por setor'"
                >
                  <div className="flex items-end gap-2 h-20">
                    {[60, 35, 80, 45, 70].map((h, i) => (
                      <div key={i} className="flex-1 bg-primary/80 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Usa Recharts (já instalado)</div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Gráfico de Pizza / Donut"
                  desc="Mostra proporções"
                  pedido="'Gráfico de pizza com distribuição por situação'"
                >
                  <div className="flex items-center gap-3">
                    <PieChart className="h-12 w-12 text-primary" />
                    <div className="text-xs text-muted-foreground">Usa Recharts (já instalado)</div>
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Mapa Visual (Grid)"
                  desc="Grade visual como o mapa de armários"
                  pedido="'Mapa visual com cores verde/vermelho'"
                >
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className={`h-6 rounded text-[9px] flex items-center justify-center font-mono ${i % 3 === 0 ? 'bg-destructive/20 text-destructive border border-destructive/40' : 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/40'}`}>
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Filtros em Badge (Toggle)"
                  desc="Badges clicáveis para filtrar dados"
                  pedido="'Filtros por turma usando badges clicáveis'"
                >
                  <div className="flex gap-1 flex-wrap">
                    <Badge className="cursor-pointer">Todos</Badge>
                    <Badge variant="outline" className="cursor-pointer">Sopro A</Badge>
                    <Badge variant="outline" className="cursor-pointer">Sopro B</Badge>
                    <Badge variant="outline" className="cursor-pointer">Deco Dia</Badge>
                  </div>
                </ComponenteItem>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== ÍCONES ==================== */}
        <TabsContent value="icones" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>🎨 Ícones Disponíveis (Lucide)</CardTitle>
              <CardDescription>Ícones que você pode pedir. Todos da biblioteca Lucide React.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {[
                  { icon: Search, name: 'Busca/Lupa' },
                  { icon: Download, name: 'Download' },
                  { icon: Upload, name: 'Upload' },
                  { icon: UserPlus, name: 'Adicionar Usuário' },
                  { icon: Users, name: 'Usuários' },
                  { icon: Pencil, name: 'Editar/Lápis' },
                  { icon: Trash2, name: 'Lixeira/Excluir' },
                  { icon: Settings, name: 'Configuração' },
                  { icon: Bell, name: 'Notificação/Sino' },
                  { icon: Filter, name: 'Filtro' },
                  { icon: Eye, name: 'Olho/Visualizar' },
                  { icon: EyeOff, name: 'Olho Fechado' },
                  { icon: Plus, name: 'Mais/Adicionar' },
                  { icon: X, name: 'Fechar/X' },
                  { icon: Check, name: 'Check/Confirmar' },
                  { icon: AlertTriangle, name: 'Alerta' },
                  { icon: Info, name: 'Info' },
                  { icon: Calendar, name: 'Calendário' },
                  { icon: Clock, name: 'Relógio' },
                  { icon: FileText, name: 'Documento' },
                  { icon: BarChart3, name: 'Gráfico Barras' },
                  { icon: TrendingUp, name: 'Tendência' },
                  { icon: Shield, name: 'Escudo' },
                  { icon: Lock, name: 'Cadeado' },
                  { icon: Unlock, name: 'Desbloqueado' },
                  { icon: RefreshCw, name: 'Atualizar' },
                  { icon: Save, name: 'Salvar' },
                  { icon: Copy, name: 'Copiar' },
                  { icon: Printer, name: 'Imprimir' },
                  { icon: Mail, name: 'Email' },
                  { icon: Phone, name: 'Telefone' },
                  { icon: MapPin, name: 'Localização' },
                  { icon: Star, name: 'Estrela' },
                  { icon: Heart, name: 'Coração' },
                  { icon: ThumbsUp, name: 'Curtir' },
                  { icon: Zap, name: 'Raio/Rápido' },
                  { icon: LayoutGrid, name: 'Grade/Grid' },
                  { icon: List, name: 'Lista' },
                  { icon: ArrowUpDown, name: 'Ordenar' },
                  { icon: SlidersHorizontal, name: 'Ajustes' },
                  { icon: Megaphone, name: 'Megafone' },
                  { icon: MessageSquare, name: 'Mensagem' },
                  { icon: Send, name: 'Enviar' },
                  { icon: Archive, name: 'Arquivo' },
                  { icon: Bookmark, name: 'Favorito' },
                  { icon: Flag, name: 'Bandeira' },
                  { icon: Tag, name: 'Tag/Etiqueta' },
                  { icon: Home, name: 'Casa/Home' },
                  { icon: Building, name: 'Empresa' },
                  { icon: Briefcase, name: 'Maleta' },
                  { icon: GraduationCap, name: 'Formatura' },
                  { icon: Award, name: 'Prêmio' },
                  { icon: Target, name: 'Alvo/Meta' },
                  { icon: Rocket, name: 'Foguete' },
                  { icon: Lightbulb, name: 'Lâmpada/Ideia' },
                  { icon: Moon, name: 'Lua/Noite' },
                  { icon: Sun, name: 'Sol/Dia' },
                  { icon: Palette, name: 'Paleta/Cores' },
                  { icon: Image, name: 'Imagem' },
                  { icon: Camera, name: 'Câmera' },
                  { icon: Globe, name: 'Globo/Web' },
                  { icon: Link, name: 'Link' },
                  { icon: ExternalLink, name: 'Link Externo' },
                  { icon: QrCode, name: 'QR Code' },
                  { icon: Key, name: 'Chave' },
                  { icon: Database, name: 'Banco de Dados' },
                  { icon: Cloud, name: 'Nuvem' },
                ].map(({ icon: Icon, name }) => (
                  <div key={name} className="flex flex-col items-center gap-1 p-2 rounded border bg-card hover:bg-accent transition-colors">
                    <Icon className="h-5 w-5 text-foreground" />
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">{name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== EXTRAS ==================== */}
        <TabsContent value="extras" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>✨ Componentes Extras e Conceitos</CardTitle>
              <CardDescription>Outros recursos que você pode pedir.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ComponenteItem
                  nome="Banner / Faixa de Aviso"
                  desc="Barra no topo com mensagem"
                  pedido="'Banner amarelo de manutenção'"
                >
                  <div className="bg-amber-500/20 border border-amber-500/40 rounded p-2 text-sm text-center">
                    ⚠️ Sistema em manutenção às 22h
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Avatar / Foto de Perfil"
                  desc="Círculo com iniciais ou foto"
                  pedido="'Avatar com iniciais do usuário'"
                >
                  <div className="flex gap-2">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">LC</div>
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm">MS</div>
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Dropdown Menu"
                  desc="Menu que abre ao clicar (3 pontinhos)"
                  pedido="'Menu de opções com 3 pontinhos'"
                >
                  <div className="text-xs text-muted-foreground p-3 bg-muted rounded">
                    Abre um menu com opções como Editar, Excluir, Exportar ao clicar em ⋮ ou ⋯
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Popover / Balão"
                  desc="Balão flutuante ao clicar"
                  pedido="'Popover com detalhes ao clicar'"
                >
                  <div className="text-xs text-muted-foreground p-3 bg-muted rounded">
                    Balão que abre ao clicar mostrando mais informações. Similar ao modal mas menor.
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Scroll Infinito / Paginação"
                  desc="Carrega mais dados conforme desce"
                  pedido="'Paginação com botões Anterior/Próximo'"
                >
                  <div className="flex gap-2 items-center">
                    <Button variant="outline" size="sm" disabled><ChevronLeft className="h-3 w-3" /> Anterior</Button>
                    <span className="text-xs text-muted-foreground">Página 1 de 5</span>
                    <Button variant="outline" size="sm"><ChevronRight className="h-3 w-3" /> Próxima</Button>
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Timer / Contador"
                  desc="Mostra tempo restante da sessão"
                  pedido="'Timer de sessão no topo'"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Sessão: <strong>28:45</strong></span>
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Exportar Excel / PDF"
                  desc="Botão de exportação de dados"
                  pedido="'Botão de exportar para Excel'"
                >
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Download className="h-3 w-3 mr-1" /> Excel</Button>
                    <Button variant="outline" size="sm"><FileText className="h-3 w-3 mr-1" /> PDF</Button>
                  </div>
                </ComponenteItem>

                <ComponenteItem
                  nome="Realtime / Tempo Real"
                  desc="Dados atualizados automaticamente"
                  pedido="'Atualiza a tabela em tempo real'"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Wifi className="h-4 w-4 text-emerald-500" />
                    <span className="text-emerald-600 text-xs font-medium">Conectado em tempo real</span>
                  </div>
                </ComponenteItem>
              </div>
            </CardContent>
          </Card>

          {/* DICAS DE COMO PEDIR */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle>💡 Dicas: Como Pedir Alterações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-card rounded border">
                    <div className="font-medium mb-1">📌 Estrutura do Pedido</div>
                    <div className="text-muted-foreground text-xs space-y-1">
                      <p>• <strong>O QUE</strong>: "Adiciona uma coluna de Situação"</p>
                      <p>• <strong>ONDE</strong>: "Na tabela de armários"</p>
                      <p>• <strong>COMO</strong>: "Com badge colorido"</p>
                    </div>
                  </div>
                  <div className="p-3 bg-card rounded border">
                    <div className="font-medium mb-1">🎨 Pedidos de Visual</div>
                    <div className="text-muted-foreground text-xs space-y-1">
                      <p>• "Muda a cor do badge para vermelho"</p>
                      <p>• "Aumenta o tamanho da fonte do título"</p>
                      <p>• "Coloca borda no card"</p>
                      <p>• "Alinha os botões à direita"</p>
                    </div>
                  </div>
                  <div className="p-3 bg-card rounded border">
                    <div className="font-medium mb-1">⚙️ Pedidos de Funcionalidade</div>
                    <div className="text-muted-foreground text-xs space-y-1">
                      <p>• "Filtra por situação auxílio doença"</p>
                      <p>• "Ordena a tabela por data de admissão"</p>
                      <p>• "Exporta para Excel com todas as colunas"</p>
                      <p>• "Mostra toast de sucesso ao salvar"</p>
                    </div>
                  </div>
                  <div className="p-3 bg-card rounded border">
                    <div className="font-medium mb-1">📱 Pedidos de Layout</div>
                    <div className="text-muted-foreground text-xs space-y-1">
                      <p>• "Cards em 4 colunas no desktop"</p>
                      <p>• "Tabela com scroll e cabeçalho fixo"</p>
                      <p>• "Coloca abas separando CLT e Prestador"</p>
                      <p>• "Dialog/Modal para editar dados"</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== AVANÇADOS ==================== */}
        <TabsContent value="avancados" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>🧩 Casos Avançados</CardTitle>
              <CardDescription>Padrões compostos e combinações de componentes usados no sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Skeleton Loading */}
              <div className="border rounded-lg p-4 space-y-3 bg-card">
                <div className="font-semibold text-sm">Skeleton (Carregando)</div>
                <div className="text-xs text-muted-foreground">Placeholder visual enquanto dados carregam</div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="text-[11px] bg-muted p-2 rounded italic text-muted-foreground">
                  📣 "Coloca skeleton enquanto carrega a tabela"
                </div>
              </div>

              {/* Accordion */}
              <div className="border rounded-lg p-4 space-y-3 bg-card">
                <div className="font-semibold text-sm">Accordion (Sanfona)</div>
                <div className="text-xs text-muted-foreground">Seções expansíveis para organizar conteúdo</div>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-sm">Seção 1 — Dados do Funcionário</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      Conteúdo expandido com detalhes adicionais.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger className="text-sm">Seção 2 — Histórico</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      Registros anteriores e auditoria.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <div className="text-[11px] bg-muted p-2 rounded italic text-muted-foreground">
                  📣 "Coloca as informações em accordion/sanfona"
                </div>
              </div>

              {/* Tooltip */}
              <div className="border rounded-lg p-4 space-y-3 bg-card">
                <div className="font-semibold text-sm">Tooltip (Dica ao passar o mouse)</div>
                <div className="text-xs text-muted-foreground">Informação contextual ao hover</div>
                <div className="flex gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm"><Info className="h-4 w-4 mr-1" /> Hover aqui</Button>
                    </TooltipTrigger>
                    <TooltipContent>Esta é uma dica de tooltip</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="cursor-help">Status <Info className="h-3 w-3 ml-1" /></Badge>
                    </TooltipTrigger>
                    <TooltipContent>Explicação do status</TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-[11px] bg-muted p-2 rounded italic text-muted-foreground">
                  📣 "Coloca tooltip explicando o que o botão faz"
                </div>
              </div>

              {/* Composição: Input + Badge + Button */}
              <div className="border rounded-lg p-4 space-y-3 bg-card">
                <div className="font-semibold text-sm">Composição: Filtro com Tags</div>
                <div className="text-xs text-muted-foreground">Input + Badges removíveis para filtros ativos</div>
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="gap-1">Sopro A <X className="h-3 w-3 cursor-pointer" /></Badge>
                    <Badge variant="secondary" className="gap-1">Decoração <X className="h-3 w-3 cursor-pointer" /></Badge>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Adicionar filtro..." className="pl-9" />
                  </div>
                </div>
                <div className="text-[11px] bg-muted p-2 rounded italic text-muted-foreground">
                  📣 "Coloca filtros com chips/tags removíveis"
                </div>
              </div>

              {/* Stats inline */}
              <div className="border rounded-lg p-4 space-y-3 bg-card">
                <div className="font-semibold text-sm">Stats Cards Inline</div>
                <div className="text-xs text-muted-foreground">Cards de métricas lado a lado com ícones</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="border rounded-lg p-3 text-center bg-emerald-500/10 border-emerald-500/30">
                    <Check className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
                    <div className="text-xl font-bold">142</div>
                    <div className="text-[10px] text-muted-foreground">Ativos</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center bg-amber-500/10 border-amber-500/30">
                    <AlertTriangle className="h-5 w-5 mx-auto text-amber-600 mb-1" />
                    <div className="text-xl font-bold">8</div>
                    <div className="text-[10px] text-muted-foreground">Pendentes</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center bg-destructive/10 border-destructive/30">
                    <X className="h-5 w-5 mx-auto text-destructive mb-1" />
                    <div className="text-xl font-bold">3</div>
                    <div className="text-[10px] text-muted-foreground">Críticos</div>
                  </div>
                </div>
                <div className="text-[11px] bg-muted p-2 rounded italic text-muted-foreground">
                  📣 "Coloca cards de resumo com números e ícones"
                </div>
              </div>

              {/* Empty State */}
              <div className="border rounded-lg p-4 space-y-3 bg-card">
                <div className="font-semibold text-sm">Empty State (Estado Vazio)</div>
                <div className="text-xs text-muted-foreground">Mensagem quando não há dados para exibir</div>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Archive className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-muted-foreground">Nenhum registro encontrado</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Tente ajustar os filtros ou adicionar novos dados.</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-1"><Plus className="h-3 w-3" /> Adicionar</Button>
                </div>
                <div className="text-[11px] bg-muted p-2 rounded italic text-muted-foreground">
                  📣 "Coloca mensagem bonita quando a tabela está vazia"
                </div>
              </div>

              {/* Scroll Area */}
              <div className="border rounded-lg p-4 space-y-3 bg-card">
                <div className="font-semibold text-sm">ScrollArea (Área com Rolagem)</div>
                <div className="text-xs text-muted-foreground">Conteúdo com scroll controlado e barra estilizada</div>
                <ScrollArea className="h-32 border rounded p-3">
                  {Array.from({ length: 15 }, (_, i) => (
                    <div key={i} className="py-1 text-sm border-b last:border-0">Item {i + 1} — Registro de exemplo</div>
                  ))}
                </ScrollArea>
                <div className="text-[11px] bg-muted p-2 rounded italic text-muted-foreground">
                  📣 "Coloca a lista com scroll e altura fixa"
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== PALETA DE CORES ==================== */}
        <TabsContent value="cores" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>🎨 Paleta de Cores do Sistema</CardTitle>
              <CardDescription>Todas as cores usadas no sistema com códigos. Use estes nomes ao pedir mudanças de cor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cores Semânticas */}
              <div>
                <h3 className="font-semibold text-sm mb-3">🏗️ Cores Semânticas (Design Tokens)</h3>
                <p className="text-xs text-muted-foreground mb-3">Mudam conforme o tema ativo. Preferíveis para manter consistência.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <CorItem nome="primary" classe="bg-primary" desc="Ação principal, botões" />
                  <CorItem nome="primary-foreground" classe="bg-primary-foreground" desc="Texto sobre primary" border />
                  <CorItem nome="secondary" classe="bg-secondary" desc="Badges, destaque leve" />
                  <CorItem nome="accent" classe="bg-accent" desc="Hover, foco" />
                  <CorItem nome="muted" classe="bg-muted" desc="Fundo suave, desabilitado" />
                  <CorItem nome="destructive" classe="bg-destructive" desc="Erro, exclusão, perigo" />
                  <CorItem nome="background" classe="bg-background" desc="Fundo da página" border />
                  <CorItem nome="foreground" classe="bg-foreground" desc="Texto principal" />
                  <CorItem nome="card" classe="bg-card" desc="Fundo de cards" border />
                  <CorItem nome="border" classe="bg-border" desc="Bordas" />
                  <CorItem nome="ring" classe="bg-ring" desc="Foco de inputs" />
                  <CorItem nome="popover" classe="bg-popover" desc="Fundo de dropdowns" border />
                </div>
              </div>

              <Separator />

              {/* Cores Tailwind Diretas */}
              <div>
                <h3 className="font-semibold text-sm mb-3">🌈 Cores Tailwind (Fixas)</h3>
                <p className="text-xs text-muted-foreground mb-3">Cores específicas que não mudam com o tema. Use quando precisar de cor exata.</p>
                
                {/* Verdes */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">🟢 VERDES (Sucesso, Ativo, Livre)</div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <CorDireta nome="emerald-300" hex="#6EE7B7" classe="bg-emerald-300" />
                    <CorDireta nome="emerald-400" hex="#34D399" classe="bg-emerald-400" />
                    <CorDireta nome="emerald-500" hex="#10B981" classe="bg-emerald-500" />
                    <CorDireta nome="emerald-600" hex="#059669" classe="bg-emerald-600" />
                    <CorDireta nome="green-500" hex="#22C55E" classe="bg-green-500" />
                    <CorDireta nome="green-600" hex="#16A34A" classe="bg-green-600" />
                  </div>
                </div>

                {/* Vermelhos */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">🔴 VERMELHOS (Erro, Demissão, Ocupado)</div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <CorDireta nome="red-400" hex="#F87171" classe="bg-red-400" />
                    <CorDireta nome="red-500" hex="#EF4444" classe="bg-red-500" />
                    <CorDireta nome="red-600" hex="#DC2626" classe="bg-red-600" />
                    <CorDireta nome="rose-500" hex="#F43F5E" classe="bg-rose-500" />
                    <CorDireta nome="rose-600" hex="#E11D48" classe="bg-rose-600" />
                    <CorDireta nome="red-700" hex="#B91C1C" classe="bg-red-700" />
                  </div>
                </div>

                {/* Amarelos/Laranjas */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">🟡 AMARELOS/LARANJAS (Alerta, Pendente, Bloqueado)</div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <CorDireta nome="amber-400" hex="#FBBF24" classe="bg-amber-400" />
                    <CorDireta nome="amber-500" hex="#F59E0B" classe="bg-amber-500" />
                    <CorDireta nome="amber-600" hex="#D97706" classe="bg-amber-600" />
                    <CorDireta nome="orange-500" hex="#F97316" classe="bg-orange-500" />
                    <CorDireta nome="yellow-400" hex="#FACC15" classe="bg-yellow-400" />
                    <CorDireta nome="yellow-500" hex="#EAB308" classe="bg-yellow-500" />
                  </div>
                </div>

                {/* Azuis */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">🔵 AZUIS (Info, Links, Navegação)</div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <CorDireta nome="blue-400" hex="#60A5FA" classe="bg-blue-400" />
                    <CorDireta nome="blue-500" hex="#3B82F6" classe="bg-blue-500" />
                    <CorDireta nome="blue-600" hex="#2563EB" classe="bg-blue-600" />
                    <CorDireta nome="sky-400" hex="#38BDF8" classe="bg-sky-400" />
                    <CorDireta nome="sky-500" hex="#0EA5E9" classe="bg-sky-500" />
                    <CorDireta nome="indigo-500" hex="#6366F1" classe="bg-indigo-500" />
                  </div>
                </div>

                {/* Roxos */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">🟣 ROXOS (Destaque, Premium)</div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <CorDireta nome="purple-400" hex="#C084FC" classe="bg-purple-400" />
                    <CorDireta nome="purple-500" hex="#A855F7" classe="bg-purple-500" />
                    <CorDireta nome="purple-600" hex="#9333EA" classe="bg-purple-600" />
                    <CorDireta nome="violet-500" hex="#8B5CF6" classe="bg-violet-500" />
                    <CorDireta nome="fuchsia-500" hex="#D946EF" classe="bg-fuchsia-500" />
                    <CorDireta nome="pink-500" hex="#EC4899" classe="bg-pink-500" />
                  </div>
                </div>

                {/* Neutros */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">⚪ NEUTROS (Texto, Bordas, Fundos)</div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <CorDireta nome="slate-100" hex="#F1F5F9" classe="bg-slate-100" textDark />
                    <CorDireta nome="slate-200" hex="#E2E8F0" classe="bg-slate-200" textDark />
                    <CorDireta nome="slate-400" hex="#94A3B8" classe="bg-slate-400" />
                    <CorDireta nome="slate-600" hex="#475569" classe="bg-slate-600" />
                    <CorDireta nome="slate-800" hex="#1E293B" classe="bg-slate-800" />
                    <CorDireta nome="slate-950" hex="#020617" classe="bg-slate-950" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dicas de uso */}
              <div>
                <h3 className="font-semibold text-sm mb-3">💡 Como pedir mudança de cor</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-medium text-sm mb-2">✅ Bons pedidos</div>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p>• "Mudar o botão para <strong>emerald-500</strong>"</p>
                      <p>• "Badge de status em <strong>amber-500</strong>"</p>
                      <p>• "Borda do input em <strong>verde claro</strong>"</p>
                      <p>• "Usar cor <strong>destructive</strong> no alerta"</p>
                      <p>• "Fundo do card em <strong>blue-500/10</strong> (10% opacidade)"</p>
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-medium text-sm mb-2">📝 Formato das cores</div>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p>• <code className="bg-background px-1 rounded">bg-emerald-500</code> → fundo</p>
                      <p>• <code className="bg-background px-1 rounded">text-emerald-500</code> → texto</p>
                      <p>• <code className="bg-background px-1 rounded">border-emerald-500</code> → borda</p>
                      <p>• <code className="bg-background px-1 rounded">bg-emerald-500/20</code> → 20% opacidade</p>
                      <p>• <code className="bg-background px-1 rounded">hover:bg-emerald-600</code> → cor no hover</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Componente auxiliar para exibir cada exemplo */
function ComponenteItem({ nome, desc, pedido, children }: {
  nome: string;
  desc: string;
  pedido: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      <div>
        <div className="font-semibold text-sm">{nome}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <div className="py-2">{children}</div>
      <div className="text-[11px] bg-muted p-2 rounded italic text-muted-foreground">
        📣 Exemplo de pedido: {pedido}
      </div>
    </div>
  );
}

/** Converte rgb(r,g,b) para #RRGGBB */
function rgbToHex(rgb: string): string {
  const match = rgb.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return rgb;
  const [, r, g, b] = match;
  return '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Cor semântica */
function CorItem({ nome, classe, desc, border }: { nome: string; classe: string; desc: string; border?: boolean }) {
  const [hex, setHex] = useState('');
  const [copiado, setCopiado] = useState(false);

  const refCallback = (el: HTMLDivElement | null) => {
    if (el) {
      const bg = getComputedStyle(el).backgroundColor;
      setHex(rgbToHex(bg));
    }
  };

  const copiar = () => {
    if (!hex) return;
    navigator.clipboard.writeText(hex);
    toast.success(`Copiado: ${hex}`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <div
      className="border rounded-lg p-3 space-y-1.5 cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
      onClick={copiar}
      title={`Clique para copiar ${hex}`}
    >
      <div ref={refCallback} className={`h-10 rounded ${classe} ${border ? 'border' : ''}`} />
      <div className="font-mono text-xs font-semibold">{nome}</div>
      <div className="font-mono text-[10px] text-muted-foreground">{copiado ? '✅ Copiado!' : hex || '...'}</div>
      <div className="text-[10px] text-muted-foreground">{desc}</div>
    </div>
  );
}

/** Cor Tailwind direta */
function CorDireta({ nome, hex, classe, textDark }: { nome: string; hex: string; classe: string; textDark?: boolean }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = () => {
    navigator.clipboard.writeText(hex);
    toast.success(`Copiado: ${hex}`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <div
      className="text-center space-y-1 cursor-pointer hover:ring-2 hover:ring-primary/40 rounded-lg p-1.5 transition-all"
      onClick={copiar}
      title={`Clique para copiar ${hex}`}
    >
      <div className={`h-8 rounded ${classe}`} />
      <div className="font-mono text-[10px] font-semibold">{nome}</div>
      <div className={`font-mono text-[10px] ${textDark ? 'text-foreground' : 'text-muted-foreground'}`}>
        {copiado ? '✅ Copiado!' : hex}
      </div>
    </div>
  );
}

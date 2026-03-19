import { useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useTiposDesligamento,
  useCreateTipoDesligamento,
  useUpdateTipoDesligamento,
  useDeleteTipoDesligamento,
  TipoDesligamento,
} from '@/hooks/useTiposDesligamento';

const EMOJIS = ['✋', '📋', '⚠️', '📅', '⏩', '🚪', '📝', '❌', '✅', '🔄'];

const TEMPLATE_PADRAO = `Por não mais convir a esta empresa mantê-lo(a) em nosso quadro de funcionários, vimos comunicar-lhe a rescisão de seu contrato de trabalho a partir desta data.

Solicitamos seu comparecimento ao setor de enfermaria no dia {DATA_EXAME} às {HORA_EXAME}h para se dar cumprimento às formalidades legais como exame demissional, e devolução dos EPIs fornecidos.

Informamos ainda que, no dia {DATA_HOMOLOGACAO} às {HORA_HOMOLOGACAO}h deverá comparecer no RH para entrega da documentação referente ao saque do FGTS e guias do seguro desemprego, bem como o TRCT e comprovante de pagamento, na forma do disposto no artigo 477, § 6°, da CLT.

Qualquer dúvida, entrar em contato com a área de Recursos Humanos (telefone 19 3856-9267).`;

interface FormState {
  nome: string;
  descricao: string;
  emoji: string;
  tem_exame_demissional: boolean;
  tem_homologacao: boolean;
  ativo: boolean;
  template_texto: string;
}

const FORM_VAZIO: FormState = {
  nome: '',
  descricao: '',
  emoji: '📋',
  tem_exame_demissional: true,
  tem_homologacao: false,
  ativo: true,
  template_texto: TEMPLATE_PADRAO,
};

export default function TiposDesligamento() {
  const { data: tipos = [], isLoading } = useTiposDesligamento();
  const criar = useCreateTipoDesligamento();
  const atualizar = useUpdateTipoDesligamento();
  const excluir = useDeleteTipoDesligamento();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<TipoDesligamento | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [deleteTarget, setDeleteTarget] = useState<TipoDesligamento | null>(null);

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setDialogOpen(true);
  };

  const abrirEdicao = (tipo: TipoDesligamento) => {
    setEditando(tipo);
    setForm({
      nome: tipo.nome,
      descricao: tipo.descricao || '',
      emoji: tipo.emoji || '📋',
      tem_exame_demissional: tipo.tem_exame_demissional,
      tem_homologacao: tipo.tem_homologacao,
      ativo: tipo.ativo,
      template_texto: tipo.template_texto || TEMPLATE_PADRAO,
    });
    setDialogOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return;

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      emoji: form.emoji,
      tem_exame_demissional: form.tem_exame_demissional,
      tem_homologacao: form.tem_homologacao,
      ativo: form.ativo,
      template_texto: form.template_texto.trim(),
      ordem: editando?.ordem ?? tipos.length + 1,
    };

    if (editando) {
      await atualizar.mutateAsync({ id: editando.id, ...payload });
    } else {
      await criar.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleExcluir = async () => {
    if (!deleteTarget) return;
    await excluir.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const toggleAtivo = async (tipo: TipoDesligamento) => {
    await atualizar.mutateAsync({ id: tipo.id, ativo: !tipo.ativo });
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">TIPOS DE DESLIGAMENTO</h1>
          <p className="page-description">GERENCIE OS MOTIVOS E MODELOS DE CARTA DE DESLIGAMENTO</p>
        </div>
        <Button onClick={abrirNovo} className="gap-2">
          <Plus className="h-4 w-4" />
          NOVO TIPO
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {tipos.map((tipo) => (
            <div
              key={tipo.id}
              className={`flex items-start gap-4 p-4 rounded-lg border bg-card transition-opacity ${!tipo.ativo ? 'opacity-50' : ''}`}
            >
              <span className="text-2xl shrink-0 mt-0.5">{tipo.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{tipo.nome}</span>
                  <Badge variant={tipo.ativo ? 'default' : 'secondary'} className="text-xs">
                    {tipo.ativo ? 'ATIVO' : 'INATIVO'}
                  </Badge>
                  {tipo.tem_exame_demissional && (
                    <Badge variant="outline" className="text-xs text-primary border-primary/40">
                      Exame demissional
                    </Badge>
                  )}
                  {tipo.tem_homologacao && (
                    <Badge variant="outline" className="text-xs text-accent-foreground border-accent">
                      Homologação
                    </Badge>
                  )}
                </div>
                {tipo.descricao && (
                  <p className="text-xs text-muted-foreground mt-1">{tipo.descricao}</p>
                )}
                {tipo.template_texto && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-mono bg-muted/50 px-2 py-1 rounded">
                    {tipo.template_texto.substring(0, 120)}…
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAtivo(tipo)}
                  className="h-8 w-8 p-0"
                  title={tipo.ativo ? 'Desativar' : 'Ativar'}
                >
                  {tipo.ativo
                    ? <CheckCircle className="h-4 w-4 text-primary" />
                    : <XCircle className="h-4 w-4 text-muted-foreground" />
                  }
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => abrirEdicao(tipo)}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(tipo)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {tipos.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Nenhum tipo de desligamento cadastrado.</p>
              <Button variant="outline" className="mt-3 gap-2" onClick={abrirNovo}>
                <Plus className="h-4 w-4" />
                Adicionar primeiro tipo
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando ? 'EDITAR TIPO DE DESLIGAMENTO' : 'NOVO TIPO DE DESLIGAMENTO'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-5">
            {/* Emoji */}
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex gap-2 flex-wrap">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, emoji: e }))}
                    className={`text-2xl p-2 rounded-lg border transition-all ${
                      form.emoji === e
                        ? 'border-primary bg-primary/10 scale-110'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Nome */}
            <div className="space-y-1">
              <Label>Nome do tipo *</Label>
              <Input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Dispensa S/ Justa Causa"
                required
              />
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Breve descrição do motivo"
              />
            </div>

            {/* Campos de data */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Switch
                  id="exame"
                  checked={form.tem_exame_demissional}
                  onCheckedChange={v => setForm(f => ({ ...f, tem_exame_demissional: v }))}
                />
                <Label htmlFor="exame" className="cursor-pointer">
                  <div className="font-medium text-sm">Exame Demissional</div>
                  <div className="text-xs text-muted-foreground">Exibir campo de data/hora do exame</div>
                </Label>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Switch
                  id="homolog"
                  checked={form.tem_homologacao}
                  onCheckedChange={v => setForm(f => ({ ...f, tem_homologacao: v }))}
                />
                <Label htmlFor="homolog" className="cursor-pointer">
                  <div className="font-medium text-sm">Homologação</div>
                  <div className="text-xs text-muted-foreground">Exibir campo de data/hora da homologação</div>
                </Label>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3">
              <Switch
                id="ativo"
                checked={form.ativo}
                onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))}
              />
              <Label htmlFor="ativo">Tipo ativo (aparece na seleção de carta)</Label>
            </div>

            {/* Template de texto */}
            <div className="space-y-2">
              <Label>
                Modelo de texto da carta
              </Label>
              <div className="flex flex-wrap gap-1 mb-1">
                {['{NOME}', '{MATRICULA}', '{CARGO}', '{CIDADE}', '{DATA_DESLIGAMENTO}', '{DATA_DESLIGAMENTO_CURTA}', '{DATA_EXAME}', '{HORA_EXAME}', '{DATA_HOMOLOGACAO}', '{HORA_HOMOLOGACAO}'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, template_texto: f.template_texto + v }))}
                    className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded hover:bg-primary/20 font-mono"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Textarea
                value={form.template_texto}
                onChange={e => setForm(f => ({ ...f, template_texto: e.target.value }))}
                rows={8}
                className="font-mono text-xs"
                placeholder="Texto da carta..."
              />
              <p className="text-xs text-muted-foreground">
                Clique nas variáveis acima para inserí-las no texto. Elas serão substituídas automaticamente pelos dados do funcionário ao gerar a carta.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={criar.isPending || atualizar.isPending}>
                {editando ? 'SALVAR ALTERAÇÕES' : 'CRIAR TIPO'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tipo de desligamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O tipo <strong>{deleteTarget?.nome}</strong> será removido permanentemente.
              Isso não afeta demissões já registradas com este tipo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

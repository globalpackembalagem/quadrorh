import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileCheck, History, CheckCircle2, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUpdateDocumentoStatus, usePrevisaoDocumentosHistorico } from '@/hooks/usePrevisaoDocumentos';
import { useAuth } from '@/hooks/useAuth';
import { Funcionario } from '@/types/database';
import { toast } from 'sonner';

interface DocumentoStatusDialogProps {
  funcionario: Funcionario | null;
  currentStatus: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isRealParceria(nome: string) {
  return nome.toUpperCase() === 'REAL PARCERIA';
}

function canSeeHistorico(nome: string, isAdmin: boolean) {
  return isAdmin || nome.toUpperCase() === 'SONIA';
}

export function DocumentoStatusDialog({ funcionario, currentStatus, open, onOpenChange }: DocumentoStatusDialogProps) {
  const { userRole, isAdmin } = useAuth();
  const updateStatus = useUpdateDocumentoStatus();
  const showHistorico = canSeeHistorico(userRole.nome, isAdmin);
  const { data: historico = [] } = usePrevisaoDocumentosHistorico(showHistorico ? funcionario?.id : undefined);
  const [tab, setTab] = useState('acoes');
  const [confirmado, setConfirmado] = useState(false);

  const isParceria = isRealParceria(userRole.nome);
  const jaConfirmou = currentStatus === 'documentos_ok';

  if (!funcionario) return null;

  const handleConfirmarOk = async () => {
    await updateStatus.mutateAsync({
      funcionarioId: funcionario.id,
      status: 'documentos_ok',
      usuarioNome: userRole.nome,
    });
    toast.success('Documentos confirmados com sucesso!');
    setConfirmado(false);
    onOpenChange(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'documentos_ok':
        return <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> DOCUMENTOS OK</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> PENDENTE</Badge>;
    }
  };

  // ===== REAL PARCERIA: diálogo simplificado =====
  if (isParceria) {
    return (
      <Dialog open={open} onOpenChange={(v) => { setConfirmado(false); onOpenChange(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{funcionario.nome_completo}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex gap-4">
              <span><strong>Setor:</strong> {funcionario.setor?.nome || '-'}</span>
              <span><strong>Cargo:</strong> {funcionario.cargo || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <strong>Status:</strong> {getStatusBadge(currentStatus || 'pendente')}
            </div>
          </div>

          {jaConfirmou ? (
            <div className="mt-4 p-4 rounded-lg border bg-green-50 text-green-800 text-center space-y-1">
              <CheckCircle2 className="h-8 w-8 mx-auto text-green-600" />
              <p className="font-semibold">Documentos já confirmados</p>
              <p className="text-sm text-green-600">Não é possível alterar após a confirmação.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="p-4 rounded-lg border bg-amber-50 text-amber-800 text-sm">
                <p className="font-medium mb-1">⚠️ Atenção</p>
                <p>Ao confirmar, você está declarando que <strong>TODOS os documentos foram entregues</strong>. Esta ação <strong>não poderá ser desfeita</strong>.</p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <Checkbox
                  id="confirmar-docs"
                  checked={confirmado}
                  onCheckedChange={(v) => setConfirmado(v === true)}
                />
                <label htmlFor="confirmar-docs" className="text-sm cursor-pointer leading-tight">
                  Confirmo que <strong>todos os documentos</strong> deste candidato foram entregues e estão corretos.
                </label>
              </div>

              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white h-12 text-base"
                onClick={handleConfirmarOk}
                disabled={!confirmado || updateStatus.isPending}
              >
                <FileCheck className="h-5 w-5" />
                CONFIRMAR DOCUMENTOS OK
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // ===== ADMIN / SONIA: diálogo completo com histórico =====
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{funcionario.nome_completo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex gap-4">
            <span><strong>Setor:</strong> {funcionario.setor?.nome || '-'}</span>
            <span><strong>Cargo:</strong> {funcionario.cargo || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <strong>Status atual:</strong> {getStatusBadge(currentStatus || 'pendente')}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="acoes">Status</TabsTrigger>
            {showHistorico && (
              <TabsTrigger value="historico" className="gap-1">
                <History className="h-3.5 w-3.5" /> Histórico
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="acoes" className="space-y-3 pt-4">
            <Button
              className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white h-12 text-base"
              onClick={async () => {
                await updateStatus.mutateAsync({
                  funcionarioId: funcionario.id,
                  status: 'documentos_ok',
                  usuarioNome: userRole.nome,
                });
                toast.success('Documentos marcados como OK!');
              }}
              disabled={updateStatus.isPending || currentStatus === 'documentos_ok'}
            >
              <FileCheck className="h-5 w-5" />
              DOCUMENTOS OK
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 h-12 text-base"
              onClick={async () => {
                await updateStatus.mutateAsync({
                  funcionarioId: funcionario.id,
                  status: 'pendente',
                  usuarioNome: userRole.nome,
                });
                toast.success('Status resetado para PENDENTE');
              }}
              disabled={updateStatus.isPending || !currentStatus || currentStatus === 'pendente'}
            >
              <Clock className="h-5 w-5" />
              RESETAR PARA PENDENTE
            </Button>
          </TabsContent>

          {showHistorico && (
            <TabsContent value="historico" className="pt-4">
              {historico.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Nenhum registro ainda</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {historico.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {h.status_anterior && (
                            <>
                              {getStatusBadge(h.status_anterior)}
                              <span className="text-muted-foreground">→</span>
                            </>
                          )}
                          {getStatusBadge(h.status_novo)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          por <strong>{h.usuario_nome}</strong> em{' '}
                          {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, ImageDown, Pencil, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { funcionariosApi } from "@/lib/funcionariosApi";
import { loadXLSX } from "@/lib/xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FuncionarioFotoControle = {
  id: string;
  matricula: string | null;
  nome_completo: string;
  data_admissao: string | null;
  setor_id: string | null;
  cargo: string | null;
  situacao?: { nome: string | null } | null;
  setor?: { nome: string | null } | null;
  tem_foto: boolean | null;
  foto_arquivo_nome: string | null;
  foto_storage_path: string | null;
  foto_verificada_em: string | null;
  foto_baixada_em: string | null;
  telefone_whatsapp: string | null;
  usa_fretado: boolean | null;
  linha_fretado: string | null;
};

const linhasFretado = ["VARZEA A", "VARZEA B", "CAMPINAS", "LOUVEIRA"];

function normalizar(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function formatDate(isoDate?: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate || "");
  if (!match) return "-";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function toDateKey(valor?: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || "");
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function nomeArquivoFoto(func: FuncionarioFotoControle) {
  const nome = normalizar(func.nome_completo)
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const matricula = normalizar(func.matricula || "TEMP").replace(/[^A-Z0-9]+/g, "");
  return `${nome}_${matricula}.jpg`;
}

function contaParaControleFotos(func: FuncionarioFotoControle) {
  const situacao = normalizar(func.situacao?.nome || "");
  const situacoesSemFoto = [
    "PEDIDO DEMISSAO",
    "PEDIDO DE DEMISSAO",
    "PED. DEMISSAO",
    "DEMISSAO",
    "TERMINO CONTRATO",
    "TERMINO DE CONTRATO",
  ];
  return !situacoesSemFoto.includes(situacao) && !situacao.includes("DESLIG");
}

function temFotoValida(func: FuncionarioFotoControle) {
  return func.tem_foto === true && Boolean(func.foto_storage_path || func.foto_arquivo_nome);
}

function getSessionToken() {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuario_logado") || "null");
    return usuario?.session_token || null;
  } catch {
    return null;
  }
}

function formatData(valor?: string | null) {
  if (!valor) return "-";
  return new Date(valor).toLocaleString("pt-BR");
}

function getUsuarioLogado() {
  try {
    return JSON.parse(localStorage.getItem("usuario_logado") || "null");
  } catch {
    return null;
  }
}

export default function ControleFotos() {
  const queryClient = useQueryClient();
  const usuarioLogado = getUsuarioLogado();
  const isAdmin = usuarioLogado?.acesso_admin === true;
  const [busca, setBusca] = useState("");
  const [statusFoto, setStatusFoto] = useState<"TODOS" | "COM" | "SEM">("SEM");
  const [statusDownload, setStatusDownload] = useState<"TODOS" | "NAO_BAIXADAS" | "BAIXADAS">("TODOS");
  const [dataDownload, setDataDownload] = useState(new Date().toISOString().slice(0, 10));
  const [setoresSelecionados, setSetoresSelecionados] = useState<string[]>([]);
  const [mostrarResumoSetores, setMostrarResumoSetores] = useState(false);
  const [editando, setEditando] = useState<FuncionarioFotoControle | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [baixandoTodos, setBaixandoTodos] = useState(false);

  const { data: funcionarios = [], isLoading, refetch } = useQuery({
    queryKey: ["controle-fotos-funcionarios"],
    queryFn: async () => {
      const todos: FuncionarioFotoControle[] = [];
      const tamanhoPagina = 1000;
      let pagina = 0;

      while (true) {
        const inicio = pagina * tamanhoPagina;
        const fim = inicio + tamanhoPagina - 1;
        const { data, error } = await supabase
          .from("funcionarios")
          .select("id,matricula,nome_completo,data_admissao,setor_id,cargo,tem_foto,foto_arquivo_nome,foto_storage_path,foto_verificada_em,foto_baixada_em,telefone_whatsapp,usa_fretado,linha_fretado,setor:setores!setor_id(nome),situacao:situacoes!situacao_id(nome)")
          .order("nome_completo")
          .range(inicio, fim);

        if (error) throw error;

        const lote = (data || []) as FuncionarioFotoControle[];
        todos.push(...lote);
        if (lote.length < tamanhoPagina) break;
        pagina += 1;
      }

      return todos;
    },
  });

  const setores = useMemo(() => {
    return Array.from(new Set(funcionarios.filter(contaParaControleFotos).map((f) => f.setor?.nome).filter(Boolean) as string[])).sort();
  }, [funcionarios]);

  const funcionariosControle = useMemo(() => {
    return funcionarios.filter(contaParaControleFotos);
  }, [funcionarios]);

  const resumoSetores = useMemo(() => {
    return setores.map((setor) => {
      const lista = funcionariosControle.filter((func) => func.setor?.nome === setor);
      const semFoto = lista.filter((func) => !temFotoValida(func)).length;
      const comFoto = lista.length - semFoto;
      return { setor, total: lista.length, semFoto, comFoto };
    }).filter((item) => item.semFoto > 0).sort((a, b) => b.semFoto - a.semFoto || a.setor.localeCompare(b.setor));
  }, [funcionariosControle, setores]);

  const alternarSetor = (setor: string) => {
    setSetoresSelecionados((atuais) => (
      atuais.includes(setor) ? atuais.filter((item) => item !== setor) : [...atuais, setor]
    ));
  };

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return funcionariosControle.filter((func) => {
      const temFoto = temFotoValida(func);
      if (statusFoto === "COM" && !temFoto) return false;
      if (statusFoto === "SEM" && temFoto) return false;
      if (statusDownload === "NAO_BAIXADAS" && (!temFoto || func.foto_baixada_em)) return false;
      if (statusDownload === "BAIXADAS" && (!temFoto || !func.foto_baixada_em)) return false;
      if (setoresSelecionados.length > 0 && !setoresSelecionados.includes(func.setor?.nome || "")) return false;
      if (!termo) return true;
      const alvo = normalizar(`${func.nome_completo} ${func.matricula || ""} ${func.setor?.nome || ""}`);
      return alvo.includes(termo);
    });
  }, [busca, funcionariosControle, setoresSelecionados, statusDownload, statusFoto]);

  const totais = useMemo(() => {
    const com = funcionariosControle.filter(temFotoValida).length;
    return { total: funcionariosControle.length, com, sem: funcionariosControle.length - com };
  }, [funcionariosControle]);

  const resumoDownloadData = useMemo(() => {
    const fotosDaData = funcionariosControle.filter((f) =>
      f.foto_storage_path && toDateKey(f.foto_verificada_em) === dataDownload
    );
    const baixadas = fotosDaData.filter((f) => f.foto_baixada_em).length;
    const pendentes = fotosDaData.length - baixadas;
    const ultimoDownload = fotosDaData
      .map((f) => f.foto_baixada_em)
      .filter(Boolean)
      .sort()
      .at(-1) || null;
    return { total: fotosDaData.length, baixadas, pendentes, ultimoDownload };
  }, [dataDownload, funcionariosControle]);

  const salvarEdicao = async () => {
    if (!editando) return;
    setSalvando(true);
    try {
      const payload = {
        tem_foto: editando.tem_foto === true,
        foto_arquivo_nome: editando.foto_arquivo_nome || null,
        foto_verificada_em: editando.tem_foto ? (editando.foto_verificada_em || new Date().toISOString()) : null,
        telefone_whatsapp: editando.telefone_whatsapp || null,
        usa_fretado: editando.usa_fretado === true,
        linha_fretado: editando.usa_fretado ? (editando.linha_fretado || null) : null,
      };
      const { error } = await funcionariosApi.update(payload, { eq: { id: editando.id } });
      if (error) throw error;
      toast.success("Cadastro de foto atualizado.");
      setEditando(null);
      queryClient.invalidateQueries({ queryKey: ["controle-fotos-funcionarios"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const limparDadosFoto = async (func: FuncionarioFotoControle) => {
    if (!isAdmin) {
      toast.error("Apenas admin pode limpar dados de foto.");
      return;
    }
    const confirmar = window.confirm(`Limpar foto e dados de coleta de ${func.nome_completo}?`);
    if (!confirmar) return;

    try {
      const payload = {
        tem_foto: false,
        foto_arquivo_nome: null,
        foto_storage_path: null,
        foto_verificada_em: null,
        foto_baixada_em: null,
        telefone_whatsapp: null,
        usa_fretado: null,
        linha_fretado: null,
      };
      const { error } = await funcionariosApi.update(payload, { eq: { id: func.id } });
      if (error) throw error;
      toast.success("Dados de foto limpos.");
      queryClient.invalidateQueries({ queryKey: ["controle-fotos-funcionarios"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao limpar dados.");
    }
  };

  const gerarUrlFoto = async (path: string) => {
    const sessionToken = getSessionToken();
    if (!sessionToken) throw new Error("Sessao expirada. Entre novamente.");
    const { data, error } = await supabase.functions.invoke("auth-handler", {
      body: { action: "admin_foto_download_url", session_token: sessionToken, path },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (!data?.url) throw new Error("URL da foto nao foi gerada.");
    return data.url as string;
  };

  const baixarFoto = async (func: FuncionarioFotoControle) => {
    if (!func.foto_storage_path) {
      toast.error("Funcionario sem caminho de foto.");
      return;
    }
    try {
      const url = await gerarUrlFoto(func.foto_storage_path);
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeArquivoFoto(func);
      link.target = "_blank";
      link.click();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao baixar foto.");
    }
  };

  function baixarBase64(base64: string, filename: string, contentType: string) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  const baixarFotosFiltradas = async () => {
    const comCaminho = filtrados.filter((f) => f.foto_storage_path);
    if (comCaminho.length === 0) {
      toast.error("Nenhuma foto com caminho para baixar.");
      return;
    }
    setBaixandoTodos(true);
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) throw new Error("Sessao expirada. Entre novamente.");
      const fotos = comCaminho.map((func) => ({
        id: func.id,
        path: func.foto_storage_path,
        nome: nomeArquivoFoto(func),
      }));
      const { data, error } = await supabase.functions.invoke("auth-handler", {
        body: { action: "admin_fotos_zip", session_token: sessionToken, fotos },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      baixarBase64(data.base64, data.filename || "fotos_funcionarios.zip", data.content_type || "application/zip");
      toast.success(`ZIP gerado com ${data.total || 0} foto(s).`);
      queryClient.invalidateQueries({ queryKey: ["controle-fotos-funcionarios"] });
      if (Array.isArray(data.erros) && data.erros.length > 0) {
        toast.warning(`${data.erros.length} foto(s) nao foram encontradas no Storage.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar ZIP.");
    } finally {
      setBaixandoTodos(false);
    }
  };

  const baixarFotosDaData = async () => {
    const fotosDaData = funcionariosControle.filter((f) =>
      f.foto_storage_path && toDateKey(f.foto_verificada_em) === dataDownload && !f.foto_baixada_em
    );
    if (fotosDaData.length === 0) {
      toast.error("Nenhuma foto pendente para baixar nessa data.");
      return;
    }
    setBaixandoTodos(true);
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) throw new Error("Sessao expirada. Entre novamente.");
      const fotos = fotosDaData.map((func) => ({
        id: func.id,
        path: func.foto_storage_path,
        nome: nomeArquivoFoto(func),
      }));
      const { data, error } = await supabase.functions.invoke("auth-handler", {
        body: { action: "admin_fotos_zip", session_token: sessionToken, fotos },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      baixarBase64(data.base64, `FOTOS_${dataDownload}.zip`, data.content_type || "application/zip");
      toast.success(`ZIP da data gerado com ${data.total || 0} foto(s).`);
      queryClient.invalidateQueries({ queryKey: ["controle-fotos-funcionarios"] });
      if (Array.isArray(data.erros) && data.erros.length > 0) {
        toast.warning(`${data.erros.length} foto(s) nao foram encontradas no Storage.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar ZIP da data.");
    } finally {
      setBaixandoTodos(false);
    }
  };

  const exportarExcel = async () => {
    const XLSX = await loadXLSX();
    const rows = filtrados.map((func) => ({
      MATRICULA: func.matricula || "",
      NOME: func.nome_completo,
      ADMISSAO: formatDate(func.data_admissao),
      SETOR: func.setor?.nome || "",
      SITUACAO: func.situacao?.nome || "",
      "TEM FOTO": func.tem_foto ? "SIM" : "NAO",
      "ARQUIVO FOTO": func.foto_arquivo_nome || "",
      "CAMINHO FOTO": func.foto_storage_path || "",
      "VERIFICADA EM": formatData(func.foto_verificada_em),
      "BAIXADA EM": formatData(func.foto_baixada_em),
      TELEFONE: func.telefone_whatsapp || "",
      FRETADO: func.usa_fretado ? "SIM" : "NAO",
      "LINHA FRETADO": func.linha_fretado || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CONTROLE FOTOS");
    XLSX.writeFile(wb, `controle_fotos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 space-y-4 bg-background/95 pb-3 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-normal text-foreground">CONTROLE DE FOTOS</h1>
            <p className="text-sm text-muted-foreground">Acompanhe quem ja tem foto, corrija baixas manuais e exporte a conferencia.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
            </Button>
            <Button variant="outline" onClick={exportarExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button onClick={baixarFotosFiltradas} disabled={baixandoTodos}>
              <ImageDown className="mr-2 h-4 w-4" /> Gerar ZIP das filtradas
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">TOTAL ATIVOS</div><div className="text-2xl font-bold">{totais.total}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">COM FOTO</div><div className="text-2xl font-bold text-emerald-600">{totais.com}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">SEM FOTO</div><div className="text-2xl font-bold text-red-600">{totais.sem}</div></CardContent></Card>
        </div>

        <Card>
          <CardContent className="grid gap-3 p-4 lg:grid-cols-[180px_1fr_1fr_1fr_1fr_auto] lg:items-end">
            <div className="space-y-1">
              <Label>Data da foto</Label>
              <Input type="date" value={dataDownload} onChange={(e) => setDataDownload(e.target.value)} />
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">FOTOS DA DATA</div>
              <div className="text-xl font-bold">{resumoDownloadData.total}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">BAIXADAS</div>
              <div className="text-xl font-bold text-emerald-600">{resumoDownloadData.baixadas}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">PENDENTES</div>
              <div className="text-xl font-bold text-red-600">{resumoDownloadData.pendentes}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">ULTIMO DOWNLOAD</div>
              <div className="text-sm font-semibold">{formatData(resumoDownloadData.ultimoDownload)}</div>
            </div>
            <Button onClick={baixarFotosDaData} disabled={baixandoTodos || resumoDownloadData.pendentes === 0}>
              <ImageDown className="mr-2 h-4 w-4" /> Baixar fotos da data
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base">FALTAM FOTOS POR SETOR</CardTitle>
              <div className="flex flex-wrap gap-2">
                {setoresSelecionados.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setSetoresSelecionados([])}>
                    Limpar setores ({setoresSelecionados.length})
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setMostrarResumoSetores((valor) => !valor)}>
                  {mostrarResumoSetores ? "Ocultar setores" : `Ver setores (${resumoSetores.length})`}
                </Button>
              </div>
            </div>
          </CardHeader>
          {mostrarResumoSetores && (
            <CardContent>
              <div className="max-h-52 overflow-y-auto pr-1">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                  {resumoSetores.map((item) => {
                    const selecionado = setoresSelecionados.includes(item.setor);
                    return (
                      <button
                        key={item.setor}
                        type="button"
                        onClick={() => alternarSetor(item.setor)}
                        className={`rounded-md border p-3 text-left transition hover:border-primary hover:bg-primary/5 ${
                          selecionado ? "border-primary bg-primary/10 ring-1 ring-primary" : "bg-background"
                        }`}
                      >
                        <div className="truncate text-xs font-semibold text-muted-foreground">{item.setor}</div>
                        <div className="mt-2 text-2xl font-bold text-red-600">{item.semFoto}</div>
                        <div className="text-xs text-muted-foreground">{item.total} ativos | {item.comFoto} com foto</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">FILTROS</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_180px_190px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, matricula ou setor" className="pl-9" />
            </div>
            <select value={statusFoto} onChange={(e) => setStatusFoto(e.target.value as any)} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="TODOS">TODOS</option>
              <option value="SEM">SEM FOTO</option>
              <option value="COM">COM FOTO</option>
            </select>
            <select value={statusDownload} onChange={(e) => setStatusDownload(e.target.value as any)} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="TODOS">TODOS DOWNLOADS</option>
              <option value="NAO_BAIXADAS">NAO BAIXADAS</option>
              <option value="BAIXADAS">BAIXADAS</option>
            </select>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[calc(100vh-360px)] min-h-[340px] overflow-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="sticky top-0 z-10 border-b bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-left">MATRICULA</th>
                  <th className="px-3 py-3 text-left">NOME</th>
                  <th className="px-3 py-3 text-left">ADMISSAO</th>
                  <th className="px-3 py-3 text-left">SETOR</th>
                  <th className="px-3 py-3 text-left">FOTO</th>
                  <th className="px-3 py-3 text-left">ARQUIVO</th>
                  <th className="px-3 py-3 text-left">VERIFICADA</th>
                  <th className="px-3 py-3 text-left">BAIXADA</th>
                  <th className="px-3 py-3 text-right">ACOES</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((func) => (
                  <tr key={func.id} className="border-b hover:bg-muted/30">
                    <td className="px-3 py-3">{func.matricula || "TEMP"}</td>
                    <td className="px-3 py-3 font-medium">{func.nome_completo}</td>
                    <td className="px-3 py-3">{formatDate(func.data_admissao)}</td>
                    <td className="px-3 py-3">{func.setor?.nome || "-"}</td>
                    <td className="px-3 py-3">
                      <Badge variant={func.tem_foto ? "default" : "destructive"}>{func.tem_foto ? "SIM" : "NAO"}</Badge>
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-3">{func.foto_arquivo_nome || "-"}</td>
                    <td className="px-3 py-3">{formatData(func.foto_verificada_em)}</td>
                    <td className="px-3 py-3">{formatData(func.foto_baixada_em)}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditando({ ...func })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => baixarFoto(func)} disabled={!func.foto_storage_path}>
                          <Download className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => limparDadosFoto(func)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && filtrados.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">Nenhum funcionario encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>EDITAR CONTROLE DE FOTO</DialogTitle>
          </DialogHeader>
          {editando && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3">
                <div className="font-semibold">{editando.nome_completo}</div>
                <div className="text-sm text-muted-foreground">{editando.matricula || "TEMP"} - {editando.setor?.nome || "SEM SETOR"}</div>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={editando.tem_foto === true} onChange={(e) => setEditando({ ...editando, tem_foto: e.target.checked })} />
                TEM FOTO
              </label>
              <div className="space-y-2">
                <Label>Nome do arquivo</Label>
                <Input value={editando.foto_arquivo_nome || ""} onChange={(e) => setEditando({ ...editando, foto_arquivo_nome: e.target.value })} placeholder="Ex: NOME_FUNCIONARIO_123.jpg" />
              </div>
              <div className="space-y-2">
                <Label>Telefone/WhatsApp</Label>
                <Input value={editando.telefone_whatsapp || ""} onChange={(e) => setEditando({ ...editando, telefone_whatsapp: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={editando.usa_fretado === true} onChange={(e) => setEditando({ ...editando, usa_fretado: e.target.checked, linha_fretado: e.target.checked ? editando.linha_fretado : null })} />
                USA FRETADO
              </label>
              {editando.usa_fretado && (
                <select value={editando.linha_fretado || ""} onChange={(e) => setEditando({ ...editando, linha_fretado: e.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">SELECIONE</option>
                  {linhasFretado.map((linha) => <option key={linha} value={linha}>{linha}</option>)}
                </select>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={salvarEdicao} disabled={salvando}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

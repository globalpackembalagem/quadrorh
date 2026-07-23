import { useMemo, useState } from "react";
import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, FileSpreadsheet, ImageDown, Pencil, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { funcionariosApi } from "@/lib/funcionariosApi";
import { isFolgaEscalaDecoracao } from "@/lib/escalaPanama";
import { loadXLSX } from "@/lib/xlsx";
import { formatarDataHoraSegura } from "@/lib/datas";
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
  turma: string | null;
  situacao?: { nome: string | null; conta_no_quadro?: boolean | null; ativa?: boolean | null } | null;
  setor?: { nome: string | null; grupo?: string | null; conta_no_quadro?: boolean | null; ativo?: boolean | null } | null;
  tem_foto: boolean | null;
  foto_arquivo_nome: string | null;
  foto_storage_path: string | null;
  foto_verificada_em: string | null;
  foto_baixada_em: string | null;
  telefone_whatsapp: string | null;
  usa_fretado: boolean | null;
  linha_fretado: string | null;
  foto_nao_precisa?: boolean;
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
    "PEDIDO DEMISAO",
    "PEDIDO DE DEMISSAO",
    "PED. DEMISSAO",
    "DEMISSAO",
    "DMEISSAO",
    "TERMINO CONTRATO",
    "TERMINO DE CONTRATO",
  ];
  return !situacoesSemFoto.includes(situacao);
}

function temFotoValida(func: FuncionarioFotoControle) {
  return func.tem_foto === true && Boolean(func.foto_storage_path || func.foto_arquivo_nome);
}

function temFotoMarcada(func: FuncionarioFotoControle) {
  return func.tem_foto === true;
}

function naoPrecisaFoto(func: FuncionarioFotoControle) {
  return func.foto_nao_precisa === true || normalizar(func.foto_arquivo_nome || "") === "NAO PRECISA";
}

function fotoResolvida(func: FuncionarioFotoControle) {
  return temFotoMarcada(func) || naoPrecisaFoto(func);
}

function statusFotoLabel(func: FuncionarioFotoControle) {
  if (naoPrecisaFoto(func)) return "NAO PRECISA";
  return temFotoMarcada(func) ? "SIM" : "NAO";
}

function getStatusEscalaHoje(func: FuncionarioFotoControle) {
  const folga = isFolgaEscalaDecoracao(func.setor?.nome, func.turma, new Date());
  if (folga === null) return null;
  return folga ? "FOLGA" : "TRABALHANDO";
}
function grupoSetorControleFotos(func: FuncionarioFotoControle) {
  const grupo = normalizar(func.setor?.grupo || "").replace(/\s+/g, " ").trim();
  if (grupo === "SOPRO A" || grupo === "SOPRO B" || grupo === "SOPRO C") return grupo;

  const setor = normalizar(func.setor?.nome || "").replace(/\s+/g, " ").trim();
  if (setor.includes("DECORACAO") && setor.includes("DIA")) return "DECORACAO DIA";
  if (setor.includes("DECORACAO") && setor.includes("NOITE")) return "DECORACAO NOITE";

  return func.setor?.nome || "SEM SETOR";
}

function contaNoQuadroControleFotos(func: FuncionarioFotoControle) {
  return (
    func.setor?.conta_no_quadro === true &&
    func.setor?.ativo === true &&
    func.situacao?.conta_no_quadro === true &&
    func.situacao?.ativa === true
  );
}

function grupoUsaRegraDoQuadro(grupo: string) {
  return ["SOPRO A", "SOPRO B", "SOPRO C", "DECORACAO DIA", "DECORACAO NOITE"].includes(normalizar(grupo));
}

const ordemGruposLideranca = ["SOPRO A", "SOPRO B", "SOPRO C", "DECORACAO DIA", "DECORACAO NOITE"];

function ordenarResumoSetores(a: { setor: string; semFoto: number }, b: { setor: string; semFoto: number }) {
  const grupoA = normalizar(a.setor);
  const grupoB = normalizar(b.setor);
  const idxA = ordemGruposLideranca.indexOf(grupoA);
  const idxB = ordemGruposLideranca.indexOf(grupoB);
  if (idxA !== -1 || idxB !== -1) {
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  }
  return a.setor.localeCompare(b.setor);
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
  return formatarDataHoraSegura(valor);
}

function getUsuarioLogado() {
  try {
    return JSON.parse(localStorage.getItem("usuario_logado") || "null");
  } catch {
    return null;
  }
}

async function resizeImageToDataUrl(file: File, maxSize = 900, quality = 0.72) {
  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Nao foi possivel processar a imagem."));
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Nao foi possivel compactar a foto."));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        }, "image/jpeg", quality);
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Imagem invalida."));
    };
    img.src = objectUrl;
  });
}

export default function ControleFotos() {
  const queryClient = useQueryClient();
  const usuarioLogado = getUsuarioLogado();
  const isAdmin = usuarioLogado?.acesso_admin === true;
  const [busca, setBusca] = useState("");
  const [filtroMatricula, setFiltroMatricula] = useState("");
  const [filtroNome, setFiltroNome] = useState("");
  const [statusFoto, setStatusFoto] = useState<"TODOS" | "COM" | "SEM">("SEM");
  const [statusDownload, setStatusDownload] = useState<"TODOS" | "NAO_BAIXADAS" | "BAIXADAS">("TODOS");
  const [setoresSelecionados, setSetoresSelecionados] = useState<string[]>([]);
  const [mostrarResumoSetores, setMostrarResumoSetores] = useState(false);
  const [editando, setEditando] = useState<FuncionarioFotoControle | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [baixandoTodos, setBaixandoTodos] = useState(false);
  const uploadFotoRef = useRef<HTMLInputElement | null>(null);

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
          .select("id,matricula,nome_completo,data_admissao,setor_id,cargo,turma,tem_foto,foto_arquivo_nome,foto_storage_path,foto_verificada_em,foto_baixada_em,telefone_whatsapp,usa_fretado,linha_fretado,setor:setores!setor_id(nome,grupo,conta_no_quadro,ativo),situacao:situacoes!situacao_id(nome,conta_no_quadro,ativa)")
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
    return Array.from(new Set(funcionarios.filter(contaParaControleFotos).map(grupoSetorControleFotos))).sort();
  }, [funcionarios]);

  const funcionariosControle = useMemo(() => {
    return funcionarios.filter(contaParaControleFotos);
  }, [funcionarios]);

  const resumoSetores = useMemo(() => {
    return setores.map((setor) => {
      const lista = funcionariosControle.filter((func) => {
        const grupo = grupoSetorControleFotos(func);
        if (grupo !== setor) return false;
        return grupoUsaRegraDoQuadro(grupo) ? contaNoQuadroControleFotos(func) : true;
      });
      const semFoto = lista.filter((func) => !fotoResolvida(func)).length;
      const comFoto = lista.length - semFoto;
      return { setor, total: lista.length, semFoto, comFoto };
    }).filter((item) => item.semFoto > 0).sort(ordenarResumoSetores);
  }, [funcionariosControle, setores]);

  const alternarSetor = (setor: string) => {
    setSetoresSelecionados((atuais) => (
      atuais.includes(setor) ? atuais.filter((item) => item !== setor) : [...atuais, setor]
    ));
  };

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    const termoMatricula = normalizar(filtroMatricula.trim());
    const termoNome = normalizar(filtroNome.trim());
    return funcionariosControle.filter((func) => {
      const temFoto = temFotoMarcada(func);
      const fotoValida = temFotoValida(func);
      const resolvida = fotoResolvida(func);
      if (statusFoto === "COM" && !temFoto) return false;
      if (statusFoto === "SEM" && resolvida) return false;
      if (statusDownload === "NAO_BAIXADAS" && (!fotoValida || func.foto_baixada_em)) return false;
      if (statusDownload === "BAIXADAS" && (!fotoValida || !func.foto_baixada_em)) return false;
      if (setoresSelecionados.length > 0) {
        const grupo = grupoSetorControleFotos(func);
        if (!setoresSelecionados.includes(grupo)) return false;
        if (grupoUsaRegraDoQuadro(grupo) && !contaNoQuadroControleFotos(func)) return false;
      }
      const alvo = normalizar(`${func.nome_completo} ${func.matricula || ""} ${func.setor?.nome || ""}`);
      if (termo && !alvo.includes(termo)) return false;
      if (termoMatricula && !normalizar(func.matricula || "TEMP").includes(termoMatricula)) return false;
      if (termoNome && !normalizar(func.nome_completo || "").includes(termoNome)) return false;
      return true;
    });
  }, [busca, filtroMatricula, filtroNome, funcionariosControle, setoresSelecionados, statusDownload, statusFoto]);

  const totais = useMemo(() => {
    const com = funcionariosControle.filter(temFotoMarcada).length;
    const sem = funcionariosControle.filter((func) => !fotoResolvida(func)).length;
    return { total: funcionariosControle.length, com, sem };
  }, [funcionariosControle]);


  const resumoDownload = useMemo(() => {
    const fotosComArquivo = funcionariosControle.filter((f) => f.foto_storage_path);
    const baixadas = fotosComArquivo.filter((f) => f.foto_baixada_em).length;
    const pendentes = fotosComArquivo.length - baixadas;
    const ultimoDownload = fotosComArquivo
      .map((f) => f.foto_baixada_em)
      .filter(Boolean)
      .sort()
      .at(-1) || null;
    return { total: fotosComArquivo.length, baixadas, pendentes, ultimoDownload };
  }, [funcionariosControle]);

  const salvarEdicao = async () => {
    if (!editando) return;
    setSalvando(true);
    try {
      const payload = {
        tem_foto: editando.foto_nao_precisa ? false : editando.tem_foto === true,
        foto_arquivo_nome: editando.foto_nao_precisa ? "NAO PRECISA" : editando.foto_arquivo_nome || null,
        foto_verificada_em: editando.tem_foto || editando.foto_nao_precisa ? (editando.foto_verificada_em || new Date().toISOString()) : null,
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

  const carregarFotoEdicao = async (file?: File) => {
    if (!file || !editando) return;
    setSalvando(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      const { data, error } = await supabase.functions.invoke("fotos-handler", {
        body: {
          action: "atualizar_funcionario_foto",
          codigo: "RHFOTO2026",
          funcionario_id: editando.id,
          imagem_base64: dataUrl,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Foto carregada com sucesso. Complete os dados e clique em Salvar.");
      setEditando((atual) => atual ? {
        ...atual,
        tem_foto: true,
        foto_nao_precisa: false,
        foto_arquivo_nome: data?.foto_arquivo_nome || atual.foto_arquivo_nome,
        foto_storage_path: data?.foto_storage_path || atual.foto_storage_path,
        foto_verificada_em: new Date().toISOString(),
      } : atual);
      queryClient.invalidateQueries({ queryKey: ["controle-fotos-funcionarios"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar foto.");
    } finally {
      setSalvando(false);
      if (uploadFotoRef.current) uploadFotoRef.current.value = "";
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
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao baixar arquivo da foto.");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = nomeArquivoFoto(func);
      link.click();
      URL.revokeObjectURL(objectUrl);
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

  const baixarFotosPendentes = async () => {
    const fotosPendentes = funcionariosControle.filter((f) =>
      f.foto_storage_path && !f.foto_baixada_em
    );
    if (fotosPendentes.length === 0) {
      toast.error("Nenhuma foto pendente para baixar.");
      return;
    }
    setBaixandoTodos(true);
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) throw new Error("Sessao expirada. Entre novamente.");
      const fotos = fotosPendentes.map((func) => ({
        id: func.id,
        path: func.foto_storage_path,
        nome: nomeArquivoFoto(func),
      }));
      const { data, error } = await supabase.functions.invoke("auth-handler", {
        body: { action: "admin_fotos_zip", session_token: sessionToken, fotos },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      baixarBase64(data.base64, "FOTOS_PENDENTES.zip", data.content_type || "application/zip");
      toast.success(`ZIP de pendentes gerado com ${data.total || 0} foto(s).`);
      queryClient.invalidateQueries({ queryKey: ["controle-fotos-funcionarios"] });
      if (Array.isArray(data.erros) && data.erros.length > 0) {
        toast.warning(`${data.erros.length} foto(s) nao foram encontradas no Storage.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar ZIP de pendentes.");
    } finally {
      setBaixandoTodos(false);
    }
  };

  const exportarExcel = async () => {
    const XLSX = await loadXLSX();
    const rows = funcionariosControle.map((func) => ({
      MATRICULA: func.matricula || "",
      NOME: func.nome_completo,
      ADMISSAO: formatDate(func.data_admissao),
      SETOR: func.setor?.nome || "",
      TURMA: func.turma || "",
      SITUACAO: func.situacao?.nome || "",
      "TEM FOTO": temFotoMarcada(func) ? "SIM" : "NAO",
      "NAO PRECISA FOTO": naoPrecisaFoto(func) ? "SIM" : "NAO",
      "ARQUIVO FOTO": naoPrecisaFoto(func) ? "" : func.foto_arquivo_nome || "",
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

  const copiarLinkCaptura = async () => {
    const link = "https://quadrorh-kohl.vercel.app/captura-fotos?rhfoto=1";
    await navigator.clipboard.writeText(link);
    toast.success("Link da captura copiado.");
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
            <Button onClick={() => window.open("/captura-fotos?rhfoto=1", "_blank", "noopener,noreferrer")}>
              <ImageDown className="mr-2 h-4 w-4" /> Iniciar captura
            </Button>
            <Button variant="outline" onClick={copiarLinkCaptura}>
              <Copy className="mr-2 h-4 w-4" /> Copiar link captura
            </Button>
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
          <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">FOTOS COM ARQUIVO</div>
              <div className="text-xl font-bold">{resumoDownload.total}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">JA BAIXADAS</div>
              <div className="text-xl font-bold text-emerald-600">{resumoDownload.baixadas}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">PENDENTES PARA BAIXAR</div>
              <div className="text-xl font-bold text-red-600">{resumoDownload.pendentes}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">ULTIMO DOWNLOAD</div>
              <div className="text-sm font-semibold">{formatData(resumoDownload.ultimoDownload)}</div>
            </div>
            <Button onClick={baixarFotosPendentes} disabled={baixandoTodos || resumoDownload.pendentes === 0}>
              <ImageDown className="mr-2 h-4 w-4" /> Baixar fotos pendentes
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
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_190px]">
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
              <Input value={filtroMatricula} onChange={(e) => setFiltroMatricula(e.target.value)} placeholder="Filtrar matricula" />
              <Input value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} placeholder="Filtrar nome" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Setores</Label>
                {setoresSelecionados.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSetoresSelecionados([])}>
                    Limpar setores ({setoresSelecionados.length})
                  </Button>
                )}
              </div>
              <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded-md border bg-background p-2">
                {resumoSetores.map((item) => {
                  const selecionado = setoresSelecionados.includes(item.setor);
                  return (
                    <button
                      key={item.setor}
                      type="button"
                      onClick={() => alternarSetor(item.setor)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        selecionado ? "border-primary bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      {item.setor} ({item.semFoto})
                    </button>
                  );
                })}
              </div>
            </div>
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
                {filtrados.map((func) => {
                  const fotoValida = temFotoValida(func);
                  const fotoMarcada = temFotoMarcada(func);
                  const naoPrecisa = naoPrecisaFoto(func);
                  const statusEscala = getStatusEscalaHoje(func);
                  return (
                    <tr key={func.id} className="border-b hover:bg-muted/30">
                      <td className="px-3 py-3">{func.matricula || "TEMP"}</td>
                      <td className="px-3 py-3 font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{func.nome_completo}</span>
                          {statusEscala && (
                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusEscala === "TRABALHANDO" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                              {statusEscala}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">{formatDate(func.data_admissao)}</td>
                      <td className="px-3 py-3">{func.setor?.nome || "-"}</td>
                      <td className="px-3 py-3">
                        <Badge variant={naoPrecisa ? "secondary" : fotoMarcada ? "default" : "destructive"}>
                          {statusFotoLabel(func)}
                        </Badge>
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-3">{naoPrecisa ? "-" : func.foto_arquivo_nome || "-"}</td>
                      <td className="px-3 py-3">{formatData(func.foto_verificada_em)}</td>
                      <td className="px-3 py-3">{formatData(func.foto_baixada_em)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditando({ ...func, foto_nao_precisa: naoPrecisaFoto(func) })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => baixarFoto(func)} disabled={!fotoValida || !func.foto_storage_path}>
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
                  );
                })}
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
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={editando.tem_foto === true && editando.foto_nao_precisa !== true}
                    onChange={(e) => setEditando({
                      ...editando,
                      tem_foto: e.target.checked,
                      foto_nao_precisa: e.target.checked ? false : editando.foto_nao_precisa,
                    })}
                  />
                  TEM FOTO
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={editando.foto_nao_precisa === true}
                    onChange={(e) => setEditando({
                      ...editando,
                      foto_nao_precisa: e.target.checked,
                      tem_foto: e.target.checked ? false : editando.tem_foto,
                      foto_arquivo_nome: e.target.checked ? "NAO PRECISA" : "",
                    })}
                  />
                  NAO PRECISA FOTO
                </label>
              </div>
              <div className="space-y-2">
                <Label>Nome do arquivo</Label>
                <Input
                  value={editando.foto_nao_precisa ? "" : editando.foto_arquivo_nome || ""}
                  disabled={editando.foto_nao_precisa === true}
                  onChange={(e) => setEditando({ ...editando, foto_arquivo_nome: e.target.value })}
                  placeholder="Ex: NOME_FUNCIONARIO_123.jpg"
                />
              </div>
              <div className="space-y-2">
                <Label>Foto</Label>
                <input ref={uploadFotoRef} className="hidden" type="file" accept="image/*" onChange={(e) => carregarFotoEdicao(e.target.files?.[0])} />
                <Button type="button" variant="default" className="w-full" onClick={() => uploadFotoRef.current?.click()} disabled={salvando || editando.foto_nao_precisa === true}>
                  CARREGAR / TROCAR FOTO
                </Button>
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

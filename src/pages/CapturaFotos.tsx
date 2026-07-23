import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, RefreshCw, Search, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type FuncionarioFoto = {
  id: string;
  nome_completo: string;
  matricula: string | null;
  setor_id: string | null;
  tem_foto: boolean | null;
  telefone_whatsapp: string | null;
  usa_fretado: boolean | null;
  linha_fretado: string | null;
  setor_nome: string | null;
};

const linhasFretado = ["VARZEA A", "VARZEA B", "CAMPINAS", "LOUVEIRA"];

function formatTelefone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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
          reject(new Error("Nao foi possivel processar a imagem"));
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Nao foi possivel compactar a foto"));
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
      reject(new Error("Imagem invalida"));
    };
    img.src = objectUrl;
  });
}

export default function CapturaFotos() {
  const entradaRapida = new URLSearchParams(window.location.search).get("rhfoto") === "1";
  const [codigoInput, setCodigoInput] = useState("");
  const [codigo, setCodigo] = useState("");
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<FuncionarioFoto[]>([]);
  const [pendentesFoto, setPendentesFoto] = useState<FuncionarioFoto[]>([]);
  const [selecionado, setSelecionado] = useState<FuncionarioFoto | null>(null);
  const [telefone, setTelefone] = useState("");
  const [usaFretado, setUsaFretado] = useState(false);
  const [fretadoEscolhido, setFretadoEscolhido] = useState(false);
  const [linhaFretado, setLinhaFretado] = useState("");
  const [imagemBase64, setImagemBase64] = useState("");
  const [preview, setPreview] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [modalMensagem, setModalMensagem] = useState<{ titulo: string; texto: string; tipo: "erro" | "sucesso" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const buscaInputRef = useRef<HTMLInputElement | null>(null);

  const podeSalvar = useMemo(() => {
    const telefoneOk = telefone.replace(/\D/g, "").length >= 10;
    const fretadoOk = fretadoEscolhido && (!usaFretado || Boolean(linhaFretado));
    return Boolean(selecionado && telefoneOk && fretadoOk && imagemBase64);
  }, [fretadoEscolhido, imagemBase64, linhaFretado, selecionado, telefone, usaFretado]);

  const chamarFotosHandler = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("fotos-handler", { body: { codigo, ...body } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const validarCodigo = async (codigoAcesso = codigoInput) => {
    setErro("");
    setCarregando(true);
    try {
      const { data, error } = await supabase.functions.invoke("fotos-handler", {
        body: { action: "buscar_funcionario", codigo: codigoAcesso, termo: "COD" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCodigo(codigoAcesso);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Codigo invalido");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (!codigo || termo.trim().length < 3) {
      setResultados([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setErro("");
      setSucesso("");
      setCarregando(true);
      try {
        const data = await chamarFotosHandler({ action: "buscar_funcionario", termo: termo.trim() });
        setResultados(data.data || []);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao buscar funcionario");
      } finally {
        setCarregando(false);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [codigo, termo]);

  useEffect(() => {
    if (!codigo || !entradaRapida) return;

    const carregarPendentes = async () => {
      setErro("");
      setCarregando(true);
      try {
        const data = await chamarFotosHandler({ action: "listar_sem_foto" });
        setPendentesFoto(data.data || []);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao carregar pendentes");
      } finally {
        setCarregando(false);
      }
    };

    carregarPendentes();
  }, [codigo, entradaRapida]);

  const buscarAgora = async () => {
    if (termo.trim().length < 3) return;
    setErro("");
    setSucesso("");
    setCarregando(true);
    try {
      const data = await chamarFotosHandler({ action: "buscar_funcionario", termo: termo.trim() });
      setResultados(data.data || []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao buscar funcionario");
    } finally {
      setCarregando(false);
    }
  };

  const selecionar = (funcionario: FuncionarioFoto) => {
    setSelecionado(funcionario);
    setTelefone(formatTelefone(funcionario.telefone_whatsapp || ""));
    setUsaFretado(Boolean(funcionario.usa_fretado));
    setFretadoEscolhido(funcionario.usa_fretado !== null || Boolean(funcionario.linha_fretado));
    setLinhaFretado(funcionario.linha_fretado || "");
    setImagemBase64("");
    setPreview("");
    setSucesso("");
  };

  const handleFoto = async (file?: File) => {
    if (!file) return;
    setErro("");
    setCarregando(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setImagemBase64(dataUrl);
      setPreview(dataUrl);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao processar foto. Tente tirar a foto novamente.");
      setImagemBase64("");
      setPreview("");
    } finally {
      setCarregando(false);
    }
  };

  const salvar = async () => {
    if (!selecionado) return;
    if (telefone.replace(/\D/g, "").length < 10) {
      setModalMensagem({ titulo: "FALTA WHATSAPP", texto: "Informe o numero do WhatsApp antes de salvar.", tipo: "erro" });
      return;
    }
    if (!fretadoEscolhido) {
      setModalMensagem({ titulo: "FALTA FRETADO", texto: "Informe se o funcionario usa fretado ou nao usa fretado.", tipo: "erro" });
      return;
    }
    if (usaFretado && !linhaFretado) {
      setModalMensagem({ titulo: "FALTA LINHA DO FRETADO", texto: "Selecione a linha do fretado antes de salvar.", tipo: "erro" });
      return;
    }
    if (!imagemBase64) {
      setModalMensagem({ titulo: "FALTA FOTO", texto: "Tire ou carregue a foto antes de salvar.", tipo: "erro" });
      return;
    }
    setErro("");
    setSucesso("");
    setCarregando(true);
    try {
      await chamarFotosHandler({
        action: "atualizar_funcionario_foto",
        funcionario_id: selecionado.id,
        imagem_base64: imagemBase64 || undefined,
        telefone_whatsapp: telefone.replace(/\D/g, ""),
        usa_fretado: usaFretado,
        linha_fretado: usaFretado ? linhaFretado : null,
      });
      setSucesso("Dados salvos com sucesso.");
      setSelecionado(null);
      setTermo("");
      setResultados([]);
      setPendentesFoto((atuais) => atuais.filter((funcionario) => funcionario.id !== selecionado.id));
      setTelefone("");
      setUsaFretado(false);
      setFretadoEscolhido(false);
      setLinhaFretado("");
      setImagemBase64("");
      setPreview("");
      setModalMensagem({ titulo: "SALVO COM SUCESSO", texto: "Foto e dados atualizados. Procure o proximo funcionario.", tipo: "sucesso" });
      window.setTimeout(() => buscaInputRef.current?.focus(), 100);
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Erro ao salvar";
      setErro(mensagem);
      setModalMensagem({ titulo: "ERRO AO SALVAR", texto: mensagem, tipo: "erro" });
    } finally {
      setCarregando(false);
    }
  };

  if (!codigo) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>CAPTURA DE FOTOS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {entradaRapida ? (
              <Button className="h-14 w-full text-base font-semibold" onClick={() => validarCodigo("RHFOTO2026")} disabled={carregando}>
                ENTRAR RHFOTO2026
              </Button>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="codigo">Codigo de acesso</Label>
                <Input id="codigo" type="password" value={codigoInput} onChange={(e) => setCodigoInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && validarCodigo()} />
              </div>
            )}
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            {!entradaRapida && (
              <Button className="w-full" onClick={() => validarCodigo()} disabled={carregando || !codigoInput}>
                Entrar
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header>
          <h1 className="text-2xl font-bold text-slate-950">CAPTURA DE FOTOS</h1>
          <p className="text-sm text-slate-600">Atualizacao rapida de foto, telefone e fretado.</p>
        </header>

        <Card className={selecionado ? "hidden lg:block" : ""}>
          <CardContent className="flex flex-col gap-3 pt-6 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input ref={buscaInputRef} className="pl-9" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar por nome ou matricula" onKeyDown={(e) => e.key === "Enter" && buscarAgora()} />
            </div>
            <Button onClick={buscarAgora} disabled={carregando || termo.trim().length < 3} variant="outline" className="md:w-36">
              {carregando ? "Buscando" : "Atualizar"}
            </Button>
          </CardContent>
        </Card>

        {erro && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}
        {sucesso && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{sucesso}</div>}

        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <Card className={selecionado ? "hidden lg:block" : ""}>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {termo.trim().length < 3 && entradaRapida && pendentesFoto.length > 0 && (
                <div className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  PENDENTES DE FOTO: {pendentesFoto.length}
                </div>
              )}
              {termo.trim().length < 3 && !entradaRapida && <p className="text-sm text-slate-500">Digite pelo menos 3 caracteres.</p>}
              {termo.trim().length < 3 && entradaRapida && pendentesFoto.length === 0 && <p className="text-sm text-slate-500">{carregando ? "Carregando pendentes..." : "Nenhum pendente de foto encontrado."}</p>}
              {termo.trim().length >= 3 && resultados.length === 0 && <p className="text-sm text-slate-500">{carregando ? "Buscando..." : "Nenhum resultado encontrado."}</p>}
              {(termo.trim().length >= 3 ? resultados : pendentesFoto).map((funcionario) => (
                <div key={funcionario.id} role="button" tabIndex={0} onClick={() => selecionar(funcionario)} className="w-full rounded-md border bg-white p-3 text-left hover:border-blue-500">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{funcionario.nome_completo}</p>
                      <p className="text-xs text-slate-600">{funcionario.matricula || "-"} | {funcionario.setor_nome || "SETOR NAO INFORMADO"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={funcionario.tem_foto ? "default" : "outline"}>{funcionario.tem_foto ? "COM FOTO" : "SEM FOTO"}</Badge>
                      <Button type="button" size="sm" onClick={(event) => { event.stopPropagation(); selecionar(funcionario); }}>
                        SELECIONAR
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className={!selecionado ? "hidden lg:block" : ""}>
            <CardHeader>
              <CardTitle>Cadastro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selecionado && <p className="text-sm text-slate-500">Selecione um funcionario.</p>}
	              {selecionado && (
	                <>
	                  <Button type="button" variant="outline" className="w-full lg:hidden" onClick={() => setSelecionado(null)}>
	                    VOLTAR PARA LISTA
	                  </Button>
	                  <div>
                    <p className="font-semibold">{selecionado.nome_completo}</p>
                    <p className="text-xs text-slate-600">{selecionado.matricula || "-"}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Telefone / WhatsApp</Label>
                    <Input type="tel" inputMode="numeric" pattern="[0-9]*" autoComplete="tel" value={telefone} onChange={(e) => setTelefone(formatTelefone(e.target.value))} placeholder="(00) 00000-0000" />
                  </div>

                  <div className="space-y-2">
                    <Label>Fretado</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {linhasFretado.map((linha) => (
                        <Button
                          key={linha}
                          type="button"
                          variant={usaFretado && linhaFretado === linha ? "default" : "outline"}
                          onClick={() => {
                            setUsaFretado(true);
                            setFretadoEscolhido(true);
                            setLinhaFretado(linha);
                          }}
                        >
                          {linha}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant={!usaFretado ? "default" : "outline"}
                        className="col-span-2"
                        onClick={() => {
                          setUsaFretado(false);
                          setFretadoEscolhido(true);
                          setLinhaFretado("");
                        }}
                      >
                        NAO USA FRETADO
                      </Button>
                    </div>
                  </div>

	                  <div className="space-y-2">
	                    <Label>Foto</Label>
	                    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
	                      <div className="mx-auto mb-3 flex h-40 w-32 flex-col items-center justify-end rounded-t-full border-2 border-blue-500/70 bg-white/70 p-3">
	                        <div className="h-16 w-16 rounded-full border-2 border-blue-500/70 bg-blue-50" />
	                        <div className="mt-2 h-14 w-24 rounded-t-full border-2 border-blue-500/70 bg-blue-50" />
	                      </div>
	                      <p className="text-sm font-semibold text-slate-800">ROSTO E PEITO</p>
	                      <p className="text-xs text-slate-600">Centralize o rosto e pegue do peito para cima.</p>
	                    </div>
		                    <input ref={fileInputRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={(e) => handleFoto(e.target.files?.[0])} />
		                    <input ref={uploadInputRef} className="hidden" type="file" accept="image/*" onChange={(e) => handleFoto(e.target.files?.[0])} />
			                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
			                      <Button type="button" variant="secondary" className="h-12 w-full text-base" onClick={() => fileInputRef.current?.click()}>
			                        {preview ? <RefreshCw className="mr-2 h-5 w-5" /> : <Camera className="mr-2 h-5 w-5" />}
			                        {preview ? "Tirar novamente" : "Tirar foto"}
			                      </Button>
			                      <Button type="button" variant="default" className="h-12 w-full text-base" onClick={() => uploadInputRef.current?.click()}>
			                        CARREGAR FOTO DA GALERIA
			                      </Button>
			                    </div>
	                    {preview && (
	                      <div className="rounded-md border-2 border-blue-500/70 p-2">
	                        <img src={preview} alt="Preview" className="max-h-72 w-full rounded-md object-cover" />
	                      </div>
	                    )}
	                  </div>

	                  <Button onClick={salvar} disabled={carregando} className="w-full">
	                    <Camera className="mr-2 h-4 w-4" /> Salvar
	                  </Button>
                  {!podeSalvar && (
                    <p className="text-xs text-slate-500">
                      Preencha telefone, fretado e tire a foto para salvar.
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {selecionado.tem_foto ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}
                    Status atual da foto
                  </div>
                </>
              )}
            </CardContent>
          </Card>
	        </div>
	      </div>
	      <Dialog open={!!modalMensagem} onOpenChange={(open) => !open && setModalMensagem(null)}>
	        <DialogContent className="max-w-sm">
	          <DialogHeader>
	            <DialogTitle>{modalMensagem?.titulo}</DialogTitle>
	          </DialogHeader>
	          <div className={modalMensagem?.tipo === "sucesso" ? "rounded-md bg-emerald-50 p-4 text-emerald-800" : "rounded-md bg-red-50 p-4 text-red-800"}>
	            {modalMensagem?.texto}
	          </div>
	          <Button className="w-full" onClick={() => setModalMensagem(null)}>
	            OK
	          </Button>
	        </DialogContent>
	      </Dialog>
	    </main>
	  );
	}

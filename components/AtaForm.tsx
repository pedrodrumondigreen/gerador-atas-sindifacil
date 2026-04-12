"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { DadosCondominio, DadosAssembleia } from "@/lib/extrair-ata";
import { useAudioProcessor } from "@/hooks/useAudioProcessor";

const schema = z.object({
  // Condomínio
  nomeEdificio: z.string().min(1, "Nome do edifício é obrigatório"),
  cnpj: z.string().min(1, "CNPJ é obrigatório"),
  endereco: z.string().min(1, "Endereço é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  cep: z.string().min(1, "CEP é obrigatório"),
  // Assembleia
  tipo: z.enum(["AGO", "AGE"]),
  data: z.string().min(1, "Data é obrigatória"),
  horario: z.string().min(1, "Horário é obrigatório"),
  convocacao: z.enum(["primeira", "segunda"]),
  modalidade: z.enum(["presencial", "virtual"]),
  presidente: z.string().min(1, "Presidente é obrigatório"),
  apartamentoPresidente: z.string(),
  representantesSindifacil: z.string().min(1, "Representantes da Sindifácil são obrigatórios"),
  unidades: z.string(),
});

type FormValues = z.infer<typeof schema>;

type Etapa = "formulario" | "transcrevendo" | "revisao" | "gerando" | "concluido";

export default function AtaForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: "AGO",
      convocacao: "segunda",
      modalidade: "virtual",
      cidade: "Belo Horizonte/MG",
      data: new Date().toISOString().split("T")[0],
      unidades: "",
      apartamentoPresidente: "",
    },
  });

  const [etapa, setEtapa] = useState<Etapa>("formulario");
  const [transcricao, setTranscricao] = useState("");
  const [modoEntrada, setModoEntrada] = useState<"audio" | "texto">("audio");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { status: audioStatus, processarArquivo, resetStatus } = useAudioProcessor();

  async function transcrever() {
    if (!arquivo) {
      setErro("Selecione um arquivo de áudio ou vídeo");
      return;
    }
    setErro("");
    setEtapa("transcrevendo");
    try {
      const texto = await processarArquivo(arquivo);
      setTranscricao(texto);
      setEtapa("revisao");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao processar o arquivo");
      setEtapa("formulario");
      resetStatus();
    }
  }

  async function gerarAta() {
    if (!transcricao.trim()) {
      setErro("Insira o conteúdo da reunião");
      return;
    }
    setErro("");
    setEtapa("gerando");

    const values = getValues();
    const condominio: DadosCondominio = {
      nomeEdificio: values.nomeEdificio,
      cnpj: values.cnpj,
      endereco: values.endereco,
      numero: values.numero,
      bairro: values.bairro,
      cidade: values.cidade,
      cep: values.cep,
    };
    const assembleia: DadosAssembleia = {
      tipo: values.tipo,
      data: values.data,
      horario: values.horario,
      convocacao: values.convocacao,
      modalidade: values.modalidade,
      presidente: values.presidente,
      apartamentoPresidente: values.apartamentoPresidente,
      representantesSindifacil: values.representantesSindifacil,
      unidades: values.unidades ?? "",
    };

    try {
      const res = await fetch("/api/gerar-ata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcricao, condominio, assembleia }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const nomeArquivo = `Ata-${values.nomeEdificio.replace(/\s+/g, "-")}-${values.data}.docx`;
      a.href = url;
      a.download = nomeArquivo;
      a.click();
      URL.revokeObjectURL(url);
      setEtapa("concluido");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar ata");
      setEtapa("revisao");
    }
  }

  const onSubmitFormulario = handleSubmit(() => {
    if (modoEntrada === "texto") {
      if (!transcricao.trim()) {
        setErro("Cole o conteúdo da reunião no campo de texto");
        return;
      }
      setEtapa("revisao");
    } else {
      transcrever();
    }
  });

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const errorClass = "text-red-500 text-xs mt-1";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Etapa: Formulário + Upload */}
      {(etapa === "formulario" || etapa === "transcrevendo") && (
        <form onSubmit={onSubmitFormulario} className="space-y-6">
          {/* Dados do Condomínio */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2">
              Dados do Condomínio
            </h2>
            <div>
              <label className={labelClass}>Nome do Edifício</label>
              <input {...register("nomeEdificio")} className={inputClass} placeholder="Ex: Edifício Turquesa" />
              {errors.nomeEdificio && <p className={errorClass}>{errors.nomeEdificio.message}</p>}
            </div>
            <div>
              <label className={labelClass}>CNPJ</label>
              <input {...register("cnpj")} className={inputClass} placeholder="00.000.000/0001-00" />
              {errors.cnpj && <p className={errorClass}>{errors.cnpj.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Rua / Avenida</label>
                <input {...register("endereco")} className={inputClass} placeholder="Rua Exemplo" />
                {errors.endereco && <p className={errorClass}>{errors.endereco.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Número</label>
                <input {...register("numero")} className={inputClass} placeholder="123" />
                {errors.numero && <p className={errorClass}>{errors.numero.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Bairro</label>
                <input {...register("bairro")} className={inputClass} placeholder="Centro" />
                {errors.bairro && <p className={errorClass}>{errors.bairro.message}</p>}
              </div>
              <div>
                <label className={labelClass}>CEP</label>
                <input {...register("cep")} className={inputClass} placeholder="30.000-000" />
                {errors.cep && <p className={errorClass}>{errors.cep.message}</p>}
              </div>
            </div>
            <div>
              <label className={labelClass}>Cidade/UF</label>
              <input {...register("cidade")} className={inputClass} />
              {errors.cidade && <p className={errorClass}>{errors.cidade.message}</p>}
            </div>
          </div>

          {/* Dados da Assembleia */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2">
              Dados da Assembleia
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tipo</label>
                <select {...register("tipo")} className={inputClass}>
                  <option value="AGO">AGO — Ordinária</option>
                  <option value="AGE">AGE — Extraordinária</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Modalidade</label>
                <select {...register("modalidade")} className={inputClass}>
                  <option value="virtual">Virtual (Google Meet)</option>
                  <option value="presencial">Presencial</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Data</label>
                <input type="date" {...register("data")} className={inputClass} />
                {errors.data && <p className={errorClass}>{errors.data.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Horário de início</label>
                <input {...register("horario")} className={inputClass} placeholder="19h30" />
                {errors.horario && <p className={errorClass}>{errors.horario.message}</p>}
              </div>
            </div>
            <div>
              <label className={labelClass}>Convocação</label>
              <select {...register("convocacao")} className={inputClass}>
                <option value="primeira">1ª convocação</option>
                <option value="segunda">2ª convocação</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Presidente da assembleia</label>
              <input {...register("presidente")} className={inputClass} placeholder="Nome completo" />
              {errors.presidente && <p className={errorClass}>{errors.presidente.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Representantes da Sindifácil</label>
              <input
                {...register("representantesSindifacil")}
                className={inputClass}
                placeholder="Ex: Cristiano Drumond de Araújo e Dra. Fernanda Laudares (OAB/MG 192.723)"
              />
              {errors.representantesSindifacil && (
                <p className={errorClass}>{errors.representantesSindifacil.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                Unidades do condomínio{" "}
                <span className="text-gray-400 font-normal">(para lista de presença — separadas por vírgula)</span>
              </label>
              <textarea
                {...register("unidades")}
                className={`${inputClass} h-20 resize-none`}
                placeholder="101, 102, 103, 201, 202, 203, 301, 302, 303"
              />
            </div>
          </div>

          {/* Conteúdo da Reunião */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2">
              Conteúdo da Reunião
            </h2>

            {/* Toggle modo */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setModoEntrada("audio")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  modoEntrada === "audio"
                    ? "bg-blue-800 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Upload de áudio / vídeo
              </button>
              <button
                type="button"
                onClick={() => setModoEntrada("texto")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  modoEntrada === "texto"
                    ? "bg-blue-800 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Colar transcrição / anotações
              </button>
            </div>

            {modoEntrada === "audio" ? (
              <div>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {arquivo ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-800">{arquivo.name}</p>
                      <p className="text-xs text-gray-500">
                        {(arquivo.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                      <p className="text-xs text-blue-600">Clique para trocar o arquivo</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Clique para selecionar a gravação da reunião
                      </p>
                      <p className="text-xs text-gray-400">MP3, MP4, M4A, WAV, WebM — qualquer tamanho</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.mp4,.m4a,.wav,.webm,.ogg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setArquivo(f);
                  }}
                />
                <p className="text-xs text-gray-400 mt-2">
                  Arquivos MP4 do Google Meet são aceitos direto — o sistema extrai o áudio automaticamente.
                </p>
              </div>
            ) : (
              <div>
                <textarea
                  value={transcricao}
                  onChange={(e) => setTranscricao(e.target.value)}
                  className={`${inputClass} h-48 resize-none`}
                  placeholder="Cole aqui a transcrição automática do Google Meet, ou suas anotações da reunião..."
                />
              </div>
            )}
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={etapa === "transcrevendo"}
            className="w-full bg-blue-800 hover:bg-blue-900 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {etapa === "transcrevendo"
              ? "Processando..."
              : modoEntrada === "audio"
              ? "Processar e gerar ata"
              : "Gerar ata"}
          </button>

          {etapa === "transcrevendo" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 space-y-2">
              <p className="text-sm font-medium text-blue-800">
                {audioStatus.stage === "uploading" && `Enviando arquivo... ${audioStatus.progress}%`}
                {audioStatus.stage === "processando" && "Convertendo e transcrevendo áudio no servidor..."}
                {audioStatus.stage === "idle" && "Iniciando..."}
                {audioStatus.stage === "done" && "Concluído!"}
              </p>
              <div className="w-full bg-blue-200 rounded-full h-1.5">
                <div
                  className="bg-blue-700 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: audioStatus.stage === "uploading"
                      ? `${audioStatus.progress}%`
                      : audioStatus.stage === "processando"
                      ? "100%"
                      : "5%",
                  }}
                />
              </div>
              {audioStatus.stage === "processando" && (
                <p className="text-xs text-blue-600">
                  Isso pode levar alguns minutos dependendo da duração da gravação.
                </p>
              )}
            </div>
          )}
        </form>
      )}

      {/* Etapa: Revisão da transcrição */}
      {(etapa === "revisao" || etapa === "gerando") && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">
                Transcrição / Conteúdo da reunião
              </h2>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                Revise antes de gerar
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Verifique se a transcrição está correta. Você pode editar antes de gerar a ata.
            </p>
            <textarea
              value={transcricao}
              onChange={(e) => setTranscricao(e.target.value)}
              className={`${inputClass} h-64 resize-none text-sm`}
            />
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setEtapa("formulario"); setErro(""); }}
              disabled={etapa === "gerando"}
              className="flex-1 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-medium py-3 rounded-xl transition-colors"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={gerarAta}
              disabled={etapa === "gerando"}
              className="flex-1 bg-blue-800 hover:bg-blue-900 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {etapa === "gerando" ? "Gerando ata..." : "Gerar ata (.docx)"}
            </button>
          </div>
        </div>
      )}

      {/* Etapa: Concluído */}
      {etapa === "concluido" && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center space-y-4">
          <div className="text-4xl">✓</div>
          <h2 className="text-lg font-semibold text-gray-800">Ata gerada com sucesso!</h2>
          <p className="text-sm text-gray-500">
            O arquivo .docx foi baixado automaticamente. Abra no Word para revisar e assinar.
          </p>
          <button
            type="button"
            onClick={() => {
              setEtapa("formulario");
              setTranscricao("");
              setArquivo(null);
              setErro("");
            }}
            className="mt-4 bg-blue-800 hover:bg-blue-900 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            Gerar nova ata
          </button>
        </div>
      )}
    </div>
  );
}

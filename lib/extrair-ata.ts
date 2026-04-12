import OpenAI from "openai";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface DadosCondominio {
  nomeEdificio: string;
  cnpj: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  cep: string;
}

export interface DadosAssembleia {
  tipo: "AGO" | "AGE";
  data: string;
  horario: string;
  convocacao: "primeira" | "segunda";
  modalidade: "presencial" | "virtual";
  presidente: string;
  apartamentoPresidente: string;
  representantesSindifacil: string;
  unidades: string;
}

export interface ConteudoAta {
  corpoPrincipal: string;
  encerramento: string;
  signatarios: Array<{
    nome: string;
    cargo: string;
    cpf?: string;
    oab?: string;
  }>;
}

export async function extrairConteudoAta(
  transcricao: string,
  condominio: DadosCondominio,
  assembleia: DadosAssembleia
): Promise<ConteudoAta> {
  const tipoTexto =
    assembleia.tipo === "AGO"
      ? "Assembleia Geral Ordinária"
      : "Assembleia Geral Extraordinária";

  const convocacaoTexto =
    assembleia.convocacao === "primeira" ? "primeira" : "segunda";

  const modalidadeTexto =
    assembleia.modalidade === "virtual"
      ? "virtual, através da plataforma Google Meet"
      : "presencial";

  const enderecoCompleto = `${condominio.endereco}, nº ${condominio.numero}, Bairro ${condominio.bairro}, ${condominio.cidade} – CEP: ${condominio.cep}`;

  const systemPrompt = `Você é um especialista em elaboração de atas de assembleias de condomínio no Brasil, com profundo conhecimento jurídico e administrativo.

Sua tarefa é redigir uma ata formal de assembleia de condomínio em português brasileiro, seguindo rigorosamente o estilo jurídico-administrativo.

REGRAS DE FORMATAÇÃO OBRIGATÓRIAS:
1. O corpo principal deve ser um único parágrafo corrido e contínuo (sem quebras de linha internas)
2. Use linguagem formal e impessoal (terceira pessoa)
3. Os itens da Ordem do Dia devem ser mencionados em negrito dentro do texto: "**Passou-se à Ordem do Dia...**"
4. Inclua todos os detalhes deliberados: valores, prazos, nomes, cargos, CPFs quando mencionados
5. O encerramento deve ser: "Nada mais havendo a tratar, a assembleia foi encerrada, lavrando-se a presente ata, que será assinada pelos presentes."
6. Identifique os signatários da ata (presidente da assembleia, síndico eleito, representantes, etc.)

ESTILO DO PARÁGRAFO DE ABERTURA (siga este modelo):
"Aos [DIA POR EXTENSO] dias do mês de [MÊS] de [ANO], às [HORA], em [primeira/segunda] convocação, conforme edital previamente encaminhado aos condôminos, realizou-se a [TIPO DE ASSEMBLEIA] do [NOME DO CONDOMÍNIO]..."`;

  const userPrompt = `Gere o conteúdo da ata com base nos dados abaixo:

DADOS DO CONDOMÍNIO:
- Nome: ${condominio.nomeEdificio}
- CNPJ: ${condominio.cnpj}
- Endereço: ${enderecoCompleto}

DADOS DA ASSEMBLEIA:
- Tipo: ${tipoTexto}
- Data: ${assembleia.data}
- Horário: ${assembleia.horario}
- Convocação: ${convocacaoTexto} convocação
- Modalidade: ${modalidadeTexto}
- Presidente da assembleia: ${assembleia.presidente}
- Representantes da Sindifácil presentes: ${assembleia.representantesSindifacil}

TRANSCRIÇÃO/ANOTAÇÕES DA REUNIÃO:
${transcricao}

Retorne APENAS um JSON válido, sem markdown, sem blocos de código, no seguinte formato exato:
{
  "corpoPrincipal": "texto único do parágrafo principal da ata",
  "encerramento": "Nada mais havendo a tratar, a assembleia foi encerrada, lavrando-se a presente ata, que será assinada pelos presentes.",
  "signatarios": [
    {"nome": "Nome Completo", "cargo": "Cargo", "cpf": "000.000.000-00"}
  ]
}

IMPORTANTE: O campo "corpoPrincipal" deve ser um único parágrafo longo e contínuo, sem quebras de linha.`;

  const openai = getClient();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("GPT-4o não retornou conteúdo");
  }

  const resultado = JSON.parse(content) as ConteudoAta;
  return resultado;
}

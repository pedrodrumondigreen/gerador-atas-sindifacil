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
  paragrafos: string[];
  signatarios: Array<{
    nome: string;
    cargo: string;
    cpf?: string;
    oab?: string;
  }>;
}

interface RespostaGpt {
  presentes: string;
  convidadoExterno: string;
  participantesSindifacilFrase: string;
  sindicoNome: string;
  paragrafosCorpo: string[];
}

const ENCERRAMENTO =
  "Nada mais havendo a tratar, o síndico agradeceu a presença de todos, reforçou que as manifestações dos condôminos serão registradas e consideradas na continuidade da gestão e encerrou a assembleia.";

const PARA_CONSTAR =
  "Para constar, lavrou-se a presente ata, que, após lida e aprovada, será assinada pelos presentes e/ou representantes legais.";

const REFERENCIA_EXCELENCIA = `
**No primeiro item da pauta**, foi concedida a palavra ao Sr. Geraldo, representante da empresa Real Minas, que apresentou aos condôminos a proposta de individualização da água do Bloco 4, informando que serviço semelhante já havia sido executado no Bloco 3. Explicou que seriam instalados registros individualizados abaixo da caixa d'água, com tubulações independentes para cada apartamento, passando pela lateral do prédio, com entrada nos banheiros, cozinhas e lavanderias. Informou que os banheiros possuem forro de gesso, o que reduziria a necessidade de quebra de revestimentos, sendo necessário, nas cozinhas e lavanderias, remover uma ou duas cerâmicas nos pontos de água para realização das ligações. Esclareceu ainda que as tubulações externas seriam protegidas por calhas, permitindo manutenção futura, e que a empresa realizaria os acabamentos em gesso necessários, ficando a pintura pontual sob responsabilidade de cada proprietário.

Durante a apresentação, foram feitos questionamentos pelos condôminos sobre valores, forma de pagamento, impacto no custo mensal, possibilidade de corte de água em caso de inadimplência, estrutura da tubulação existente e eventuais riscos de alteração na pressão da água. O Sr. Geraldo informou que o custo do serviço seria de R$ 1.170,00 à vista, R$ 1.250,00 em cinco parcelas de R$ 250,00 ou R$ 1.400,00 em dez parcelas de R$ 140,00.

A Dra. Fernanda esclareceu que o condomínio, por si só, não pode cortar o fornecimento de água de unidade inadimplente, por se tratar de serviço essencial, mas ponderou que a análise jurídica da atuação da empresa contratada deveria ser feita com cuidado, especialmente considerando que a Real Minas assumiria a gestão e o pagamento da conta geral de água.

**Em seguida, passou-se ao item três**, referente à apresentação e aprovação das contas. A Sra. Mônica apresentou a situação financeira do Bloco 4, informando que os demonstrativos mensais são encaminhados aos condôminos pelo grupo de WhatsApp. Informou que, na data da assembleia, o condomínio possuía saldo de R$ 2.210,80 no fundo ordinário, R$ 3.661,14 no fundo de reserva e R$ 1.801,72 referente à obra do muro, totalizando R$ 7.673,66 em recursos disponíveis.

Não havendo questionamentos ou impugnações, o síndico colocou as contas da gestão em votação. **Não houve manifestação contrária, razão pela qual as contas da gestão foram aprovadas por unanimidade dos presentes.**

**No item cinco - assuntos gerais**, foram registradas diversas manifestações dos condôminos sobre necessidades e prioridades do condomínio. O condômino Anderson destacou que, antes da individualização da água, o condomínio possui outras demandas importantes, como implantação de sistema de segurança, melhoria das garagens, adequação da passagem de pedestres até o Bloco 4, pintura interna, pintura de fachada, pintura de corrimãos e recuperação de pontos deteriorados.

A condômina Vicência também se manifestou favorável à discussão das prioridades do condomínio, destacando que não é contrária à individualização da água, mas entende que as obras devem ser analisadas uma de cada vez, considerando o custo já elevado do condomínio.
`.trim();

export async function extrairConteudoAta(
  transcricao: string,
  condominio: DadosCondominio,
  assembleia: DadosAssembleia,
): Promise<ConteudoAta> {
  const gpt = await chamarGpt(transcricao, condominio, assembleia);

  const abertura = construirAbertura(condominio, assembleia, gpt);

  const paragrafos = [abertura, ...gpt.paragrafosCorpo, ENCERRAMENTO, PARA_CONSTAR];

  const signatarios = construirSignatarios(gpt);

  return { paragrafos, signatarios };
}

async function chamarGpt(
  transcricao: string,
  condominio: DadosCondominio,
  assembleia: DadosAssembleia,
): Promise<RespostaGpt> {
  const tipoTexto =
    assembleia.tipo === "AGO"
      ? "Assembleia Geral Ordinária"
      : "Assembleia Geral Extraordinária";

  const systemPrompt = `Você é um especialista em elaboração de atas de assembleias de condomínio no Brasil. Sua tarefa é EXTRAIR e ESTRUTURAR informações da transcrição de uma reunião, produzindo o miolo de uma ata formal.

IMPORTANTE: você NÃO gera a abertura (data, horário, modalidade, edifício), nem o encerramento ("Nada mais havendo a tratar..."). Esses parágrafos são montados em código, com base no formulário. Você gera apenas:

1. \`presentes\` — lista de condôminos e visitantes que aparecem na transcrição, no formato "Nome, apartamento NNN; Nome, apartamento NNN; ...". Use ponto-e-vírgula como separador. Se um condômino não tiver apartamento identificado, omita. Use "e" antes do último nome.

2. \`convidadoExterno\` — descrição de eventual convidado externo (representante de empresa, prestador de serviço, etc.) que apareceu para uma apresentação específica. Use o formato "do senhor X, representante da empresa Y, para falar aos presentes sobre Z". Se não houver, retorne string vazia "".

3. \`participantesSindifacilFrase\` — converte o texto livre do campo "Representantes da Sindifácil" em uma frase que cabe após "Registra-se, também, a presença ". Exemplos:
   - Entrada: "Cristiano Drumond e Dra. Fernanda Laudares (OAB/MG 192.723)"
   - Saída: "do síndico Cristiano Drumond e da advogada da Sindifácil, Dra. Fernanda Laudares (OAB/MG 192.723)"
   - Entrada: "Cristiano Drumond, Dra. Fernanda Laudares e Mônica Tostes"
   - Saída: "do síndico Cristiano Drumond, da advogada da Sindifácil, Dra. Fernanda Laudares, e da colaboradora Mônica Tostes"
   Use os títulos corretos (síndico, advogada, colaboradora). Mantenha OAB e CPF que aparecerem entre parênteses.

4. \`sindicoNome\` — apenas o nome completo do síndico (extraído do mesmo campo). Sem títulos. Ex: "Cristiano Drumond de Araújo".

5. \`paragrafosCorpo\` — array de parágrafos cobrindo:
   - Parágrafo 1: leitura do edital, começando "A assembleia foi iniciada pelo síndico/presidente [nome], que [...] realizou a leitura do edital de convocação, esclarecendo que a pauta da assembleia contemplava os seguintes itens: **1 - ...; 2 - ...; ...**" (itens em negrito).
   - Parágrafos seguintes: um ou mais POR ITEM da pauta, cada um iniciando com marcador em negrito: "**No primeiro item da pauta**, ...", "**Em seguida, passou-se ao item dois**, ...", etc. Cada item descreve: quem falou (nome + apartamento quando aplicável), o que apresentou, valores/condições/técnicas mencionadas, perguntas dos condôminos, respostas, ponderações jurídicas, e a decisão (ou ausência de decisão e o motivo).
   - Parágrafo final: assuntos gerais, iniciando "**No item [N] - assuntos gerais**, foram registradas...", seguido de UM parágrafo por falante para manifestações distintas.

   NÃO inclua a abertura ("Aos X dias...") nem o encerramento ("Nada mais havendo...") nesse array — esses são montados em código.

REQUISITOS DE QUALIDADE DOS \`paragrafosCorpo\`:
- IDENTIFIQUE FALANTES sempre que possível: nome e apartamento ("O condômino Anderson, apartamento 202, destacou que...", "A Dra. Fernanda esclareceu que...", "O Sr. Geraldo informou que...").
- CAPTURE TODOS OS VALORES MONETÁRIOS, prazos, especificações técnicas, condições contratuais que aparecem na transcrição.
- DOCUMENTE A DELIBERAÇÃO: registre questionamentos, objeções, ponderações jurídicas, dúvidas técnicas, mesmo quando não houve decisão final.
- ESTRUTURE EM MÚLTIPLOS PARÁGRAFOS densos (4-10 linhas cada). NUNCA crie parágrafos curtos de 1-2 linhas.
- Linguagem formal, impessoal, terceira pessoa, pretérito perfeito/imperfeito.
- Sem aspas de fala direta; use paráfrase formal.
- Use marcação **texto** apenas para itens da pauta listados, marcadores de seção ("**No primeiro item da pauta**") e decisões aprovadas com destaque.

REFERÊNCIA DE QUALIDADE (use APENAS como padrão de detalhamento e estilo — NÃO copie nomes, valores ou conteúdo):

<<<
${REFERENCIA_EXCELENCIA}
>>>`;

  const userPrompt = `Dados do formulário (referência apenas — você NÃO gera a abertura):

DADOS DO CONDOMÍNIO:
- Nome: ${condominio.nomeEdificio}
- CNPJ: ${condominio.cnpj}

DADOS DA ASSEMBLEIA:
- Tipo: ${tipoTexto}
- Data: ${assembleia.data}
- Horário: ${assembleia.horario}
- Convocação: ${assembleia.convocacao === "primeira" ? "primeira" : "segunda"}
- Modalidade: ${assembleia.modalidade}
- Presidente da assembleia: ${assembleia.presidente}${assembleia.apartamentoPresidente ? `, apartamento ${assembleia.apartamentoPresidente}` : ""}
- Representantes da Sindifácil (texto livre do form): ${assembleia.representantesSindifacil}

TRANSCRIÇÃO DA REUNIÃO:
${transcricao}

Retorne APENAS um JSON válido, sem markdown e sem blocos de código, exatamente neste formato:
{
  "presentes": "Haroldo, apartamento 102; Vicência, apartamento 301 e Ádia, apartamento 201",
  "convidadoExterno": "do senhor Geraldo, representante da empresa Real Minas, para falar aos presentes sobre individualização da água",
  "participantesSindifacilFrase": "do síndico Cristiano Drumond e da advogada Dra. Fernanda Laudares (OAB/MG 192.723)",
  "sindicoNome": "Cristiano Drumond de Araújo",
  "paragrafosCorpo": [
    "primeiro parágrafo (leitura do edital com itens da pauta em negrito)",
    "segundo parágrafo (primeiro item da pauta — quem falou, detalhes...)",
    "(...mais parágrafos cobrindo cada item da pauta...)",
    "parágrafo de assuntos gerais (introdução)",
    "manifestação do condômino X",
    "manifestação do condômino Y"
  ]
}

OBSERVAÇÕES:
- "convidadoExterno" deve ser "" se não houver convidado externo na reunião.
- "paragrafosCorpo" pode ter quantos parágrafos forem necessários. Capture o MÁXIMO de detalhe da transcrição.
- NÃO inclua quebras de linha "\\n" dentro das strings.
- Use marcação **texto** para negrito apenas dentro de paragrafosCorpo.`;

  const openai = getClient();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("GPT-4o não retornou conteúdo");
  }

  return JSON.parse(content) as RespostaGpt;
}

function construirAbertura(
  c: DadosCondominio,
  a: DadosAssembleia,
  gpt: RespostaGpt,
): string {
  const dataExt = formatarDataAbertura(a.data);
  const convocacaoTxt =
    a.convocacao === "primeira"
      ? "em primeira convocação"
      : "em segunda e última chamada";
  const modalidadeTxt =
    a.modalidade === "virtual"
      ? "de forma virtual, pela plataforma Google Meet"
      : "de forma presencial";
  const tipoTxt =
    a.tipo === "AGO"
      ? "Assembleia Geral Ordinária"
      : "Assembleia Geral Extraordinária";

  let texto = `${dataExt}, às ${a.horario}, ${convocacaoTxt}, realizou-se, ${modalidadeTxt}, a ${tipoTxt} do ${c.nomeEdificio}`;

  const presentes = gpt.presentes.trim();
  if (presentes) {
    texto += `, com a presença dos condôminos participantes e convidados, dentre eles ${presentes}.`;
  } else {
    texto += `, com a presença dos condôminos participantes.`;
  }

  const partesExtras: string[] = [];
  const fraseSindi = gpt.participantesSindifacilFrase.trim();
  const convidadoExt = gpt.convidadoExterno.trim();

  if (fraseSindi) partesExtras.push(fraseSindi);
  if (convidadoExt) partesExtras.push(convidadoExt);

  if (partesExtras.length > 0) {
    const juntos =
      partesExtras.length === 1
        ? partesExtras[0]
        : partesExtras.slice(0, -1).join(", ") + " e " + partesExtras[partesExtras.length - 1];
    texto += ` Registra-se, também, a presença ${juntos}.`;
  }

  return texto;
}

function construirSignatarios(gpt: RespostaGpt): ConteudoAta["signatarios"] {
  const nome = gpt.sindicoNome.trim() || "Síndico Profissional";
  return [
    {
      nome,
      cargo: "SINDIFÁCIL – SÍNDICO PROFISSIONAL",
    },
  ];
}

function formatarDataAbertura(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  if (dia === 1) {
    return `Ao primeiro dia do mês de ${meses[mes - 1]} de ${anoPorExtenso(ano)}`;
  }
  return `Aos ${numeroPorExtenso(dia)} dias do mês de ${meses[mes - 1]} de ${anoPorExtenso(ano)}`;
}

function numeroPorExtenso(n: number): string {
  const map = [
    "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez",
    "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito",
    "dezenove", "vinte", "vinte e um", "vinte e dois", "vinte e três", "vinte e quatro",
    "vinte e cinco", "vinte e seis", "vinte e sete", "vinte e oito", "vinte e nove",
    "trinta", "trinta e um",
  ];
  return map[n] ?? String(n);
}

function anoPorExtenso(ano: number): string {
  if (ano < 2000 || ano > 2099) return String(ano);
  const dezena = ano - 2000;
  if (dezena === 0) return "dois mil";
  const unidades = [
    "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  ];
  const especiais = [
    "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete",
    "dezoito", "dezenove",
  ];
  const dezenasNomes = [
    "", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta",
    "oitenta", "noventa",
  ];

  if (dezena < 10) return `dois mil e ${unidades[dezena]}`;
  if (dezena < 20) return `dois mil e ${especiais[dezena - 10]}`;
  const d = Math.floor(dezena / 10);
  const u = dezena % 10;
  if (u === 0) return `dois mil e ${dezenasNomes[d]}`;
  return `dois mil e ${dezenasNomes[d]} e ${unidades[u]}`;
}

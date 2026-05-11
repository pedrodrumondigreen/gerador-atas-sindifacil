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

const REFERENCIA_EXCELENCIA = `
Aos trinta dias do mês de abril de dois mil e vinte e seis, às 19h45, em segunda e última chamada, realizou-se, de forma virtual, pela plataforma Google Meet, a Assembleia Geral Ordinária do Bloco 4 do Condomínio Residencial Casa Blanca com a presença dos condôminos participantes e convidados, dentre eles Haroldo, apartamento 102; Vicência, apartamento 301; Rosângela, apartamento 401; Edmilson, apartamento 101; Anderson, apartamento 202 e Ádia, apartamento 201. Registra-se, também, a presença da advogada da Sindifácil e do Residencial Casablanca, Dra. Fernanda Laudares, da colaboradora da Sindifácil, responsável pela gestão financeira dos condomínios administrados, Mônica Drumond de Araújo Tostes e do senhor Geraldo, representante da empresa Real Minas, para falar aos presentes sobre o serviço de individualização da água no bloco 4.

A assembleia foi iniciada pelo síndico Cristiano, que agradeceu a presença de todos e realizou a leitura do edital de convocação, esclarecendo que a pauta da assembleia contemplava os seguintes itens: **1 - Apresentação da empresa Real Minas sobre o trabalho de individualização de água; 2 - Deliberação sobre eventual contratação da referida empresa para execução do serviço no Bloco 4; 3 - Apresentação e aprovação das contas da gestão; 4 - Eleição de síndico para o próximo mandato; e 5 - assuntos gerais.**

**No primeiro item da pauta**, foi concedida a palavra ao Sr. Geraldo, representante da empresa Real Minas, que apresentou aos condôminos a proposta de individualização da água do Bloco 4, informando que serviço semelhante já havia sido executado no Bloco 3. Explicou que seriam instalados registros individualizados abaixo da caixa d'água, com tubulações independentes para cada apartamento, passando pela lateral do prédio, com entrada nos banheiros, cozinhas e lavanderias. Informou que os banheiros possuem forro de gesso, o que reduziria a necessidade de quebra de revestimentos, sendo necessário, nas cozinhas e lavanderias, remover uma ou duas cerâmicas nos pontos de água para realização das ligações. Esclareceu ainda que as tubulações externas seriam protegidas por calhas, permitindo manutenção futura, e que a empresa realizaria os acabamentos em gesso necessários, ficando a pintura pontual sob responsabilidade de cada proprietário.

O representante da Real Minas informou que após a individualização, cada apartamento teria seu próprio hidrômetro e pagaria conforme o consumo real da unidade. Explicou que a empresa faria mensalmente a leitura dos hidrômetros, realizaria o cálculo do consumo individual e emitiria boleto separado para cada unidade, contendo o valor do consumo de água e a taxa administrativa da empresa, atualmente indicada em R$ 14,00 por apartamento. Foi esclarecido que a conta geral da Copasa continuaria sendo emitida para o condomínio/prédio, mas seria paga pela Real Minas, que repassaria a cobrança individual aos moradores.

Durante a apresentação, foram feitos questionamentos pelos condôminos sobre valores, forma de pagamento, impacto no custo mensal, possibilidade de corte de água em caso de inadimplência, estrutura da tubulação existente e eventuais riscos de alteração na pressão da água. O Sr. Geraldo informou que o custo do serviço seria de R$ 1.170,00 à vista, R$ 1.250,00 em cinco parcelas de R$ 250,00 ou R$ 1.400,00 em dez parcelas de R$ 140,00. Informou também que a execução poderia ser iniciada após a contratação, com previsão aproximada de quarenta dias para conclusão, e que a garantia da tubulação executada pela empresa seria de cinco anos. Esclareceu que a pressão da água não seria alterada e que a estrutura do prédio comportaria a individualização.

A Dra. Fernanda esclareceu que o condomínio, por si só, não pode cortar o fornecimento de água de unidade inadimplente, por se tratar de serviço essencial, mas ponderou que a análise jurídica da atuação da empresa contratada deveria ser feita com cuidado, especialmente considerando que a Real Minas assumiria a gestão e o pagamento da conta geral de água. Informou ainda que, caso a contratação avance, o contrato deverá ser previamente analisado para garantir maior segurança jurídica aos condôminos.

Após as manifestações, os condôminos presentes entenderam que seria mais prudente não deliberar sobre a contratação da Real Minas naquela assembleia, devendo ser convocada nova assembleia específica para tratar do tema, com o orçamento formal e as condições de contratação previamente disponibilizados a todos os condôminos. Dessa forma, o **segundo item da pauta**, referente à deliberação sobre a contratação da empresa, foi postergado, não havendo decisão sobre a execução do serviço nesta data.

**Em seguida, passou-se ao item três**, referente à apresentação e aprovação das contas. A Sra. Mônica apresentou a situação financeira do Bloco 4, informando que os demonstrativos mensais são encaminhados aos condôminos pelo grupo de WhatsApp. Esclareceu que, como o condomínio passa por transição de sistema, a prestação de contas seria realizada com base nos demonstrativos enviados até fevereiro/26, não havendo tempo hábil para análise das contas de março. Informou que, na data da assembleia, o condomínio possuía saldo de R$ 2.210,80 no fundo ordinário, R$ 3.661,14 no fundo de reserva e R$ 1.801,72 referente à obra do muro, totalizando R$ 7.673,66 em recursos disponíveis. Colocou-se à disposição para esclarecer quaisquer dúvidas dos condôminos sobre receitas, despesas e lançamentos.

Não havendo questionamentos ou impugnações, o síndico colocou as contas da gestão em votação. Foi solicitado que eventual condômino contrário à aprovação se manifestasse e apresentasse o motivo. **Não houve manifestação contrária, razão pela qual as contas da gestão foram aprovadas por unanimidade dos presentes.**

Na sequência, passou-se à eleição do síndico **(item quarto do edital de convocação)**, para o próximo mandato de doze meses, considerando o encerramento da gestão vigente naquela data. O síndico Cristiano colocou a SindiFácil à disposição para continuidade da gestão do Bloco 4 e questionou se algum condômino desejava se candidatar ao cargo de síndico. Não houve manifestação de candidatura. Em seguida, foi questionado se havia oposição à continuidade da atual gestão. Não havendo manifestações contrárias, foi aprovada a continuidade da SindiFácil/Cristiano na sindicatura do Bloco 4 pelo período de doze meses, a partir de 1º de maio de 2026.

**Isso exposto fica eleito para exercer a sindicatura profissional do bloco 4 do Residencial Casablanca por 12 meses (01/05/2026 a 30/04/2027) Cristiano Drumond de Araújo, portador do RG de número M-4.366.730, portador do CPF sob o número 687.723.946-68, representante da Sindifácil – Síndico Profissional, inscrita no CNPJ sob o número 40.452.530/0001-95.**

**No item cinco - assuntos gerais**, foram registradas diversas manifestações dos condôminos sobre necessidades e prioridades do condomínio. O condômino Anderson destacou que, antes da individualização da água, o condomínio possui outras demandas importantes, como implantação de sistema de segurança, melhoria das garagens, adequação da passagem de pedestres até o Bloco 4, pintura interna, pintura de fachada, pintura de corrimãos e recuperação de pontos deteriorados. Ressaltou que o condomínio já vem arcando com obras e que os custos precisam ser avaliados com cautela, para que as melhorias sejam feitas por prioridade e sem sobrecarregar excessivamente os moradores.

O condômino Edmilson manifestou satisfação com o trabalho realizado pela atual gestão e elogiou a obra do muro, destacando que valorizou o imóvel. Também concordou que a individualização da água pode ser positiva, mas defendeu que outras melhorias sejam tratadas como prioridade, especialmente a situação das garagens, a passagem de pedestres e as tampas das caixas de gordura, que geram barulho quando veículos passam sobre elas.

A condômina Vicência também se manifestou favorável à discussão das prioridades do condomínio, destacando que não é contrária à individualização da água, mas entende que as obras devem ser analisadas uma de cada vez, considerando o custo já elevado do condomínio. Reforçou a necessidade de melhoria das garagens e registrou sua insatisfação com falhas de comunicação da parte da Sindifácil, em algumas situações. Citou como exemplo a entrega de chaves/tags e informações desencontradas sobre horários da entrega. A gestão registrou a observação e se comprometeu a buscar melhoria na comunicação com os condôminos.

A condômina Rosângela relembrou a necessidade de regularização da vistoria do Corpo de Bombeiros/AVCB, informando que a situação estaria pendente desde 2018. O síndico explicou que será necessário levantar a situação atual do projeto e da vistoria junto aos demais blocos, considerando que o Residencial Casa Blanca possui blocos com CNPJs próprios e que determinadas regularizações podem envolver o conjunto do condomínio. Ficou registrado que o tema será apurado e levado para discussão em próxima assembleia, com informações mais concretas sobre a situação, eventuais exigências e custos.

Também foram feitos comentários sobre a organização e demarcação das vagas de garagem, possibilidade de melhorias no espaço e eventual estudo para reorganização dessas vagas, inclusive com sugestão de análise futura de alternativas para melhor aproveitamento da área. O síndico registrou as manifestações e informou que as demandas levantadas serão consideradas para discussão posterior, juntamente com as demais prioridades do Bloco 4.

Nada mais havendo a tratar, o síndico agradeceu a presença de todos, reforçou que as manifestações dos condôminos serão registradas e consideradas na continuidade da gestão e encerrou a assembleia.

Para constar, lavrou-se a presente ata, que, após lida e aprovada, será assinada pelos presentes e/ou representantes legais.
`.trim();

export async function extrairConteudoAta(
  transcricao: string,
  condominio: DadosCondominio,
  assembleia: DadosAssembleia,
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

  const systemPrompt = `Você é um especialista em elaboração de atas de assembleias de condomínio no Brasil, com profundo conhecimento jurídico e administrativo. Sua tarefa é redigir uma ata formal, DETALHADA e RICA EM CONTEÚDO, capturando fielmente o que foi discutido e deliberado.

REQUISITOS DE QUALIDADE (não-negociáveis):

1. EXTRAIA DETALHE — capture TODOS os valores monetários, prazos, especificações técnicas, condições contratuais, números, percentuais e justificativas que aparecem na transcrição. Não resuma; descreva com precisão.

2. IDENTIFIQUE FALANTES — quando um condômino, convidado, advogado ou colaborador se manifestar, identifique-o pelo nome e, quando mencionado, pelo apartamento (ex: "O condômino Anderson, apartamento 202, destacou que...", "A Dra. Fernanda esclareceu que...", "O Sr. Geraldo informou que...").

3. DOCUMENTE A DELIBERAÇÃO — registre questionamentos levantados, objeções, ponderações jurídicas, posições contrárias, dúvidas técnicas, mesmo quando não houve decisão final. Documente o PROCESSO de discussão, não só o resultado.

4. ESTRUTURE EM MÚLTIPLOS PARÁGRAFOS — cada item da pauta deve ocupar um ou mais parágrafos próprios. NUNCA concatene tudo em um único parágrafo. Cada parágrafo deve ser denso (4-8 linhas) e tematicamente focado.

5. CAPTURE TÉCNICA — quando houver discussão sobre obras, serviços, materiais, métodos, garantias, prazos, valores, descreva com a precisão usada pelo falante.

ESTRUTURA OBRIGATÓRIA (em ordem):

(a) ABERTURA: data por extenso, horário, convocação, modalidade, tipo de assembleia, nome do condomínio, lista de condôminos presentes com apartamentos (extraídos da transcrição), representantes da Sindifácil presentes, convidados externos com função/empresa.

(b) LEITURA DO EDITAL: parágrafo iniciando "A assembleia foi iniciada pelo síndico [nome], que agradeceu a presença de todos e realizou a leitura do edital de convocação, esclarecendo que a pauta da assembleia contemplava os seguintes itens: **1 - ...; 2 - ...; ...**" — itens em negrito.

(c) ITENS DA PAUTA: para cada item, um ou mais parágrafos iniciando com marcadores em negrito como "**No primeiro item da pauta**, ...", "**Em seguida, passou-se ao item dois**, ...", "**Na sequência, passou-se ao item três**, ...", etc. Em cada item, descrever: quem falou, o que apresentou, valores/condições/técnicas mencionadas, perguntas dos condôminos, respostas dadas, ponderações jurídicas (se houver advogada presente), e a decisão tomada (ou ausência de decisão e motivo).

(d) ASSUNTOS GERAIS: parágrafo iniciando "**No item [N] - assuntos gerais**, foram registradas..." seguido de um parágrafo POR FALANTE quando houver várias manifestações distintas. Para cada manifestação, capturar quem falou, o que destacou, sugestões, críticas, elogios, e o compromisso/registro feito pela gestão.

(e) ENCERRAMENTO: parágrafo "Nada mais havendo a tratar, o síndico agradeceu a presença de todos, reforçou que [...] e encerrou a assembleia."

(f) FORMALIZAÇÃO: parágrafo final "Para constar, lavrou-se a presente ata, que, após lida e aprovada, será assinada pelos presentes e/ou representantes legais."

USO DE NEGRITO (markdown **texto**):
- Itens da pauta quando listados após "...contemplava os seguintes itens:"
- Marcadores que iniciam cada item: "**No primeiro item da pauta**", "**Em seguida, passou-se ao item três**", "**Na sequência, passou-se à eleição**", "**No item cinco - assuntos gerais**", etc.
- Decisões aprovadas com destaque: "**As contas da gestão foram aprovadas por unanimidade dos presentes.**"
- Texto de eleição/nomeação com qualificação completa: "**Isso exposto fica eleito para exercer a sindicatura profissional...**"
- Subitens importantes: "**(item quarto do edital de convocação)**"

ESTILO:
- Linguagem formal, impessoal, em terceira pessoa
- Tempos verbais no pretérito perfeito ou imperfeito (foi, esclareceu, informou)
- NÃO incluir aspas de fala direta; sempre paráfrase formal
- NÃO usar bullets, listas, títulos ou tabelas — apenas parágrafos corridos
- Cada parágrafo tem entre 4 e 12 linhas; nunca crie parágrafos curtos de 1-2 linhas

REFERÊNCIA DE EXCELÊNCIA — Esta é uma ata real de alta qualidade. Use-a como PADRÃO de detalhamento, estrutura e estilo. NÃO copie nomes, valores ou conteúdo dela — use APENAS o padrão de redação. Atente para: como cada item da pauta vira parágrafos próprios, como falantes são identificados, como detalhes técnicos/financeiros são capturados, como objeções e ponderações jurídicas são documentadas.

<<< INÍCIO DA REFERÊNCIA >>>
${REFERENCIA_EXCELENCIA}
<<< FIM DA REFERÊNCIA >>>`;

  const userPrompt = `Gere a ata com base nos dados abaixo. Capture o MÁXIMO possível da transcrição com o mesmo nível de detalhe da referência.

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
- Presidente da assembleia: ${assembleia.presidente}${assembleia.apartamentoPresidente ? `, apartamento ${assembleia.apartamentoPresidente}` : ""}
- Representantes da Sindifácil presentes: ${assembleia.representantesSindifacil}

TRANSCRIÇÃO DA REUNIÃO:
${transcricao}

Retorne APENAS um JSON válido, sem markdown e sem blocos de código, no formato exato:
{
  "paragrafos": [
    "primeiro parágrafo (abertura com data, horário, modalidade, lista de presentes)",
    "segundo parágrafo (leitura do edital com itens da pauta em negrito)",
    "terceiro parágrafo (primeiro item da pauta - quem falou, o que disse, detalhes)",
    "(...mais parágrafos cobrindo cada item da pauta e assuntos gerais...)",
    "parágrafo de encerramento ('Nada mais havendo a tratar...')",
    "parágrafo final ('Para constar, lavrou-se a presente ata...')"
  ],
  "signatarios": [
    {"nome": "Nome Completo", "cargo": "Síndico Profissional / Presidente / Secretário / Advogada", "cpf": "000.000.000-00", "oab": "OAB/MG 000.000"}
  ]
}

REGRAS DO JSON:
- "paragrafos" é um array. Cada string é um parágrafo independente. NÃO inclua "\\n" dentro das strings.
- Inclua quantos parágrafos forem necessários para cobrir toda a reunião com detalhamento. Não tenha pressa em encerrar.
- Use marcação **texto** para negrito dentro dos parágrafos quando apropriado.
- "signatarios" deve incluir pelo menos o síndico/representante da Sindifácil. Inclua a advogada se ela esteve presente. CPF e OAB só quando soubermos os valores.`;

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

  const resultado = JSON.parse(content) as ConteudoAta;
  return resultado;
}

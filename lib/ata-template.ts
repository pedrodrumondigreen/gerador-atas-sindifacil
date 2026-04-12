import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageBreak,
  UnderlineType,
  convertInchesToTwip,
} from "docx";
import type { ConteudoAta, DadosAssembleia, DadosCondominio } from "./extrair-ata";

function parseBoldText(text: string): TextRun[] {
  // Parse **bold** markers into TextRun array
  const runs: TextRun[] = [];
  const parts = text.split(/\*\*(.*?)\*\*/g);
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "") continue;
    runs.push(
      new TextRun({
        text: parts[i],
        bold: i % 2 === 1,
        font: "Times New Roman",
        size: 24, // 12pt
      })
    );
  }
  return runs.length > 0 ? runs : [new TextRun({ text, font: "Times New Roman", size: 24 })];
}

function emptyLine(): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: "", font: "Times New Roman", size: 24 })],
  });
}

function signatureLine(nome: string, cargo: string, extra?: string): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "________________________________________________",
          font: "Times New Roman",
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: nome,
          bold: true,
          italics: true,
          font: "Times New Roman",
          size: 24,
        }),
      ],
    }),
    ...(extra
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: extra,
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
        ]
      : []),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: cargo,
          font: "Times New Roman",
          size: 24,
        }),
      ],
    }),
    emptyLine(),
  ];
}

function presenceListPages(unidades: string): Paragraph[] {
  if (!unidades.trim()) return [];

  const unitList = unidades
    .split(/[\n,;]+/)
    .map((u) => u.trim())
    .filter(Boolean);

  const paragraphs: Paragraph[] = [
    new Paragraph({ children: [new PageBreak()] }),
  ];

  for (const unit of unitList) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 240, after: 240 },
        children: [
          new TextRun({
            text: `Apto. ${unit}   `,
            font: "Times New Roman",
            size: 24,
          }),
          new TextRun({
            text: "_".repeat(60),
            font: "Times New Roman",
            size: 24,
          }),
        ],
      })
    );
  }

  return paragraphs;
}

export async function gerarAtaDocx(
  conteudo: ConteudoAta,
  condominio: DadosCondominio,
  assembleia: DadosAssembleia
): Promise<Buffer> {
  const tipoTitulo =
    assembleia.tipo === "AGO"
      ? "ASSEMBLEIA GERAL ORDINÁRIA"
      : "ASSEMBLEIA GERAL EXTRAORDINÁRIA";

  const nomeCondominioTitulo = condominio.nomeEdificio.toUpperCase();

  const dataFormatada = formatarData(assembleia.data);

  const docChildren: Paragraph[] = [
    // Título linha 1
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [
        new TextRun({
          text: tipoTitulo,
          bold: true,
          font: "Times New Roman",
          size: 24,
        }),
      ],
    }),
    // Título linha 2
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: nomeCondominioTitulo,
          bold: true,
          font: "Times New Roman",
          size: 24,
        }),
      ],
    }),

    // Corpo principal
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 240, line: 360 },
      children: parseBoldText(conteudo.corpoPrincipal),
    }),

    emptyLine(),

    // Encerramento
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 240, line: 360 },
      children: [
        new TextRun({
          text: "Encerramento: ",
          bold: true,
          font: "Times New Roman",
          size: 24,
        }),
        new TextRun({
          text: conteudo.encerramento,
          font: "Times New Roman",
          size: 24,
        }),
      ],
    }),

    emptyLine(),

    // Data
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
      children: [
        new TextRun({
          text: `Belo Horizonte, ${dataFormatada}.`,
          bold: true,
          font: "Times New Roman",
          size: 24,
        }),
      ],
    }),

    emptyLine(),
    emptyLine(),
  ];

  // Assinaturas
  for (const sig of conteudo.signatarios) {
    const extra = sig.cpf
      ? `CPF: nº ${sig.cpf}`
      : sig.oab
      ? `OAB/MG nº ${sig.oab}`
      : undefined;

    docChildren.push(...signatureLine(sig.nome, sig.cargo, extra));
  }

  // Página 2 — lista de presença
  docChildren.push(...presenceListPages(assembleia.unidades));

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1.18),
              bottom: convertInchesToTwip(1.18),
              left: convertInchesToTwip(1.18),
              right: convertInchesToTwip(1.18),
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

function formatarData(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  const diasExtenso = [
    "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito",
    "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis",
    "dezessete", "dezoito", "dezenove", "vinte", "vinte e um", "vinte e dois",
    "vinte e três", "vinte e quatro", "vinte e cinco", "vinte e seis",
    "vinte e sete", "vinte e oito", "vinte e nove", "trinta", "trinta e um",
  ];
  return `${diasExtenso[dia]} de ${meses[mes - 1]} de ${ano}`;
}

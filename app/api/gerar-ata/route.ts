import { NextRequest, NextResponse } from "next/server";
import { extrairConteudoAta } from "@/lib/extrair-ata";
import { gerarAtaDocx } from "@/lib/ata-template";
import type { DadosCondominio, DadosAssembleia } from "@/lib/extrair-ata";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcricao, condominio, assembleia } = body as {
      transcricao: string;
      condominio: DadosCondominio;
      assembleia: DadosAssembleia;
    };

    if (!transcricao || !condominio || !assembleia) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      );
    }

    const conteudo = await extrairConteudoAta(transcricao, condominio, assembleia);
    const docxBuffer = await gerarAtaDocx(conteudo, condominio, assembleia);

    const nomeBase = `Ata-${condominio.nomeEdificio.replace(/\s+/g, "-")}-${assembleia.data}.docx`;
    const nomeAscii = nomeBase
      .normalize("NFD")
      .replace(/[^\x20-\x7e]/g, "")
      .replace(/"/g, "");

    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${nomeAscii}"; filename*=UTF-8''${encodeURIComponent(nomeBase)}`,
        "Content-Length": String(docxBuffer.length),
      },
    });
  } catch (error) {
    console.error("Erro ao gerar ata:", error);
    return NextResponse.json(
      { error: "Falha ao gerar a ata. Tente novamente." },
      { status: 500 }
    );
  }
}

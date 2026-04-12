import { NextRequest, NextResponse } from "next/server";
import { transcreverAudio } from "@/lib/transcricao";

export const maxDuration = 60;

// Cada segmento de 10min a 64kbps = ~5MB, bem abaixo do limite do Whisper (25MB)
// O FFmpeg.wasm já garante cortes em frames válidos


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo de áudio não encontrado" },
        { status: 400 }
      );
    }

    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo: 25MB. Exporte apenas o áudio (MP3) da gravação." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const transcricao = await transcreverAudio(buffer, file.name);

    return NextResponse.json({ transcricao });
  } catch (error) {
    console.error("Erro ao transcrever áudio:", error);
    return NextResponse.json(
      { error: "Falha na transcrição. Verifique o arquivo e tente novamente." },
      { status: 500 }
    );
  }
}

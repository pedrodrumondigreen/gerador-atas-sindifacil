import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink, readdir, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { transcreverAudio } from "@/lib/transcricao";

const execAsync = promisify(exec);

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const tmpDir = join(tmpdir(), `ata-${Date.now()}`);

  try {
    await mkdir(tmpDir, { recursive: true });

    const formData = await request.formData();
    const file = formData.get("audio") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 400 });
    }

    // Salva o arquivo enviado no disco temporário
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
    const inputPath = join(tmpDir, `input.${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buffer);

    // Converte para MP3 mono 16kHz e divide em segmentos de 10 minutos
    const segPattern = join(tmpDir, "seg_%03d.mp3");
    await execAsync(
      `ffmpeg -i "${inputPath}" -vn -ac 1 -ar 16000 -ab 64k -f segment -segment_time 600 "${segPattern}"`,
      { timeout: 300_000 } // 5 min máx para conversão
    );

    // Lista os segmentos gerados
    const allFiles = await readdir(tmpDir);
    const segments = allFiles
      .filter((f) => f.startsWith("seg_") && f.endsWith(".mp3"))
      .sort();

    if (segments.length === 0) {
      throw new Error("FFmpeg não gerou segmentos de áudio");
    }

    // Transcreve cada segmento com Whisper
    const transcricoes: string[] = [];
    for (const seg of segments) {
      const segBuffer = await readFile(join(tmpDir, seg));
      const texto = await transcreverAudio(segBuffer, seg);
      transcricoes.push(texto);
    }

    return NextResponse.json({ transcricao: transcricoes.join(" ") });
  } catch (error) {
    console.error("Erro ao processar áudio:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Falha ao processar o áudio: ${msg}` },
      { status: 500 }
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

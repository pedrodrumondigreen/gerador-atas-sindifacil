import { NextRequest, NextResponse } from "next/server";
import { createWriteStream } from "fs";
import { readFile, readdir, mkdir, rm, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { Readable } from "node:stream";
import Busboy from "busboy";
import { transcreverAudio } from "@/lib/transcricao";
import { isAuthenticated } from "@/lib/auth";

const execAsync = promisify(exec);

export const runtime = "nodejs";
export const maxDuration = 3600;

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const contentType = request.headers.get("content-type");
  if (!contentType || !contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Content-Type inválido" }, { status: 400 });
  }

  if (!request.body) {
    return NextResponse.json({ error: "Requisição sem corpo" }, { status: 400 });
  }

  const tmpDir = join(tmpdir(), `ata-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
  const t0 = Date.now();
  log(`[ata] iniciando processamento em ${tmpDir}`);

  try {
    const inputPath = await receiveFileToDisk(request.body, contentType, tmpDir);

    const inputStats = await stat(inputPath);
    const inputDuration = await getDurationSec(inputPath);
    log(
      `[ata] input recebido: ${formatBytes(inputStats.size)}, duração ${formatHMS(inputDuration)}, arquivo ${inputPath.split("/").pop()}`,
    );

    const segPattern = join(tmpDir, "seg_%03d.mp3");
    const segmentTime = 600;
    log(`[ata] segmentando com ffmpeg (segments de ${segmentTime}s, 16kHz mono 96kbps)...`);
    await execAsync(
      `ffmpeg -hide_banner -loglevel error -i "${inputPath}" -vn -ac 1 -ar 16000 -ab 96k -f segment -segment_time ${segmentTime} -reset_timestamps 1 "${segPattern}"`,
      { timeout: 1_800_000, maxBuffer: 50 * 1024 * 1024 },
    );

    const allFiles = await readdir(tmpDir);
    const segments = allFiles
      .filter((f) => f.startsWith("seg_") && f.endsWith(".mp3"))
      .sort();

    if (segments.length === 0) {
      throw new Error("FFmpeg não gerou segmentos de áudio");
    }

    const segInfos: Array<{ size: number; duration: number }> = [];
    for (const seg of segments) {
      const path = join(tmpDir, seg);
      const s = await stat(path);
      const d = await getDurationSec(path).catch(() => 0);
      segInfos.push({ size: s.size, duration: d });
    }
    const totalSegDuration = segInfos.reduce((acc, s) => acc + s.duration, 0);
    log(
      `[ata] ffmpeg gerou ${segments.length} segmentos, duração total ${formatHMS(totalSegDuration)} (input era ${formatHMS(inputDuration)})`,
    );
    if (Math.abs(totalSegDuration - inputDuration) > 30) {
      log(
        `[ata] ⚠ DIVERGÊNCIA: input ${formatHMS(inputDuration)} != soma dos segmentos ${formatHMS(totalSegDuration)} — ffmpeg pode ter cortado o áudio`,
      );
    }

    const transcricoes: string[] = [];
    let segmentosOk = 0;
    let segmentosVazios = 0;
    let segmentosErro = 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const info = segInfos[i];
      const segPath = join(tmpDir, seg);
      try {
        const segBuffer = await readFile(segPath);
        const tIni = Date.now();
        const texto = await transcreverAudio(segBuffer, seg);
        const dt = ((Date.now() - tIni) / 1000).toFixed(1);
        const limpo = (texto || "").trim();

        if (limpo.length === 0) {
          log(
            `[ata] seg ${seg}: ${formatBytes(info.size)}, ${formatHMS(info.duration)} → ⚠ VAZIO (whisper retornou 0 chars em ${dt}s)`,
          );
          segmentosVazios++;
          continue;
        }

        log(
          `[ata] seg ${seg}: ${formatBytes(info.size)}, ${formatHMS(info.duration)} → ${limpo.length} chars em ${dt}s`,
        );
        transcricoes.push(limpo);
        segmentosOk++;
      } catch (err) {
        segmentosErro++;
        const msg = err instanceof Error ? err.message : String(err);
        log(`[ata] seg ${seg}: ❌ ERRO — ${msg}`);
      }
    }

    const fullTranscript = transcricoes.join(" ");
    const dtTotal = ((Date.now() - t0) / 1000).toFixed(1);
    log(
      `[ata] concluído em ${dtTotal}s: ${fullTranscript.length} chars totais | ok=${segmentosOk} vazios=${segmentosVazios} erros=${segmentosErro}`,
    );

    if (segmentosOk === 0) {
      throw new Error(
        "Nenhum segmento foi transcrito com sucesso. Verifique se o arquivo tem áudio audível.",
      );
    }

    return NextResponse.json({ transcricao: fullTranscript });
  } catch (error) {
    log(`[ata] ERRO FATAL: ${error instanceof Error ? error.message : String(error)}`);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Falha ao processar o áudio: ${msg}` },
      { status: 500 },
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function receiveFileToDisk(
  body: ReadableStream<Uint8Array>,
  contentType: string,
  tmpDir: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: { "content-type": contentType } });

    let inputPath: string | null = null;
    let pendingWrite: Promise<void> | null = null;
    let fileHandled = false;

    bb.on("file", (_fieldname, fileStream, info) => {
      if (fileHandled) {
        fileStream.resume();
        return;
      }
      fileHandled = true;

      const rawName = info.filename || "input.mp4";
      const ext = (rawName.split(".").pop() ?? "mp4").toLowerCase();
      inputPath = join(tmpDir, `input.${ext}`);

      const writeStream = createWriteStream(inputPath);

      pendingWrite = new Promise<void>((res, rej) => {
        writeStream.on("finish", () => res());
        writeStream.on("error", rej);
        fileStream.on("error", rej);
      });

      fileStream.pipe(writeStream);
    });

    bb.on("error", reject);

    bb.on("close", async () => {
      if (!inputPath || !pendingWrite) {
        reject(new Error("Arquivo não encontrado no upload"));
        return;
      }
      try {
        await pendingWrite;
        resolve(inputPath);
      } catch (err) {
        reject(err);
      }
    });

    const nodeReadable = Readable.fromWeb(
      body as unknown as Parameters<typeof Readable.fromWeb>[0],
    );
    nodeReadable.on("error", reject);
    nodeReadable.pipe(bb);
  });
}

async function getDurationSec(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
  );
  return parseFloat(stdout.trim()) || 0;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)}MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

function formatHMS(seconds: number): string {
  if (!seconds || seconds < 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m${String(s).padStart(2, "0")}s`;
  if (m > 0) return `${m}m${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function log(msg: string) {
  // Console-only diagnostics — visible via `docker service logs sindifacil_gerador_atas`
  // eslint-disable-next-line no-console
  console.log(msg);
}

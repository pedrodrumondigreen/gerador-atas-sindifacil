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

const SEGMENT_SECONDS = 300; // 5 min
const AUDIO_BITRATE = "128k";
const WHISPER_CONCURRENCY = 3;
const WHISPER_MAX_ATTEMPTS = 3;
const WHISPER_RETRY_BASE_MS = 2000;
const DURATION_DIVERGENCE_TOLERANCE_SEC = 30;

interface SegmentResult {
  name: string;
  size: number;
  duration: number;
  text: string;
  status: "ok" | "empty" | "error";
  attempts: number;
  durationMs: number;
  error?: string;
}

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
      `[ata] input recebido: ${formatBytes(inputStats.size)}, duração ${formatHMS(inputDuration)}`,
    );

    if (inputDuration <= 0) {
      throw new Error(
        "Não foi possível ler a duração do arquivo. Verifique se é um áudio/vídeo válido.",
      );
    }

    await extractAndSegment(inputPath, tmpDir);

    const segmentNames = await listSegments(tmpDir);
    if (segmentNames.length === 0) {
      throw new Error("FFmpeg não gerou segmentos de áudio");
    }

    const segmentInfos = await Promise.all(
      segmentNames.map(async (name) => {
        const path = join(tmpDir, name);
        const s = await stat(path);
        const d = await getDurationSec(path).catch(() => 0);
        return { name, size: s.size, duration: d };
      }),
    );
    const totalSegDuration = segmentInfos.reduce((acc, s) => acc + s.duration, 0);
    log(
      `[ata] ffmpeg gerou ${segmentNames.length} segmentos, duração total ${formatHMS(totalSegDuration)} (input era ${formatHMS(inputDuration)})`,
    );

    const divergence = Math.abs(totalSegDuration - inputDuration);
    if (divergence > DURATION_DIVERGENCE_TOLERANCE_SEC) {
      throw new Error(
        `FFmpeg extraiu apenas ${formatHMS(totalSegDuration)} de um arquivo de ${formatHMS(inputDuration)}. ` +
          `Diferença de ${formatHMS(divergence)} indica problema de codec no arquivo. ` +
          `Tente exportar o vídeo em outro formato (MP4 H.264 + AAC) e enviar novamente.`,
      );
    }

    const results = await transcribeAllSegments(tmpDir, segmentInfos);
    const fullText = results
      .filter((r) => r.status === "ok")
      .map((r) => r.text)
      .join(" ")
      .trim();

    const ok = results.filter((r) => r.status === "ok").length;
    const empty = results.filter((r) => r.status === "empty").length;
    const errored = results.filter((r) => r.status === "error").length;
    const dtTotal = ((Date.now() - t0) / 1000).toFixed(1);
    log(
      `[ata] concluído em ${dtTotal}s: ${fullText.length} chars | ok=${ok} vazios=${empty} erros=${errored}`,
    );

    if (ok === 0) {
      throw new Error(
        "Nenhum segmento foi transcrito. Verifique se o arquivo tem áudio audível.",
      );
    }

    if (errored > 0) {
      const erradosLista = results
        .filter((r) => r.status === "error")
        .map((r) => `${r.name} (${formatHMS(r.duration)})`)
        .join(", ");
      log(
        `[ata] ⚠ ${errored} segmento(s) falharam após retries: ${erradosLista}`,
      );
    }

    return NextResponse.json({
      transcricao: fullText,
      metadata: {
        inputDuration,
        segmentsTotal: results.length,
        segmentsOk: ok,
        segmentsEmpty: empty,
        segmentsErrored: errored,
        chars: fullText.length,
        durationSec: parseFloat(dtTotal),
      },
    });
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

async function extractAndSegment(inputPath: string, tmpDir: string): Promise<void> {
  const segPattern = join(tmpDir, "seg_%03d.mp3");
  log(
    `[ata] segmentando com ffmpeg (segments de ${SEGMENT_SECONDS}s, 16kHz mono ${AUDIO_BITRATE}, loudnorm)...`,
  );
  await execAsync(
    `ffmpeg -hide_banner -loglevel error ` +
      `-fflags +genpts -err_detect ignore_err ` +
      `-i "${inputPath}" ` +
      `-vn -ac 1 -ar 16000 -ab ${AUDIO_BITRATE} ` +
      `-af "loudnorm=I=-16:LRA=11:TP=-1.5" ` +
      `-f segment -segment_time ${SEGMENT_SECONDS} -reset_timestamps 1 ` +
      `"${segPattern}"`,
    { timeout: 30 * 60 * 1000, maxBuffer: 100 * 1024 * 1024 },
  );
}

async function listSegments(tmpDir: string): Promise<string[]> {
  const allFiles = await readdir(tmpDir);
  return allFiles
    .filter((f) => f.startsWith("seg_") && f.endsWith(".mp3"))
    .sort();
}

async function transcribeAllSegments(
  tmpDir: string,
  segmentInfos: Array<{ name: string; size: number; duration: number }>,
): Promise<SegmentResult[]> {
  const results: SegmentResult[] = new Array(segmentInfos.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= segmentInfos.length) return;
      const info = segmentInfos[i];
      results[i] = await transcribeOneSegment(tmpDir, info);
    }
  }

  const workers = Array.from({ length: WHISPER_CONCURRENCY }, () => worker());
  await Promise.all(workers);
  return results;
}

async function transcribeOneSegment(
  tmpDir: string,
  info: { name: string; size: number; duration: number },
): Promise<SegmentResult> {
  const segPath = join(tmpDir, info.name);
  const segBuffer = await readFile(segPath);
  const tIni = Date.now();

  for (let attempt = 1; attempt <= WHISPER_MAX_ATTEMPTS; attempt++) {
    try {
      const texto = (await transcreverAudio(segBuffer, info.name)) || "";
      const limpo = texto.trim();
      const dtMs = Date.now() - tIni;

      if (limpo.length === 0) {
        log(
          `[ata] seg ${info.name}: ${formatBytes(info.size)}, ${formatHMS(info.duration)} → ⚠ VAZIO (tentativa ${attempt}/${WHISPER_MAX_ATTEMPTS}, ${(dtMs / 1000).toFixed(1)}s)`,
        );
        return {
          name: info.name,
          size: info.size,
          duration: info.duration,
          text: "",
          status: "empty",
          attempts: attempt,
          durationMs: dtMs,
        };
      }

      log(
        `[ata] seg ${info.name}: ${formatBytes(info.size)}, ${formatHMS(info.duration)} → ${limpo.length} chars (tentativa ${attempt}/${WHISPER_MAX_ATTEMPTS}, ${(dtMs / 1000).toFixed(1)}s)`,
      );
      return {
        name: info.name,
        size: info.size,
        duration: info.duration,
        text: limpo,
        status: "ok",
        attempts: attempt,
        durationMs: dtMs,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < WHISPER_MAX_ATTEMPTS) {
        const delay = WHISPER_RETRY_BASE_MS * 2 ** (attempt - 1);
        log(
          `[ata] seg ${info.name}: tentativa ${attempt} falhou (${msg}). Re-tentando em ${delay}ms...`,
        );
        await sleep(delay);
        continue;
      }
      log(
        `[ata] seg ${info.name}: ❌ ERRO após ${WHISPER_MAX_ATTEMPTS} tentativas — ${msg}`,
      );
      return {
        name: info.name,
        size: info.size,
        duration: info.duration,
        text: "",
        status: "error",
        attempts: WHISPER_MAX_ATTEMPTS,
        durationMs: Date.now() - tIni,
        error: msg,
      };
    }
  }
  // unreachable
  return {
    name: info.name,
    size: info.size,
    duration: info.duration,
    text: "",
    status: "error",
    attempts: WHISPER_MAX_ATTEMPTS,
    durationMs: Date.now() - tIni,
    error: "unreachable",
  };
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

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
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
  // eslint-disable-next-line no-console
  console.log(msg);
}

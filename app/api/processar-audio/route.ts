import { NextRequest, NextResponse } from "next/server";
import { createWriteStream } from "fs";
import { readFile, readdir, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { Readable } from "node:stream";
import Busboy from "busboy";
import { transcreverAudio } from "@/lib/transcricao";

const execAsync = promisify(exec);

export const runtime = "nodejs";
export const maxDuration = 3600;

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type");
  if (!contentType || !contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Content-Type inválido" }, { status: 400 });
  }

  if (!request.body) {
    return NextResponse.json({ error: "Requisição sem corpo" }, { status: 400 });
  }

  const tmpDir = join(tmpdir(), `ata-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });

  try {
    const inputPath = await receiveFileToDisk(request.body, contentType, tmpDir);

    const segPattern = join(tmpDir, "seg_%03d.mp3");
    await execAsync(
      `ffmpeg -i "${inputPath}" -vn -ac 1 -ar 16000 -ab 64k -f segment -segment_time 600 "${segPattern}"`,
      { timeout: 1_800_000, maxBuffer: 50 * 1024 * 1024 }
    );

    const allFiles = await readdir(tmpDir);
    const segments = allFiles
      .filter((f) => f.startsWith("seg_") && f.endsWith(".mp3"))
      .sort();

    if (segments.length === 0) {
      throw new Error("FFmpeg não gerou segmentos de áudio");
    }

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

function receiveFileToDisk(
  body: ReadableStream<Uint8Array>,
  contentType: string,
  tmpDir: string
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

    const nodeReadable = Readable.fromWeb(body as unknown as Parameters<typeof Readable.fromWeb>[0]);
    nodeReadable.on("error", reject);
    nodeReadable.pipe(bb);
  });
}

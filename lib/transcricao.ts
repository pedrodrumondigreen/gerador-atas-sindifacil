import OpenAI from "openai";

function getClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 10 * 60 * 1000,
  });
}

const WHISPER_PROMPT_PT_BR =
  "Transcrição em português brasileiro de uma assembleia geral de condomínio. " +
  "Termos comuns: assembleia ordinária, assembleia extraordinária, condômino, " +
  "síndico, síndica, ata, edital de convocação, pauta, ordem do dia, " +
  "deliberação, aprovação, votação, quórum, unanimidade, advogada, OAB, " +
  "convenção condominial, regimento interno, fundo de reserva, taxa condominial, " +
  "boleto, inadimplência, individualização, hidrômetro, fachada, garagem, " +
  "área comum, AGE, AGO, Sindifácil.";

export async function transcreverAudio(
  audioBuffer: Buffer,
  filename: string,
): Promise<string> {
  const file = new File([new Uint8Array(audioBuffer)], filename, {
    type: getMimeType(filename),
  });

  const openai = getClient();
  const response = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "pt",
    prompt: WHISPER_PROMPT_PT_BR,
    response_format: "text",
    temperature: 0,
  });

  return response as unknown as string;
}

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    m4a: "audio/mp4",
    wav: "audio/wav",
    webm: "audio/webm",
    ogg: "audio/ogg",
  };
  return mimeTypes[ext ?? ""] ?? "audio/mpeg";
}

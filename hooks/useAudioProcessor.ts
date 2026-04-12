"use client";

import { useState } from "react";

export type ProcessingStatus =
  | { stage: "idle" }
  | { stage: "uploading"; progress: number }
  | { stage: "processando" }
  | { stage: "done" };

export function useAudioProcessor() {
  const [status, setStatus] = useState<ProcessingStatus>({ stage: "idle" });

  async function processarArquivo(arquivo: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("audio", arquivo);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setStatus({ stage: "uploading", progress });
        }
      });

      xhr.upload.addEventListener("load", () => {
        setStatus({ stage: "processando" });
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setStatus({ stage: "done" });
          resolve(data.transcricao as string);
        } else {
          let msg = "Erro ao processar o áudio";
          try {
            msg = JSON.parse(xhr.responseText).error ?? msg;
          } catch {}
          reject(new Error(msg));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Falha na conexão. Verifique sua internet e tente novamente."));
      });

      xhr.addEventListener("timeout", () => {
        reject(new Error("O processamento demorou mais que o esperado. Tente um arquivo menor."));
      });

      xhr.timeout = 20 * 60 * 1000; // 20 minutos
      xhr.open("POST", "/api/processar-audio");
      xhr.send(formData);
    });
  }

  function resetStatus() {
    setStatus({ stage: "idle" });
  }

  return { status, processarArquivo, resetStatus };
}

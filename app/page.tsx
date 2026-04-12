import Image from "next/image";
import AtaForm from "@/components/AtaForm";

export default function Home() {
  return (
    <main className="flex-1 py-10 px-4">
      <div className="max-w-2xl mx-auto mb-8 text-center space-y-2">
        <div className="flex justify-center mb-4">
          <Image
            src="/assets/logo.jpg"
            alt="SindiFácil"
            width={140}
            height={56}
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>Gerador de Atas</h1>
        <p className="text-sm" style={{ color: '#6b7280' }}>
          Faça upload da gravação da assembleia ou cole a transcrição. A IA extrai o
          conteúdo e gera a ata pronta em .docx.
        </p>
      </div>
      <AtaForm />
    </main>
  );
}

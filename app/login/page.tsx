import Image from "next/image";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasError = params.error === "1";

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-8 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/assets/logo.jpg"
            alt="SindiFácil"
            width={140}
            height={56}
            className="object-contain"
            priority
          />
          <div>
            <h1 className="text-lg font-semibold text-gray-800">
              Acesso restrito
            </h1>
            <p className="text-sm text-gray-500">
              Entre com a senha de administrador para gerar atas.
            </p>
          </div>
        </div>
        <form action={login} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {hasError && (
            <p className="text-sm text-red-600">Senha incorreta.</p>
          )}
          <button
            type="submit"
            className="w-full bg-blue-800 hover:bg-blue-900 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}

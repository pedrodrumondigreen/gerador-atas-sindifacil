import { logout } from "@/app/login/actions";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-xs text-gray-500 hover:text-gray-800 underline"
      >
        Sair
      </button>
    </form>
  );
}

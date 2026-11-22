import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { dashboardForRole } from "@/lib/rbac";
import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getSessionUser();
  if (user) redirect(dashboardForRole(user.role));

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
            FactoryFlow
          </p>
          <h1 className="text-3xl font-bold text-white">Sign in</h1>
          <p className="mt-2 text-sm text-slate-400">Enter your FactoryFlow account credentials.</p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-200">
            {error === "missing" ? "Enter both email and password." : "Incorrect email or password."}
          </div>
        )}

        <form action={loginAction} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="admin@factoryflow.demo"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="demo1234"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-500"
            />
          </div>
          <button type="submit" className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400">
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Demo password: <span className="font-mono text-slate-300">demo1234</span>
        </p>
        <p className="mt-4 text-center text-xs text-slate-500">
          Don't have an account?{" "}
          <a href="/register" className="text-emerald-400 hover:underline">
            Create one
          </a>
        </p>
      </div>
    </main>
  );
}

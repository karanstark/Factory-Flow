import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { dashboardForRole } from "@/lib/rbac";
import { registerAction } from "./actions";
import { ROLES } from "@/lib/constants";

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
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
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="mt-2 text-sm text-slate-400">Register to access FactoryFlow.</p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-200">
            {error === "missing" ? "Please fill in all fields." : error === "short" ? "Password must be at least 8 characters." : error === "role" ? "Please choose a valid role." : "An account with this email already exists."}
          </div>
        )}

        <form action={registerAction} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-200">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Your name"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Min. 8 characters"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="role" className="mb-2 block text-sm font-medium text-slate-200">Role</label>
            <select
              id="role"
              name="role"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
            >
              <option value={ROLES.SALESMAN}>Salesman</option>
              <option value={ROLES.PRODUCTION}>Production</option>
            </select>
          </div>
          <p className="text-[11px] text-slate-600 -mt-3">
            Office roles (admin, owner, accountant) are created by an administrator.
          </p>
          <button type="submit" className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400">
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <a href="/login" className="text-emerald-400 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { ROLES, type Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { createUserAction, toggleUserActiveAction, deleteUserAction } from "./actions";
import { logoutAction } from "@/app/login/actions";

async function getUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireRole(ROLES.ADMIN, ROLES.OWNER);
  const { error, success } = await searchParams;
  const users = await getUsers();

  const roleLabels: Record<Role, string> = {
    ADMIN: "Administrator",
    SALESMAN: "Salesman",
    PRODUCTION: "Production",
    ACCOUNTANT: "Accountant",
    OWNER: "Owner",
  };

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-white/[0.07] bg-[#0b1220] px-5 py-6 lg:flex">
        <a href="/admin/dashboard" className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight text-white">FactoryFlow</span>
            <span className="block text-[11px] text-slate-500">Admin workspace</span>
          </span>
        </a>

        <div className="mt-11 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          Admin
        </div>
        <nav className="mt-3 space-y-1">
          <a href="/admin/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </a>
          <a href="/admin/users" className="flex items-center gap-3 rounded-xl bg-emerald-400/[0.09] px-3 py-2.5 text-sm font-medium text-emerald-300">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Users
          </a>
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-slate-200">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
          </div>
          <form action={logoutAction} className="mt-4">
            <button className="w-full rounded-lg border border-white/[0.08] px-3 py-2 text-left text-xs text-slate-400 transition hover:border-white/15 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#080d18]/90 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:hidden">
              <svg className="h-5 w-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <span className="font-bold text-white">FactoryFlow</span>
            </div>
            <div className="hidden text-sm text-slate-500 lg:block">Admin / <span className="text-slate-300">User Management</span></div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-emerald-300 lg:hidden">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10">
          <section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-slate-500">Manage user accounts and access</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">User Management</h1>
            </div>
          </section>

          {(error || success) && (
            <div className="mb-6 rounded-lg border px-4 py-3 text-sm">
              {error && (
                <div className="border-red-900 bg-red-950 text-red-200">
                  {error === "missing" ? "Please fill in all fields." : error === "short" ? "Password must be at least 8 characters." : "An account with this email already exists."}
                </div>
              )}
              {success && (
                <div className="border-emerald-900 bg-emerald-950 text-emerald-200">
                  {success === "created" ? "User created successfully." : success === "toggled" ? "User status updated." : "User deleted."}
                </div>
              )}
            </div>
          )}

          <section className="mb-8">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0e1625] p-5 sm:p-6">
              <h2 className="font-semibold text-white mb-4">Create New User</h2>
              <form action={createUserAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-200">Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="Full name"
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
                    placeholder="user@company.com"
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
                    <option value={ROLES.ACCOUNTANT}>Accountant</option>
                    <option value={ROLES.ADMIN}>Admin</option>
                    <option value={ROLES.OWNER}>Owner</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-4 flex items-end">
                  <button type="submit" className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section>
            <div className="rounded-2xl border border-white/[0.07] bg-[#0e1625] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-600 bg-white/[0.02]">
                      <th className="p-4 font-medium">Name</th>
                      <th className="p-4 font-medium">Email</th>
                      <th className="p-4 font-medium">Role</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Created</th>
                      <th className="p-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
                        <td className="p-4">
                          <p className="font-medium text-slate-200">{u.name}</p>
                        </td>
                        <td className="p-4 text-slate-400">{u.email}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium
                            {u.role === ROLES.ADMIN || u.role === ROLES.OWNER ? 'bg-violet-400/10 text-violet-300' :
                             u.role === ROLES.PRODUCTION ? 'bg-orange-400/10 text-orange-300' :
                             u.role === ROLES.ACCOUNTANT ? 'bg-sky-400/10 text-sky-300' :
                             'bg-emerald-400/10 text-emerald-300'
                            }">
                            {roleLabels[u.role as Role]}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            u.active ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"
                          }`}>
                            {u.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 text-xs">
                          {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <form action={toggleUserActiveAction} className="inline">
                              <input type="hidden" name="userId" value={u.id} />
                              <input type="hidden" name="active" value={String(u.active)} />
                              <button
                                type="submit"
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                  u.active
                                    ? "bg-rose-400/10 text-rose-300 hover:bg-rose-400/20"
                                    : "bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                                }`}
                              >
                                {u.active ? "Deactivate" : "Activate"}
                              </button>
                            </form>
                            {u.id !== user.id && (
                              <form action={deleteUserAction} className="inline" onSubmit={(e) => {
                                if (!confirm("Delete this user? This action cannot be undone.")) {
                                  e.preventDefault();
                                }
                              }}>
                                <input type="hidden" name="userId" value={u.id} />
                                <button type="submit" className="rounded-lg bg-rose-400/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-400/20">
                                  Delete
                                </button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users.length === 0 && (
                <div className="p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <p className="mt-4 text-sm text-slate-500">No users found</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { dashboardForRole } from "@/lib/rbac";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(dashboardForRole(user.role));
}

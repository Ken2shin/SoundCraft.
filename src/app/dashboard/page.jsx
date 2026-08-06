import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { ensureUser, listProjects } from "@/lib/db/repo";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const metadata = { title: "Dashboard · SoundCraft AI" };

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  let user = null;
  let projects = [];
  try {
    user = await ensureUser(session);
    projects = await listProjects(user.id);
  } catch (err) {
    console.error("[dashboard] base de datos:", err.message);
    user = { ...session, plan: null }; // No forzar "free" — deja que el cliente muestre "—"
  }

  return <DashboardClient initialProjects={projects} user={user} />;
}
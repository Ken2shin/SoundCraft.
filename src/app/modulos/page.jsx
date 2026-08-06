import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { ensureUser, listProjects } from "@/lib/db/repo";
import ModulesPageClient from "@/components/modules/ModulesPageClient";

export const metadata = { title: "Módulos · SoundCraft AI" };

export default async function ModulosPage() {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  let user = null;
  let projects = [];
  try {
    user = await ensureUser(session);
    projects = await listProjects(user.id);
  } catch (err) {
    console.error("[modulos] base de datos:", err.message);
    user = { ...session, plan: null };
  }

  return <ModulesPageClient user={user} initialProjects={projects} />;
}
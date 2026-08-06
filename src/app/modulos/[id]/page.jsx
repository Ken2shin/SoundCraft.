import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { ensureUser, listProjects } from "@/lib/db/repo";
import ModulePageClient from "@/components/modules/ModulePageClient";
import { MODULES, moduleAvailable } from "@/lib/plans";

export const metadata = { title: "Módulo · SoundCraft AI" };

export default async function ModuloPage({ params }) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  const mod = MODULES.find((m) => m.id === id);
  if (!mod) redirect("/modulos");

  let user = null;
  let projects = [];
  try {
    user = await ensureUser(session);
    projects = await listProjects(user.id);
  } catch (err) {
    console.error("[modulo] base de datos:", err.message);
    user = { ...session, plan: null };
  }

  const canAccess = moduleAvailable(user?.plan || "free", id);
  if (!canAccess) redirect("/modulos");

  return <ModulePageClient user={user} initialProjects={projects} module={mod} />;
}
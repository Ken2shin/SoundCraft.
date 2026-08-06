import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getProjectByIdAndUser, ensureUser } from "@/lib/db/repo";
import Studio from "@/components/studio/Studio";

export const metadata = { title: "Estudio · SoundCraft AI" };

export const dynamic = "force-dynamic";

export default async function StudioPage({ params }) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  let project = null;
  let user = null;
  try {
    user = await ensureUser(session);
    console.log("[studio] user:", user?.id, user?.plan);
    project = user ? await getProjectByIdAndUser(id, user.id) : null;
    console.log("[studio] project found:", !!project);
  } catch (err) {
    console.error("[studio] error:", err.message);
    redirect("/dashboard");
  }

  if (!user) {
    console.log("[studio] no user, redirecting to dashboard");
    redirect("/dashboard");
  }
  if (!project) {
    console.log("[studio] project not found, id:", id, "user_id:", user?.id);
    redirect("/dashboard");
  }

  return <Studio project={project} user={user} />;
}
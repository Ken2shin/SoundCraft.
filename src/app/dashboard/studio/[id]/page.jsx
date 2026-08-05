import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getProjectByIdAndUser, getUserByUid } from "@/lib/db/repo";
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
    user = await getUserByUid(session.uid);
    project = user ? await getProjectByIdAndUser(id, user.id) : null;
  } catch (err) {
    console.error("[studio]", err.message);
  }

  if (!user) redirect("/dashboard");
  if (!project) notFound();

  return <Studio project={project} user={user} />;
}
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { ensureUser } from "@/lib/db/repo";
import PlansSection from "@/components/pricing/PlansSection";

export const metadata = { title: "Planes · SoundCraft AI" };

export default async function PlanesPage() {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  let user = null;
  try {
    user = await ensureUser(session);
  } catch (err) {
    console.error("[planes] base de datos:", err.message);
    user = { ...session, plan: "free" };
  }

  return (
    <main className="mx-auto min-h-screen w-full bg-surface px-4 py-14">
      <PlansSection compact user={user} />
    </main>
  );
}
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import PlansSection from "@/components/pricing/PlansSection";

export const metadata = { title: "Planes · SoundCraft AI" };

export default async function PlanesPage() {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  return (
    <main className="mx-auto min-h-screen w-full bg-surface px-4 py-14">
      <PlansSection compact />
    </main>
  );
}
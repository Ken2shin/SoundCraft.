import { Suspense } from "react";
import AuthPanel from "@/components/auth/AuthPanel";
import AuthLayout from "@/components/auth/AuthLayout";

export const metadata = { title: "Iniciar sesión · SoundCraft" };

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <AuthPanel mode="login" />
      </Suspense>
    </AuthLayout>
  );
}
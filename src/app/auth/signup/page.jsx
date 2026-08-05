import { Suspense } from "react";
import AuthPanel from "@/components/auth/AuthPanel";
import AuthLayout from "@/components/auth/AuthLayout";

export const metadata = { title: "Crear cuenta · SoundCraft" };

export default function SignupPage() {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <AuthPanel mode="signup" />
      </Suspense>
    </AuthLayout>
  );
}
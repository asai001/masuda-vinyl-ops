"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/cognito";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    signOut();
    router.replace("/");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-slate-900">
      <p className="text-sm text-slate-500">ログアウトしています...</p>
    </div>
  );
}

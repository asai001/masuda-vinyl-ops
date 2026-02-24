"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/cognito";
import { useLanguage } from "@/lib/i18n/language";

export default function LogoutPage() {
  const router = useRouter();
  const { tx } = useLanguage();

  useEffect(() => {
    signOut();
    router.replace("/");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-slate-900">
      <p className="text-sm text-slate-500">{tx("ログアウトしています...")}</p>
    </div>
  );
}

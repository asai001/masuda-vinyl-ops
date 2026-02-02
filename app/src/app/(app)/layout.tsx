"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentSession, getMyProfile } from "@/lib/auth/cognito";
import { FONT_SCALE_STORAGE_KEY, normalizeFontScale } from "@/features/settings/fontScale";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [profile, setProfile] = useState<{ userName: string; departmentName: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      const session = await getCurrentSession();
      if (!session) {
        router.replace("/");
        return;
      }
      const p = await getMyProfile();
      if (isMounted) {
        setProfile(p);
        setIsCheckingAuth(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    let cancelled = false;

    const onUpdated = async () => {
      const p = await getMyProfile();
      if (!cancelled) {
        setProfile(p);
      }
    };

    window.addEventListener("mvops:profile-updated", onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("mvops:profile-updated", onUpdated);
    };
  }, []);

  useEffect(() => {
    if (isCheckingAuth) {
      return;
    }
    const stored = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    const scale = normalizeFontScale(stored);
    document.documentElement.style.setProperty("--app-font-scale", String(scale));
  }, [isCheckingAuth]);

  const pageTitles: Record<string, string> = {
    "/": "ダッシュボード",
    "/dashboard": "ダッシュボード",
    "/client-master": "取引先マスタ",
    "/material-master": "材料マスタ",
    "/product-master": "製品マスタ",
    "/order-management": "発注管理",
    "/sales-management": "受注管理",
    "/payment-master": "支払いマスタ",
    "/payment-management": "支払い管理",
    "/settings": "各種設定",
  };

  const pageTitle = pageTitles[pathname ?? ""] ?? "";

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const userName = profile?.userName ?? "";
  const departmentName = profile?.departmentName ?? "";

  if (isCheckingAuth) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <div className="flex h-screen overflow-hidden text-gray-900">
      <Sidebar onNavigate={handleNavigate} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header pageTitle={pageTitle} userName={userName} userRole={departmentName} />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}

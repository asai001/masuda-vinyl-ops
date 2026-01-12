"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentSession, getMyProfile } from "@/lib/auth/cognito";

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
    <div className="flex min-h-screen text-gray-900">
      <Sidebar onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header pageTitle={pageTitle} userName={userName} userRole={departmentName} />
        <main className="flex-1 bg-gray-50 p-6 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

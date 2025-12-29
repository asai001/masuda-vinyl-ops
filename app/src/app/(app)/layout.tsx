"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { usePathname, useRouter } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

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
  };

  const pageTitle = pageTitles[pathname ?? ""] ?? "";

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const userName = "Huong Nguyen";
  const userRole = "経理担当";

  return (
    <div className="flex min-h-screen">
      <Sidebar onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header pageTitle={pageTitle} userName={userName} userRole={userRole} />
        <main className="flex-1 bg-gray-50 p-6 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

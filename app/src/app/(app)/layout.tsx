"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentSession, getMyProfile } from "@/lib/auth/cognito";
import { FONT_SCALE_STORAGE_KEY, normalizeFontScale } from "@/features/settings/fontScale";
import { type TranslationKey } from "@/lib/i18n/language";

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

  const pageTitleKeys: Record<string, TranslationKey> = {
    "/": "nav.dashboard",
    "/dashboard": "nav.dashboard",
    "/client-master": "nav.clientMaster",
    "/material-master": "nav.materialMaster",
    "/product-master": "nav.productMaster",
    "/order-management": "nav.orderManagement",
    "/order-management/summary": "page.orderSummary",
    "/sales-management": "nav.salesManagement",
    "/sales-management/summary": "page.salesSummary",
    "/shipment-management": "nav.shipmentManagement",
    "/payment-master": "nav.paymentMaster",
    "/payment-management": "nav.paymentManagement",
    "/payment-management/summary": "page.paymentSummary",
    "/settings": "nav.settings",
  };

  const pageTitleKey = pageTitleKeys[pathname ?? ""] ?? "nav.dashboard";

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
        <Header pageTitleKey={pageTitleKey} userName={userName} userRole={departmentName} />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}

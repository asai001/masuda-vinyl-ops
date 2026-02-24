"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Blocks,
  TrendingUp,
  CreditCard,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useLanguage, type TranslationKey } from "@/lib/i18n/language";

interface SidebarProps {
  onNavigate?: (path: string) => void;
}

const menuItems = [
  { labelKey: "nav.dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { labelKey: "nav.clientMaster", icon: Users, path: "/client-master" },
  { labelKey: "nav.materialMaster", icon: Blocks, path: "/material-master" },
  { labelKey: "nav.orderManagement", icon: ShoppingCart, path: "/order-management" },
  { labelKey: "nav.productMaster", icon: Package, path: "/product-master" },
  { labelKey: "nav.salesManagement", icon: TrendingUp, path: "/sales-management" },
  { labelKey: "nav.paymentMaster", icon: CreditCard, path: "/payment-master" },
  { labelKey: "nav.paymentManagement", icon: DollarSign, path: "/payment-management" },
] as const satisfies ReadonlyArray<{
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
  path: string;
}>;

const bottomMenuItems = [
  { labelKey: "nav.settings", icon: Settings, path: "/settings" },
  { labelKey: "nav.logout", icon: LogOut, path: "/logout" },
] as const satisfies ReadonlyArray<{
  labelKey: TranslationKey;
  icon: typeof Settings;
  path: string;
}>;

export default function Sidebar({ onNavigate }: SidebarProps) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();
  const { t } = useLanguage();

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => setOpen(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleMenuClick = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  const isActive = (path: string) => {
    // ダッシュボードの特別処理:
    // 将来的にログイン実装後、ルート(/)からダッシュボードへのリダイレクト時に
    // 一瞬 "/" のパスが表示されることがあるため、両方のパスでアクティブとする
    if (path === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard";
    }
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  return (
    <div className={`${open ? "min-w-60" : "w-16"} h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-25 py-2 border-b border-gray-200">
        {open && (
          <div>
            <h1 className="text-xl font-bold">{t("app.name")}</h1>
            <p className="text-sm text-gray-600 mt-1">{t("app.subtitle")}</p>
          </div>
        )}
        <button onClick={handleDrawerToggle} className="p-1 hover:bg-gray-100 rounded">
          {open ? <X size={20} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Main Menu Items */}
      <div className="flex-1 pt-2 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const label = t(item.labelKey);
          return (
            <button
              key={item.path}
              onClick={() => handleMenuClick(item.path)}
              title={!open ? label : undefined}
              className={`w-full h-15 flex items-center py-1.5 transition-colors ${open ? "px-4 justify-start" : "px-0 justify-center"} ${
                active ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-100"
              }`}
            >
              <Icon size={28} className={`${active ? "text-blue-600" : "text-gray-400"} ${open ? "mr-3.5" : ""}`} />
              {open && <span className={`text-base ${active ? "text-blue-600 font-semibold" : "text-gray-700 font-medium"}`}>{label}</span>}
            </button>
          );
        })}
      </div>

      <div className="border-t border-gray-200" />

      {/* Bottom Menu Items */}
      <div className="pb-2">
        {bottomMenuItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const label = t(item.labelKey);
          return (
            <button
              key={item.path}
              onClick={() => handleMenuClick(item.path)}
              title={!open ? label : undefined}
              className={`w-full h-15 flex items-center transition-colors ${open ? "px-4 justify-start" : "px-0 justify-center"} ${
                active ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-100"
              }`}
            >
              <Icon size={28} className={`${active ? "text-blue-600" : "text-gray-400"} ${open ? "mr-3.5" : ""}`} />
              {open && <span className={`text-base ${active ? "text-blue-600 font-semibold" : "text-gray-700 font-medium"}`}>{label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

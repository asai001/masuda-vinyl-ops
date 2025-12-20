"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Package, ShoppingCart, Blocks, TrendingUp, Settings, LogOut, Menu, X } from "lucide-react";

interface SidebarProps {
  onNavigate?: (path: string) => void;
}

const menuItems = [
  { text: "ダッシュボード", icon: LayoutDashboard, path: "/dashboard" },
  { text: "取引先マスタ", icon: Users, path: "/clients" },
  { text: "材料マスタ", icon: Blocks, path: "/materials" },
  { text: "発注管理", icon: ShoppingCart, path: "/orders" },
  { text: "製品マスタ", icon: Package, path: "/products" },
  { text: "受注管理", icon: TrendingUp, path: "/sales" },
];

const bottomMenuItems = [
  { text: "各種設定", icon: Settings, path: "/settings" },
  { text: "ログアウト", icon: LogOut, path: "/logout" },
];

export default function Sidebar({ onNavigate }: SidebarProps) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

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
    return pathname === path;
  };

  return (
    <div className={`${open ? "w-60" : "w-16"} h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200">
        {open && (
          <div>
            <h1 className="text-lg font-bold">増田ビニール</h1>
            <p className="text-xs text-gray-600">オペレーションシステム</p>
          </div>
        )}
        <button onClick={handleDrawerToggle} className="p-1 hover:bg-gray-100 rounded">
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* Main Menu Items */}
      <div className="flex-1 pt-2 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.text}
              onClick={() => handleMenuClick(item.path)}
              className={`w-full h-15 flex items-center py-1.5 transition-colors ${open ? "px-4 justify-start" : "px-0 justify-center"} ${
                active ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-100"
              }`}
            >
              <Icon size={20} className={`${active ? "text-blue-600" : "text-gray-400"} ${open ? "mr-3" : ""}`} />
              {open && (
                <span className={`text-base ${active ? "text-blue-600 font-semibold" : "text-gray-700 font-medium"}`}>{item.text}</span>
              )}
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
          return (
            <button
              key={item.text}
              onClick={() => handleMenuClick(item.path)}
              className={`w-full h-15 flex items-center transition-colors ${open ? "px-4 justify-start" : "px-0 justify-center"} ${
                active ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-100"
              }`}
            >
              <Icon size={20} className={`${active ? "text-blue-600" : "text-gray-400"} ${open ? "mr-3" : ""}`} />
              {open && (
                <span className={`text-base ${active ? "text-blue-600 font-semibold" : "text-gray-700 font-medium"}`}>{item.text}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

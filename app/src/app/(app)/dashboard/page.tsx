"use client";

import Link from "next/link";
import { ShoppingCart, TrendingUp, DollarSign } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language";

export default function DashboardPage() {
  const { t } = useLanguage();

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{t("dashboard.quickActions")}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <Link href="/order-management" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                <ShoppingCart className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">{t("nav.orderManagement")}</h3>
                <p className="text-sm text-gray-600">{t("dashboard.orderList")}</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/sales-management" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                <TrendingUp className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">{t("nav.salesManagement")}</h3>
                <p className="text-sm text-gray-600">{t("dashboard.salesList")}</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/payment-management" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mr-4">
                <DollarSign className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">{t("nav.paymentManagement")}</h3>
                <p className="text-sm text-gray-600">{t("dashboard.paymentList")}</p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

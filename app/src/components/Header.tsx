"use client";

import React, { useMemo } from "react";
import { useLanguage, type TranslationKey } from "@/lib/i18n/language";

interface HeaderProps {
  pageTitleKey: TranslationKey;
  userName: string;
  userRole: string;
}

export default function Header({ pageTitleKey, userName, userRole }: HeaderProps) {
  const { language, setLanguage, t, dateLocale } = useLanguage();

  const dateText = useMemo(
    () =>
      new Date().toLocaleDateString(dateLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      }),
    [dateLocale]
  );

  return (
    <header className="h-25 bg-white border-b border-gray-200 flex items-center justify-between px-6 py-2">
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-gray-900">{t(pageTitleKey)}</span>
        <span className="text-sm text-gray-600 mt-2">{dateText}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t("common.language")}</span>
          <div className="flex items-center rounded-full bg-gray-100 p-0.5">
            <button
              type="button"
              aria-label="Switch to Japanese"
              onClick={() => setLanguage("ja")}
              className={`min-w-11 rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                language === "ja" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              JA
            </button>
            <button
              type="button"
              aria-label="Switch to Vietnamese"
              onClick={() => setLanguage("vi")}
              className={`min-w-11 rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                language === "vi" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              VI
            </button>
          </div>
        </div>
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-lg">{userName.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-base font-medium text-gray-900">{userName}</span>
          <span className="text-sm text-gray-500">{userRole}</span>
        </div>
      </div>
    </header>
  );
}

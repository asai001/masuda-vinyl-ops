"use client";

import React, { useMemo } from "react";

interface HeaderProps {
  pageTitle: string;
  userName: string;
  userRole: string;
}

export default function Header({ pageTitle, userName, userRole }: HeaderProps) {
  const dateText = useMemo(
    () =>
      new Date().toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      }),
    []
  );

  return (
    <header className="h-25 bg-white border-b border-gray-200 flex items-center justify-between px-6 py-2">
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-gray-900">{pageTitle}</span>
        <span className="text-sm text-gray-600 mt-2">{dateText}</span>
      </div>
      <div className="flex items-center gap-3">
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

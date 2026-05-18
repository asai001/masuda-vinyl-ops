"use client";

import React from "react";
import { Users } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language";

export type SummaryCard = {
  label: string;
  value: React.ReactNode;
  tone: "primary" | "success" | "muted" | "warning";
  icon?: React.ReactNode;
};

type SummaryCardsProps = {
  cards: SummaryCard[];
  lgColumns?: 3 | 4;
};

const toneStyles: Record<SummaryCard["tone"], { badge: string; icon: string; value: string }> = {
  primary: { badge: "bg-blue-50", icon: "text-blue-600", value: "text-gray-900" },
  warning: { badge: "bg-orange-50", icon: "text-orange-500", value: "text-orange-500" },
  success: { badge: "bg-green-50", icon: "text-green-600", value: "text-green-600" },
  muted: { badge: "bg-gray-50", icon: "text-gray-400", value: "text-gray-500" },
};

export default function SummaryCards({ cards, lgColumns }: SummaryCardsProps) {
  const { tx } = useLanguage();
  const defaultIcon = <Users size={22} />;
  const resolvedLgColumns = lgColumns ?? (cards.length >= 4 ? 4 : 3);
  const columnClass = resolvedLgColumns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${columnClass}`}>
      {cards.map((card) => {
        const tone = toneStyles[card.tone];
        const icon = card.icon ?? defaultIcon;
        return (
          <div key={card.label} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <div className="text-sm font-semibold text-gray-500">{tx(card.label)}</div>
              <div className={`text-2xl font-bold ${tone.value}`}>{card.value}</div>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone.badge}`}>
              <span className={tone.icon}>{icon}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

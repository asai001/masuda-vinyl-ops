"use client";

import React from "react";
import { Users } from "lucide-react";

export type SummaryCard = {
  label: string;
  value: number;
  tone: "primary" | "success" | "muted";
};

type SummaryCardsProps = {
  cards: SummaryCard[];
};

const toneStyles: Record<SummaryCard["tone"], { badge: string; icon: string; value: string }> = {
  primary: { badge: "bg-blue-50", icon: "text-blue-600", value: "text-gray-900" },
  success: { badge: "bg-green-50", icon: "text-green-600", value: "text-green-600" },
  muted: { badge: "bg-gray-50", icon: "text-gray-400", value: "text-gray-500" },
};

export default function SummaryCards({ cards }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const tone = toneStyles[card.tone];
        return (
          <div key={card.label} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <div className="text-sm font-semibold text-gray-500">{card.label}</div>
              <div className={`text-2xl font-bold ${tone.value}`}>{card.value}</div>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone.badge}`}>
              <Users size={22} className={tone.icon} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

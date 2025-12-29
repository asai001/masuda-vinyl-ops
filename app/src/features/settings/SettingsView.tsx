"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button, TextField } from "@mui/material";
import { Save } from "lucide-react";

const initialRates = {
  jpyPerUsd: "150",
  vndPerUsd: "25000",
};

type ExchangeRateKey = keyof typeof initialRates;
type ExchangeRateState = typeof initialRates;

export default function SettingsView() {
  const [rates, setRates] = useState<ExchangeRateState>(initialRates);

  const handleChange = (key: ExchangeRateKey) => (event: ChangeEvent<HTMLInputElement>) => {
    setRates((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-gray-900">換算レート設定</h2>
            <p className="text-sm text-gray-600">1 USD あたりの金額を入力してください</p>
          </div>
          <div className="mt-6 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="text-sm font-semibold text-gray-800">JPY → USD レート</span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-gray-600">1 USD =</span>
                <TextField
                  size="small"
                  type="number"
                  value={rates.jpyPerUsd}
                  onChange={handleChange("jpyPerUsd")}
                  placeholder="150"
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*", "aria-label": "JPY to USD rate" }}
                  sx={{ width: 140 }}
                />
                <span className="text-sm text-gray-600">JPY</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-sm font-semibold text-gray-800">VND → USD レート</span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-gray-600">1 USD =</span>
                <TextField
                  size="small"
                  type="number"
                  value={rates.vndPerUsd}
                  onChange={handleChange("vndPerUsd")}
                  placeholder="25000"
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*", "aria-label": "VND to USD rate" }}
                  sx={{ width: 140 }}
                />
                <span className="text-sm text-gray-600">VND</span>
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-gray-200 pt-4">
            <Button type="submit" variant="contained" startIcon={<Save size={16} />} className="whitespace-nowrap">
              保存
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@mui/material";
import { Save } from "lucide-react";
import { fetchExchangeRates, saveExchangeRates } from "@/features/settings/api/client";

const initialRates = {
  jpyPerUsd: "",
  vndPerUsd: "",
};

type ExchangeRateKey = keyof typeof initialRates;
type ExchangeRateState = typeof initialRates;

const toPositiveNumberOrNull = (value: string): number | null => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
};

const isAbortError = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

export default function SettingsView() {
  const router = useRouter();
  const [rates, setRates] = useState<ExchangeRateState>(initialRates);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const jpy = toPositiveNumberOrNull(rates.jpyPerUsd);
  const vnd = toPositiveNumberOrNull(rates.vndPerUsd);
  const canSubmit = !loading && !saving && jpy !== null && vnd !== null;

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const data = await fetchExchangeRates(ac.signal);
        setRates({
          jpyPerUsd: Number.isFinite(data.jpyPerUsd) ? data.jpyPerUsd.toFixed(2) : "",
          vndPerUsd: Number.isFinite(data.vndPerUsd) ? data.vndPerUsd.toFixed(2) : "",
        });
      } catch (e) {
        if (isAbortError(e)) {
          return;
        }

        if (e instanceof Error && e.message === "UNAUTHORIZED") {
          router.replace("/");
          return;
        }

        setErrorMessage("設定の取得に失敗しました。時間をおいて再度お試しください。");
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [router]);

  const handleChange = (key: ExchangeRateKey) => (event: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setRates((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    // 念のため（ボタン制御してても Enter 送信などがあるので）
    if (!canSubmit || jpy === null || vnd === null) {
      setErrorMessage("レートは0より大きい数値で入力してください。");
      return;
    }

    setSaving(true);
    try {
      const updated = await saveExchangeRates({
        jpyPerUsd: jpy,
        vndPerUsd: vnd,
      });

      setRates({
        jpyPerUsd: Number.isFinite(updated.jpyPerUsd) ? updated.jpyPerUsd.toFixed(2) : "",
        vndPerUsd: Number.isFinite(updated.vndPerUsd) ? updated.vndPerUsd.toFixed(2) : "",
      });
    } catch (e) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") {
        router.replace("/");
        return;
      }
      setErrorMessage("保存に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {errorMessage && (
        <div role="alert" aria-live="polite" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

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
                  sx={{ width: 140 }}
                  disabled={saving}
                  slotProps={{ htmlInput: { inputMode: "decimal", pattern: "[0-9]*[.]?[0-9]*", min: 0, step: 0.01 } }}
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
                  sx={{ width: 140 }}
                  disabled={saving}
                  slotProps={{ htmlInput: { inputMode: "decimal", pattern: "[0-9]*[.]?[0-9]*", min: 0, step: 0.01 } }}
                />
                <span className="text-sm text-gray-600">VND</span>
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-gray-200 pt-4">
            <Button type="submit" variant="contained" startIcon={<Save size={16} />} className="whitespace-nowrap" disabled={!canSubmit}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, MenuItem, TextField } from "@mui/material";
import { Save } from "lucide-react";
import { fetchSettings, saveCompanyProfile, saveExchangeRates } from "@/features/settings/api/client";
import {
  DEFAULT_FONT_SCALE,
  FONT_SCALE_OPTIONS,
  FONT_SCALE_STORAGE_KEY,
  normalizeFontScale,
} from "@/features/settings/fontScale";
import { getMyProfile, updateMyProfileAttributes } from "@/lib/auth/cognito";
import { useLanguage } from "@/lib/i18n/language";

const initialRates = {
  jpyPerUsd: "",
  vndPerUsd: "",
};

type ExchangeRateKey = keyof typeof initialRates;
type ExchangeRateState = typeof initialRates;

const initialProfile = {
  userName: "",
  departmentName: "",
};

type ProfileKey = keyof typeof initialProfile;
type ProfileState = typeof initialProfile;

const initialCompany = {
  issuerName: "",
  issuerAddress: "",
  issuerPhone: "",
  issuerFax: "",
};

type CompanyKey = keyof typeof initialCompany;
type CompanyState = typeof initialCompany;

const toPositiveNumberOrNull = (value: string): number | null => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
};

const isAbortError = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

type ErrorWithCode = Error & { code?: unknown };

const hasCode = (e: unknown): e is ErrorWithCode => {
  return typeof e === "object" && e !== null && "code" in e;
};

export default function SettingsView() {
  const router = useRouter();
  const { tx } = useLanguage();

  const [rates, setRates] = useState<ExchangeRateState>(initialRates);
  const [loadingRates, setLoadingRates] = useState(true);
  const [savingRates, setSavingRates] = useState(false);

  const [fontScale, setFontScale] = useState(DEFAULT_FONT_SCALE);
  const [savingFontScale, setSavingFontScale] = useState(false);

  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [company, setCompany] = useState<CompanyState>(initialCompany);
  const [savingCompany, setSavingCompany] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const jpy = toPositiveNumberOrNull(rates.jpyPerUsd);
  const vnd = toPositiveNumberOrNull(rates.vndPerUsd);

  const canSubmitRates = !loadingRates && !savingRates && jpy !== null && vnd !== null;
  const canSubmitProfile = !loadingProfile && !savingProfile;
  const canSubmitCompany = !loadingRates && !savingCompany;
  const canSubmitFontScale = !savingFontScale;

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      setErrorMessage(null);

      try {
        const settings = await fetchSettings(ac.signal);
        setRates({
          jpyPerUsd: Number.isFinite(settings.jpyPerUsd) ? settings.jpyPerUsd.toFixed(2) : "",
          vndPerUsd: Number.isFinite(settings.vndPerUsd) ? settings.vndPerUsd.toFixed(2) : "",
        });
        setCompany({
          issuerName: settings.issuerName ?? "",
          issuerAddress: settings.issuerAddress ?? "",
          issuerPhone: settings.issuerPhone ?? "",
          issuerFax: settings.issuerFax ?? "",
        });
      } catch (e) {
        if (!isAbortError(e)) {
          if (e instanceof Error && e.message === "UNAUTHORIZED") {
            router.replace("/");
            return;
          }
          setErrorMessage("設定の取得に失敗しました。時間をおいて再度お試しください。");
        }
      } finally {
        setLoadingRates(false);
      }

      try {
        const me = await getMyProfile();
        if (!me) {
          router.replace("/");
          return;
        }
        setProfile({
          userName: me.userName ?? "",
          departmentName: me.departmentName ?? "",
        });
      } catch {
        setErrorMessage("ユーザー情報の取得に失敗しました。");
      } finally {
        setLoadingProfile(false);
      }
    })();

    return () => ac.abort();
  }, [router]);

  useEffect(() => {
    const stored = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    const normalizedScale = normalizeFontScale(stored);
    setFontScale(normalizedScale);
    document.documentElement.style.setProperty("--app-font-scale", String(normalizedScale));
  }, []);

  const handleRateChange = (key: ExchangeRateKey) => (event: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setRates((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleRatesSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!canSubmitRates || jpy === null || vnd === null) {
      setErrorMessage("レートは0より大きい数値で入力してください。");
      return;
    }

    setSavingRates(true);
    try {
      const updated = await saveExchangeRates({ jpyPerUsd: jpy, vndPerUsd: vnd });
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
      setSavingRates(false);
    }
  };

  const handleFontScaleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!canSubmitFontScale) {
      return;
    }

    setSavingFontScale(true);
    try {
      const normalizedScale = normalizeFontScale(fontScale);
      setFontScale(normalizedScale);
      localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(normalizedScale));
      document.documentElement.style.setProperty("--app-font-scale", String(normalizedScale));
    } catch {
      setErrorMessage("文字サイズの保存に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSavingFontScale(false);
    }
  };

  const handleCompanyChange = (key: CompanyKey) => (event: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setCompany((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleCompanySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!canSubmitCompany) {
      return;
    }

    setSavingCompany(true);
    try {
      const updated = await saveCompanyProfile({
        issuerName: company.issuerName.trim(),
        issuerAddress: company.issuerAddress.trim(),
        issuerPhone: company.issuerPhone.trim(),
        issuerFax: company.issuerFax.trim(),
      });
      setCompany({
        issuerName: updated.issuerName ?? "",
        issuerAddress: updated.issuerAddress ?? "",
        issuerPhone: updated.issuerPhone ?? "",
        issuerFax: updated.issuerFax ?? "",
      });
    } catch (e) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") {
        router.replace("/");
        return;
      }
      setErrorMessage("会社情報の保存に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSavingCompany(false);
    }
  };

  const handleProfileChange = (key: ProfileKey) => (event: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setProfile((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    setSavingProfile(true);
    try {
      await updateMyProfileAttributes({
        userName: profile.userName.trim(),
        departmentName: profile.departmentName.trim(),
      });

      const me = await getMyProfile();
      if (me) {
        setProfile({
          userName: me.userName ?? "",
          departmentName: me.departmentName ?? "",
        });
      }

      window.dispatchEvent(new Event("mvops:profile-updated"));
    } catch (e: unknown) {
      console.error(e);
      const code = hasCode(e) ? String(e.code ?? "") : null;
      const msg = e instanceof Error ? e.message : null;

      if (msg === "UNAUTHORIZED") {
        router.replace("/");
        return;
      }
      setErrorMessage(`ユーザー情報の保存に失敗しました。（${code ?? msg ?? "UNKNOWN"}）`);
    } finally {
      setSavingProfile(false);
    }
  };

  if (loadingRates || loadingProfile) {
    return <div className="text-sm text-gray-500">{tx("読み込み中...")}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {tx(errorMessage)}
        </div>
      )}

      <form onSubmit={handleProfileSubmit}>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{tx("ユーザー情報")}</h2>
            <p className="text-sm text-gray-600">{tx("ヘッダーに表示するユーザー名・所属部署を設定します")}</p>
          </div>

          <div className="mt-6 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-800">{tx("ユーザー名")}</span>
              <TextField
                size="small"
                value={profile.userName}
                onChange={handleProfileChange("userName")}
                placeholder={tx("例）Huong Nguyen")}
                disabled={savingProfile || loadingProfile}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-800">{tx("所属部署")}</span>
              <TextField
                size="small"
                value={profile.departmentName}
                onChange={handleProfileChange("departmentName")}
                placeholder={tx("例）経理部")}
                disabled={savingProfile || loadingProfile}
              />
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save size={16} />}
              className="whitespace-nowrap"
              disabled={!canSubmitProfile}
            >
              {savingProfile ? tx("保存中...") : tx("保存")}
            </Button>
          </div>
        </div>
      </form>

      <form onSubmit={handleCompanySubmit}>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{tx("会社情報")}</h2>
            <p className="text-sm text-gray-600">{tx("会社名・住所・電話番号・FAXを設定します")}</p>
          </div>

          <div className="mt-6 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-800">{tx("会社名")}</span>
              <TextField
                size="small"
                value={company.issuerName}
                onChange={handleCompanyChange("issuerName")}
                placeholder={tx("例）増田ビニール株式会社")}
                disabled={savingCompany || loadingRates}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-800">{tx("住所")}</span>
              <TextField
                size="small"
                value={company.issuerAddress}
                onChange={handleCompanyChange("issuerAddress")}
                placeholder={tx("例）Binh Duong, Vietnam")}
                multiline
                minRows={3}
                disabled={savingCompany || loadingRates}
              />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-800">TEL</span>
                <TextField
                  size="small"
                  value={company.issuerPhone ?? ""}
                  onChange={handleCompanyChange("issuerPhone")}
                  placeholder="1234-5678-901"
                  disabled={savingCompany || loadingRates}
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-800">{tx("FAX")}</span>
                <TextField
                  size="small"
                  value={company.issuerFax ?? ""}
                  onChange={handleCompanyChange("issuerFax")}
                  placeholder="1234-5678-901"
                  disabled={savingCompany || loadingRates}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save size={16} />}
              className="whitespace-nowrap"
              disabled={!canSubmitCompany}
            >
              {savingCompany ? tx("保存中...") : tx("保存")}
            </Button>
          </div>
        </div>
      </form>

      <form onSubmit={handleFontScaleSubmit}>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{tx("文字サイズ")}</h2>
            <p className="text-sm text-gray-600">{tx("アプリ全体の文字サイズを設定します")}</p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-800">{tx("サイズ")}</span>
            <TextField
              select
              size="small"
              value={fontScale}
              onChange={(event) => setFontScale(normalizeFontScale(event.target.value))}
              disabled={savingFontScale}
              sx={{ maxWidth: 200 }}
            >
              {FONT_SCALE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {tx(option.label)}
                </MenuItem>
              ))}
            </TextField>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save size={16} />}
              className="whitespace-nowrap"
              disabled={!canSubmitFontScale}
            >
              {savingFontScale ? tx("保存中...") : tx("保存")}
            </Button>
          </div>
        </div>
      </form>

      <form onSubmit={handleRatesSubmit}>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{tx("換算レート設定")}</h2>
            <p className="text-sm text-gray-600">{tx("1 USD あたりの通貨を入力してください")}</p>
          </div>

          <div className="mt-6 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="text-sm font-semibold text-gray-800">{tx("JPY -> USD レート")}</span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-gray-600">1 USD =</span>
                <TextField
                  size="small"
                  type="number"
                  value={rates.jpyPerUsd}
                  onChange={handleRateChange("jpyPerUsd")}
                  placeholder="150"
                  sx={{ width: 140 }}
                  disabled={savingRates || loadingRates}
                  slotProps={{
                    htmlInput: { inputMode: "decimal", pattern: "[0-9]*[.]?[0-9]*", min: 0, step: 0.01 },
                  }}
                />
                <span className="text-sm text-gray-600">JPY</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-semibold text-gray-800">{tx("VND -> USD レート")}</span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-gray-600">1 USD =</span>
                <TextField
                  size="small"
                  type="number"
                  value={rates.vndPerUsd}
                  onChange={handleRateChange("vndPerUsd")}
                  placeholder="25000"
                  sx={{ width: 140 }}
                  disabled={savingRates || loadingRates}
                  slotProps={{
                    htmlInput: { inputMode: "decimal", pattern: "[0-9]*[.]?[0-9]*", min: 0, step: 0.01 },
                  }}
                />
                <span className="text-sm text-gray-600">VND</span>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save size={16} />}
              className="whitespace-nowrap"
              disabled={!canSubmitRates}
            >
              {savingRates ? tx("保存中...") : tx("保存")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

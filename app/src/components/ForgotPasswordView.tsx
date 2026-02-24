"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  confirmPasswordReset,
  getCurrentSession,
  requestPasswordReset,
  type ForgotPasswordDelivery,
} from "@/lib/auth/cognito";

type AuthError = {
  code?: string;
  message?: string;
};

const passwordRequirementText = "半角英数字8文字以上";
const passwordPattern = /^[A-Za-z0-9]{8,}$/;

const getErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const code = (error as AuthError).code;
  return typeof code === "string" ? code : undefined;
};

const getResetErrorMessage = (error: unknown): string => {
  const code = getErrorCode(error);

  switch (code) {
    case "CONFIG_MISSING":
      return "Cognitoの設定が不足しています。環境変数を確認してください。";
    case "STORAGE_UNAVAILABLE":
      return "ブラウザのストレージにアクセスできません。設定を確認してください。";
    case "UserNotFoundException":
      // セキュリティの観点でユーザーの存在可否を明言しない運用もありますが、今回はログインと同じ方針に合わせる
      return "ユーザーが見つかりません。";
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "試行回数が多すぎます。しばらく待ってから再試行してください。";
    case "InvalidParameterException":
      return "入力内容を確認してください。";
    case "InvalidPasswordException":
      return `パスワードは${passwordRequirementText}で入力してください。`;
    case "CodeMismatchException":
      return "確認コードが正しくありません。";
    case "ExpiredCodeException":
      return "確認コードの有効期限が切れています。もう一度コードを送信してください。";
    default:
      break;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as AuthError).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return "パスワード再設定に失敗しました。時間をおいて再度お試しください。";
};

type Step = "request" | "confirm" | "done";

export default function ForgotPasswordView() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<ForgotPasswordDelivery | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const session = await getCurrentSession();
      if (session && isMounted) {
        router.replace("/dashboard");
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const deliveryText = useMemo(() => {
    if (!delivery) {
      return null;
    }
    const medium = delivery.deliveryMedium ? `（${delivery.deliveryMedium}）` : "";
    const dest = delivery.destination ? `: ${delivery.destination}` : "";
    return `${medium}${dest}`.trim() || null;
  }, [delivery]);

  const handleIdentifierChange = (e: ChangeEvent<HTMLInputElement>) => setIdentifier(e.target.value);
  const handleVerificationCodeChange = (e: ChangeEvent<HTMLInputElement>) => setVerificationCode(e.target.value);
  const handleNewPasswordChange = (e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value);
  const handleNewPasswordConfirmChange = (e: ChangeEvent<HTMLInputElement>) => setNewPasswordConfirm(e.target.value);

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    if (!identifier.trim()) {
      setErrorMessage("メールアドレスを入力してください。");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const d = await requestPasswordReset(identifier);
      setDelivery(d);
      setStep("confirm");
      setVerificationCode("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (error) {
      setErrorMessage(getResetErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    if (!identifier.trim()) {
      setErrorMessage("メールアドレスを入力してください。");
      return;
    }

    if (!verificationCode.trim()) {
      setErrorMessage("確認コードを入力してください。");
      return;
    }

    if (!newPassword || !newPasswordConfirm) {
      setErrorMessage("新しいパスワードを入力してください。");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setErrorMessage("新しいパスワードが一致しません。");
      return;
    }

    if (!passwordPattern.test(newPassword)) {
      setErrorMessage(`パスワードは${passwordRequirementText}で入力してください。`);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await confirmPasswordReset({
        identifier,
        verificationCode,
        newPassword,
      });
      setStep("done");
    } catch (error) {
      setErrorMessage(getResetErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-start px-6 pt-20 pb-12">
        <header className="text-center">
          <p className="whitespace-nowrap text-[clamp(1.5rem,2.6vw,2.2rem)] font-bold tracking-[0.04em] leading-tight">
            増田ビニール株式会社
          </p>
          <p className="mt-2 text-[0.95rem] font-semibold tracking-[0.28em] text-slate-500">オペレーションシステム</p>
        </header>

        <form
          className="mt-16 w-full rounded-[3px] bg-[#e9f9fb] px-8 pt-9 pb-8"
          onSubmit={step === "request" ? handleRequest : handleConfirm}
        >
          <div className="flex flex-col gap-5">
            {errorMessage && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {errorMessage}
              </div>
            )}

            {step === "done" ? (
              <div className="rounded-[3px] bg-white/60 px-3 py-2 text-sm text-slate-600">
                パスワードを更新しました。ログイン画面に戻ってログインしてください。
              </div>
            ) : step === "confirm" ? (
              <>
                <div className="rounded-[3px] bg-white/60 px-3 py-2 text-sm text-slate-600">
                  確認コードを送信しました{deliveryText ? ` ${deliveryText}` : ""}。
                  受信した確認コードと新しいパスワードを入力してください。
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[0.95rem] text-neutral-600">メールアドレス</span>
                  <input
                    id="identifier"
                    name="identifier"
                    type="email"
                    autoComplete="email"
                    aria-label="メールアドレス"
                    value={identifier}
                    onChange={handleIdentifierChange}
                    required
                    disabled={isSubmitting}
                    className="h-10 w-full rounded-[3px] border border-teal-700/25 bg-white/80 px-3 text-base text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[0.95rem] text-neutral-600">確認コード</span>
                  <input
                    id="verification-code"
                    name="verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label="確認コード"
                    value={verificationCode}
                    onChange={handleVerificationCodeChange}
                    required
                    disabled={isSubmitting}
                    className="h-10 w-full rounded-[3px] border border-teal-700/25 bg-white/80 px-3 text-base text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[0.95rem] text-neutral-600">新しいパスワード</span>
                  <input
                    id="new-password"
                    name="new-password"
                    type="password"
                    autoComplete="new-password"
                    aria-label="新しいパスワード"
                    value={newPassword}
                    onChange={handleNewPasswordChange}
                    required
                    disabled={isSubmitting}
                    className="h-10 w-full rounded-[3px] border border-teal-700/25 bg-white/80 px-3 text-base text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500">※ {passwordRequirementText}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[0.95rem] text-neutral-600">新しいパスワード（確認）</span>
                  <input
                    id="new-password-confirm"
                    name="new-password-confirm"
                    type="password"
                    autoComplete="new-password"
                    aria-label="新しいパスワード（確認）"
                    value={newPasswordConfirm}
                    onChange={handleNewPasswordConfirmChange}
                    required
                    disabled={isSubmitting}
                    className="h-10 w-full rounded-[3px] border border-teal-700/25 bg-white/80 px-3 text-base text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (isSubmitting) {
                      return;
                    }
                    setErrorMessage(null);
                    setIsSubmitting(true);
                    try {
                      const d = await requestPasswordReset(identifier);
                      setDelivery(d);
                    } catch (error) {
                      setErrorMessage(getResetErrorMessage(error));
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="inline-flex w-fit cursor-pointer self-start text-[0.85rem] text-teal-700 hover:underline"
                >
                  確認コードを再送する
                </button>
              </>
            ) : (
              <>
                <div className="rounded-[3px] bg-white/60 px-3 py-2 text-sm text-slate-600">
                  登録済みのメールアドレス宛に確認コードを送信します。
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[0.95rem] text-neutral-600">メールアドレス</span>
                  <input
                    id="identifier"
                    name="identifier"
                    type="email"
                    autoComplete="email"
                    aria-label="メールアドレス"
                    value={identifier}
                    onChange={handleIdentifierChange}
                    required
                    disabled={isSubmitting}
                    className="h-10 w-full rounded-[3px] border border-teal-700/25 bg-white/80 px-3 text-base text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-[1.1rem] flex flex-col gap-2.5">
            <Link
              href="/"
              className="inline-flex w-fit cursor-pointer self-start text-[0.85rem] text-teal-700 hover:underline"
            >
              ログイン画面に戻る
            </Link>
          </div>

          <div className="mt-6 flex justify-center">
            {step === "done" ? (
              <Link
                href="/"
                className="w-full rounded-[3px] bg-[#00a7c2] py-3 text-center text-base font-semibold tracking-[0.08em] text-white hover:bg-[#0094ad]"
              >
                ログインへ
              </Link>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-[3px] bg-[#00a7c2] py-3 text-base font-semibold tracking-[0.08em] text-white hover:bg-[#0094ad]"
              >
                {step === "request"
                  ? isSubmitting
                    ? "送信中..."
                    : "確認コードを送信"
                  : isSubmitting
                  ? "更新中..."
                  : "パスワードを更新"}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  completeNewPasswordChallenge,
  getCurrentSession,
  signInWithPassword,
  type NewPasswordChallenge,
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

const getLoginErrorMessage = (error: unknown, context: "sign-in" | "new-password" = "sign-in"): string => {
  const code = getErrorCode(error);

  switch (code) {
    case "CONFIG_MISSING":
      return "Cognitoの設定が不足しています。環境変数を確認してください。";
    case "STORAGE_UNAVAILABLE":
      return "ブラウザのストレージにアクセスできません。設定を確認してください。";
    case "NEW_PASSWORD_REQUIRED":
      return "初回ログインのためパスワード変更が必要です。新しいパスワードを設定してください。";
    case "MFA_REQUIRED":
    case "TOTP_REQUIRED":
    case "SELECT_MFA_TYPE":
      return "このアカウントは多要素認証が必要です。管理者に連絡してください。";
    case "CUSTOM_CHALLENGE":
      return "追加認証が必要です。管理者に連絡してください。";
    case "UserNotConfirmedException":
      return "ユーザー確認が完了していません。管理者に連絡してください。";
    case "NotAuthorizedException":
      return context === "new-password"
        ? "パスワード更新のセッションが無効です。最初からログインしてください。"
        : "メールアドレスまたはパスワードが正しくありません。";
    case "UserNotFoundException":
      return "ユーザーが見つかりません。";
    case "PasswordResetRequiredException":
      return "パスワードのリセットが必要です。";
    case "TooManyRequestsException":
    case "LimitExceededException":
      return "試行回数が多すぎます。しばらく待ってから再試行してください。";
    case "InvalidParameterException":
      return "入力内容を確認してください。";
    case "InvalidPasswordException":
      return context === "new-password"
        ? `パスワードは${passwordRequirementText}で入力してください。`
        : "パスワードの形式が正しくありません。";
    default:
      break;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as AuthError).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return "ログインに失敗しました。時間をおいて再度お試しください。";
};

type LoginFormState = {
  identifier: string;
  password: string;
  remember: boolean;
};

type NewPasswordState = NewPasswordChallenge & {
  remember: boolean;
};

export default function LoginView() {
  const router = useRouter();
  const [form, setForm] = useState<LoginFormState>({
    identifier: "",
    password: "",
    remember: false,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPasswordState, setNewPasswordState] = useState<NewPasswordState | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const isNewPasswordRequired = newPasswordState !== null;

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

  const handleTextChange = (key: "identifier" | "password") => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleRememberChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, remember: event.target.checked }));
  };

  const handleCancelNewPassword = () => {
    setNewPasswordState(null);
    setNewPassword("");
    setNewPasswordConfirm("");
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    if (!form.identifier.trim() || !form.password) {
      setErrorMessage("メールアドレスとパスワードを入力してください。");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await signInWithPassword({
        identifier: form.identifier,
        password: form.password,
        remember: form.remember,
      });
      if (result.type === "NEW_PASSWORD_REQUIRED") {
        if (result.requiredAttributes.length > 0) {
          setErrorMessage("必須属性が未設定です。管理者に連絡してください。");
          return;
        }
        setNewPasswordState({ ...result, remember: form.remember });
        setNewPassword("");
        setNewPasswordConfirm("");
        return;
      }
      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewPasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !newPasswordState) {
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
      await completeNewPasswordChallenge({
        user: newPasswordState.user,
        newPassword,
        userAttributes: newPasswordState.userAttributes,
        requiredAttributes: newPasswordState.requiredAttributes,
        requiredAttributeValues: {},
        remember: newPasswordState.remember,
      });
      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error, "new-password"));
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
          onSubmit={isNewPasswordRequired ? handleNewPasswordSubmit : handleSubmit}
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
            {isNewPasswordRequired ? (
              <>
                <div className="rounded-[3px] bg-white/60 px-3 py-2 text-sm text-slate-600">
                  初回ログインのため、新しいパスワードを設定してください。
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
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    disabled={isSubmitting}
                    className="h-10 w-full rounded-[3px] border border-teal-700/25 bg-white/80 px-3 text-base text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">{passwordRequirementText}</span>
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
                    onChange={(event) => setNewPasswordConfirm(event.target.value)}
                    required
                    disabled={isSubmitting}
                    className="h-10 w-full rounded-[3px] border border-teal-700/25 bg-white/80 px-3 text-base text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <span className="text-[0.95rem] text-neutral-600">メールアドレス</span>
                  <input
                    id="identifier"
                    name="identifier"
                    type="email"
                    autoComplete="email"
                    aria-label="メールアドレス"
                    value={form.identifier}
                    onChange={handleTextChange("identifier")}
                    required
                    disabled={isSubmitting}
                    className="h-10 w-full rounded-[3px] border border-teal-700/25 bg-white/80 px-3 text-base text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[0.95rem] text-neutral-600">パスワード</span>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    aria-label="パスワード"
                    value={form.password}
                    onChange={handleTextChange("password")}
                    required
                    disabled={isSubmitting}
                    className="h-10 w-full rounded-[3px] border border-teal-700/25 bg-white/80 px-3 text-base text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>
          {isNewPasswordRequired ? (
            <div className="mt-[1.1rem] flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleCancelNewPassword}
                className="inline-flex w-fit cursor-pointer self-start text-[0.85rem] text-teal-700 hover:underline"
              >
                ログイン画面に戻る
              </button>
            </div>
          ) : (
            <div className="mt-[1.1rem] flex flex-col gap-2.5">
              <label
                className="inline-flex w-fit cursor-pointer self-start items-center gap-2.5 text-[0.9rem] text-slate-900"
                htmlFor="remember"
              >
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={form.remember}
                  onChange={handleRememberChange}
                  disabled={isSubmitting}
                  className="h-4 w-4 accent-teal-600"
                />
                ログイン情報を保持
              </label>
              <Link
                href="/forgot-password"
                className="inline-flex w-fit cursor-pointer self-start text-[0.85rem] text-teal-700 hover:underline"
              >
                パスワードを忘れた方はこちら
              </Link>
            </div>
          )}
          <div className="mt-6 flex justify-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-[3px] bg-[#00a7c2] py-3 text-base font-semibold tracking-[0.08em] text-white hover:bg-[#0094ad]"
            >
              {isNewPasswordRequired
                ? isSubmitting
                  ? "更新中..."
                  : "パスワードを更新"
                : isSubmitting
                ? "ログイン中..."
                : "ログイン"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

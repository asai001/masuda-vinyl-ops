"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type LoginFormState = {
  identifier: string;
  password: string;
  remember: boolean;
};

export default function LoginView() {
  const router = useRouter();
  const [form, setForm] = useState<LoginFormState>({
    identifier: "",
    password: "",
    remember: false,
  });

  const handleTextChange = (key: "identifier" | "password") => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleRememberChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, remember: event.target.checked }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-start px-6 pt-20 pb-12">
        <header className="text-center">
          <p className="whitespace-nowrap text-[clamp(1.5rem,2.6vw,2.2rem)] font-bold tracking-[0.04em] leading-tight">
            増田ビニール株式会社
          </p>
          <p className="mt-2 text-[0.95rem] font-semibold tracking-[0.28em] text-slate-500">
            オペレーションシステム
          </p>
        </header>
        <form className="mt-16 w-full rounded-[3px] bg-[#e9f9fb] px-8 pt-9 pb-8" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-[0.95rem] text-neutral-600">ログインID</span>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                aria-label="ログインID"
                value={form.identifier}
                onChange={handleTextChange("identifier")}
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
                className="h-10 w-full rounded-[3px] border border-teal-700/25 bg-white/80 px-3 text-base text-slate-900 focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>
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
                className="h-4 w-4 accent-teal-600"
              />
              ログイン情報を保持
            </label>
            <button
              type="button"
              className="inline-flex w-fit cursor-pointer self-start text-[0.85rem] text-teal-700 hover:underline"
            >
              パスワードを忘れた方はこちら
            </button>
          </div>
          <div className="mt-6 flex justify-center">
            <button
              type="submit"
              className="w-full rounded-[3px] bg-[#00a7c2] py-3 text-base font-semibold tracking-[0.08em] text-white hover:bg-[#0094ad]"
            >
              ログイン
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

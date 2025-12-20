import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          増田ビニール 経営管理システム
        </h1>
        <p className="text-gray-600 mb-8">ログイン画面（未実装）</p>
        <p className="text-gray-500">
          ダッシュボードへのアクセス:{" "}
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            /dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}

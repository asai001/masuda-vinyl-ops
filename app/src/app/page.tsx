export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">増田ビニール 経営管理システム</h1>
        <p className="text-gray-600 mb-6">ログイン画面（未実装）</p>
        <p className="text-sm text-gray-400">
          ダッシュボードへのアクセス: <a href="/dashboard" className="text-blue-600 hover:underline">/dashboard</a>
        </p>
      </div>
    </div>
  );
}

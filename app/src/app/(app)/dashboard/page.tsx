import { ShoppingCart, TrendingUp, Users } from "lucide-react";

export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">クイックアクション</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                <ShoppingCart className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">発注管理</h3>
                <p className="text-sm text-gray-600">発注一覧</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4">
                <TrendingUp className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">受注管理</h3>
                <p className="text-sm text-gray-600">受注一覧</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mr-4">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">取引先マスタ</h3>
                <p className="text-sm text-gray-600">取引先一覧</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

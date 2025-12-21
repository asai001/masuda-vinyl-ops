import Link from "next/link";
import { ShoppingCart, TrendingUp, DollarSign } from "lucide-react";

export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">クイックアクション</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <Link href="/order-management" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                <ShoppingCart className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">発注管理</h3>
                <p className="text-sm text-gray-600">発注一覧</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/sales-management" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                <TrendingUp className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">受注管理</h3>
                <p className="text-sm text-gray-600">受注一覧</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/payment-management" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mr-4">
                <DollarSign className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">支払い管理</h3>
                <p className="text-sm text-gray-600">支払い一覧</p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

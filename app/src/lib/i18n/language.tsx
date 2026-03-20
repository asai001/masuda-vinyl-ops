"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export const APP_LANGUAGE_STORAGE_KEY = "mvops:app-language";

export const APP_LANGUAGES = ["ja", "vi"] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const isAppLanguage = (value: string): value is AppLanguage => value === "ja" || value === "vi";

const keyedMessages = {
  "common.language": { ja: "言語", vi: "Ngôn ngữ" },
  "app.name": { ja: "増田ビニール", vi: "Masuda Vinyl" },
  "app.subtitle": { ja: "オペレーションシステム", vi: "Hệ thống vận hành" },
  "nav.dashboard": { ja: "ダッシュボード", vi: "Bảng điều khiển" },
  "nav.clientMaster": { ja: "取引先マスタ", vi: "Danh mục khách hàng" },
  "nav.materialMaster": { ja: "材料マスタ", vi: "Danh mục vật liệu" },
  "nav.orderManagement": { ja: "発注管理", vi: "Quản lý đặt hàng" },
  "nav.productMaster": { ja: "製品マスタ", vi: "Danh mục sản phẩm" },
  "nav.salesManagement": { ja: "受注管理", vi: "Quản lý đơn bán" },
  "nav.shipmentManagement": { ja: "出荷管理", vi: "Quản lý xuất hàng" },
  "nav.paymentMaster": { ja: "支払いマスタ", vi: "Danh mục thanh toán" },
  "nav.paymentManagement": { ja: "支払い管理", vi: "Quản lý thanh toán" },
  "nav.settings": { ja: "各種設定", vi: "Cài đặt" },
  "nav.logout": { ja: "ログアウト", vi: "Đăng xuất" },
  "page.orderSummary": { ja: "発注集計", vi: "Tổng hợp đặt hàng" },
  "page.salesSummary": { ja: "受注集計", vi: "Tổng hợp đơn bán" },
  "page.paymentSummary": { ja: "支払い集計", vi: "Tổng hợp thanh toán" },
  "dashboard.quickActions": { ja: "クイックアクション", vi: "Thao tác nhanh" },
  "dashboard.orderList": { ja: "発注一覧", vi: "Danh sách đặt hàng" },
  "dashboard.salesList": { ja: "受注一覧", vi: "Danh sách đơn bán" },
  "dashboard.paymentList": { ja: "支払い一覧", vi: "Danh sách thanh toán" },
} as const;

export type TranslationKey = keyof typeof keyedMessages;

const phraseMessages: Record<string, string> = {
  ["新規登録"]: "Tạo mới",
  ["フィルタ追加"]: "Thêm bộ lọc",
  ["値を選択"]: "Chọn giá trị",
  ["選択してください"]: "Vui lòng chọn",
  ["選択または入力"]: "Chọn hoặc nhập",
  ["選択または入力してください"]: "Vui lòng chọn hoặc nhập",
  ["検索して選択"]: "Tìm và chọn",
  ["値を入力"]: "Nhập giá trị",
  ["最小"]: "Tối thiểu",
  ["最大"]: "Tối đa",
  ["年/月/日"]: "Năm/Tháng/Ngày",
  ["表示件数"]: "Số dòng hiển thị",
  ["保存"]: "Lưu",
  ["キャンセル"]: "Hủy",
  ["削除"]: "Xóa",
  ["閉じる"]: "Đóng",
  ["編集"]: "Chỉnh sửa",
  ["新規発注"]: "Tạo đơn đặt hàng",
  ["新規受注"]: "Tạo đơn bán",
  ["新規支払"]: "Tạo thanh toán",
  ["新規材料"]: "Tạo vật liệu",
  ["新規製品"]: "Tạo sản phẩm",
  ["新規取引先"]: "Tạo đối tác mới",
  ["支払編集"]: "Chỉnh sửa thanh toán",
  ["削除確認"]: "Xác nhận xóa",
  ["削除することを確認しました"]: "Tôi xác nhận xóa mục này",
  ["削除してもよろしいですか？"]: "Bạn có chắc chắn muốn xóa không?",
  ["品目を選択してください"]: "Vui lòng chọn mặt hàng",
  ["備考を入力してください"]: "Vui lòng nhập ghi chú",
  ["摘要を入力してください"]: "Vui lòng nhập diễn giải",
  ["例:"]: "Ví dụ:",
  ["例: 鋼材A"]: "Ví dụ: Vật liệu A",
  ["例: 山田商事株式会社"]: "Ví dụ: Yamada Shoji Co., Ltd.",
  ["e.g. 123456789"]: "Ví dụ: 123456789",
  ["読み込み中..."]: "Đang tải...",
  ["ログアウトしています..."]: "Đang đăng xuất...",
  ["保存中..."]: "Đang lưu...",
  ["保存中"]: "Đang lưu",
  ["削除中..."]: "Đang xóa...",
  ["削除中"]: "Đang xóa",
  ["生成中"]: "Đang tạo",
  ["発行中..."]: "Đang phát hành...",
  ["集計ページへ"]: "Đến trang tổng hợp",
  ["リセット"]: "Đặt lại",
  ["すべて"]: "Tất cả",
  ["有効"]: "Đang hoạt động",
  ["無効"]: "Không hoạt động",
  ["固定費"]: "Chi phí cố định",
  ["変動費"]: "Chi phí biến đổi",
  ["支払済み"]: "Đã thanh toán",
  ["未払い"]: "Chưa thanh toán",
  ["発注済み"]: "Đã đặt hàng",
  ["支払い済み"]: "Đã thanh toán",
  ["納品済み"]: "Đã giao hàng",
  ["出荷済み"]: "Đã xuất hàng",
  ["入金済み"]: "Đã thu tiền",
  ["請求済み"]: "Đã xuất hóa đơn",
  ["書類状況"]: "Tình trạng chứng từ",
  ["請求状況"]: "Tình trạng hóa đơn",
  ["仕入先"]: "Nhà cung cấp",
  ["支払先名"]: "Tên đơn vị nhận thanh toán",
  ["取引先"]: "Đối tác",
  ["区分"]: "Phân loại",
  ["地域"]: "Khu vực",
  ["住所"]: "Địa chỉ",
  ["電話番号"]: "Số điện thoại",
  ["担当者名"]: "Tên người phụ trách",
  ["明細"]: "Chi tiết",
  ["部品明細"]: "Chi tiết linh kiện",
  ["部品を追加"]: "Thêm linh kiện",
  ["部品明細を追加してください"]: "Vui lòng thêm chi tiết linh kiện",
  ["製品明細"]: "Chi tiết sản phẩm",
  ["製品を追加"]: "Thêm sản phẩm",
  ["製品"]: "Sản phẩm",
  ["製品 #"]: "Sản phẩm #",
  ["製品明細を追加してください"]: "Vui lòng thêm chi tiết sản phẩm",
  ["顧客名"]: "Tên khách hàng",
  ["顧客"]: "Khách hàng",
  ["品番"]: "Mã hàng",
  ["品目"]: "Mặt hàng",
  ["品目名"]: "Tên mặt hàng",
  ["カテゴリ"]: "Danh mục",
  ["単位"]: "Đơn vị",
  ["数量"]: "Số lượng",
  ["単価"]: "Đơn giá",
  ["標準単価"]: "Đơn giá tiêu chuẩn",
  ["通貨"]: "Tiền tệ",
  ["ステータス"]: "Trạng thái",
  ["内容"]: "Nội dung",
  ["金額"]: "Số tiền",
  ["合計金額"]: "Tổng số tiền",
  ["平均金額"]: "Giá trị trung bình",
  ["支払方法"]: "Phương thức thanh toán",
  ["発注書送付"]: "Đã gửi đơn đặt hàng",
  ["納品書受領"]: "Đã nhận phiếu giao hàng",
  ["請求書受領"]: "Đã nhận hóa đơn",
  ["発注書受領"]: "Đã nhận đơn đặt hàng",
  ["納品書送付"]: "Đã gửi phiếu giao hàng",
  ["請求書送付"]: "Đã gửi hóa đơn",
  ["支払日"]: "Ngày thanh toán",
  ["発注日"]: "Ngày đặt hàng",
  ["受注日"]: "Ngày nhận đơn",
  ["納品予定日"]: "Ngày giao dự kiến",
  ["備考"]: "Ghi chú",
  ["件数"]: "Số lượng",
  ["仕入先数"]: "Số nhà cung cấp",
  ["在庫数"]: "Tồn kho",
  ["注数"]: "Số lượng đặt",
  ["出荷数"]: "Số lượng xuất",
  ["残注数"]: "Số lượng còn lại",
  ["必要材料量"]: "Lượng nguyên vật liệu cần thiết",
  ["成形時間"]: "Thời gian tạo hình",
  ["使用材料"]: "Nguyên vật liệu sử dụng",
  ["重量"]: "Trọng lượng",
  ["正味重量"]: "Net Weight",
  ["長さ"]: "Chiều dài",
  ["分速"]: "Tốc độ/phút",
  ["梱包数"]: "Số lượng đóng gói",
  ["製品詳細"]: "Chi tiết sản phẩm",
  ["パレット数"]: "Số pallet",
  ["総重量"]: "Tổng trọng lượng",
  ["発注件数"]: "Số đơn đặt hàng",
  ["受注件数"]: "Số đơn bán",
  ["支払件数"]: "Số khoản thanh toán",
  ["顧客数"]: "Số khách hàng",
  ["カテゴリ数"]: "Số danh mục",
  ["登録件数"]: "Số dữ liệu đã đăng ký",
  ["登録材料数"]: "Số vật liệu đã đăng ký",
  ["マスタ件数"]: "Số dữ liệu master",
  ["登録製品数"]: "Số sản phẩm đã đăng ký",
  ["新規マスタ登録"]: "Đăng ký dữ liệu master mới",
  ["集計サマリー"]: "Tóm tắt tổng hợp",
  ["集計サマリー（今月）"]: "Tóm tắt tổng hợp (tháng này)",
  ["確定のみ・発注日基準・集計時点レート"]:
    "Chỉ dữ liệu đã xác nhận / theo ngày đặt hàng / tỷ giá tại thời điểm tổng hợp",
  ["確定のみ・受注日基準・集計時点レート"]:
    "Chỉ dữ liệu đã xác nhận / theo ngày nhận đơn / tỷ giá tại thời điểm tổng hợp",
  ["USD換算合計"]: "Tổng quy đổi USD",
  ["対象年月"]: "Tháng/Năm mục tiêu",
  ["支払データ生成"]: "Tạo dữ liệu thanh toán",
  ["支払済み・未払い両方 / 支払日基準 / 集計時点レート"]:
    "Gồm cả đã thanh toán và chưa thanh toán / theo ngày thanh toán / tỷ giá tại thời điểm tổng hợp",
  ["残注数確認"]: "Kiểm tra đơn tồn",
  ["期間"]: "Khoảng thời gian",
  ["期間基準: 発注日"]: "Mốc thời gian: Ngày đặt hàng",
  ["集計単位"]: "Đơn vị tổng hợp",
  ["表示通貨"]: "Tiền tệ hiển thị",
  ["集計対象: 確定のみ（発注書発行）"]: "Phạm vi tổng hợp: Chỉ dữ liệu đã xác nhận (đã phát hành đơn đặt hàng)",
  ["集計対象: 確定のみ（受注書受領）"]: "Phạm vi tổng hợp: Chỉ dữ liệu đã xác nhận (đã nhận đơn bán)",
  ["集計対象: 支払済み・未払い"]: "Phạm vi tổng hợp: Đã thanh toán và chưa thanh toán",
  ["換算レート: 集計時点"]: "Tỷ giá quy đổi: Tại thời điểm tổng hợp",
  ["期間基準: 受注日"]: "Mốc thời gian: Ngày nhận đơn",
  ["期間基準: 支払日"]: "Mốc thời gian: Ngày thanh toán",
  ["日別"]: "Theo ngày",
  ["週別"]: "Theo tuần",
  ["月別"]: "Theo tháng",
  ["データなし"]: "Không có dữ liệu",
  ["合計金額ベース"]: "Dựa trên tổng số tiền",
  ["平均金額（USD/件）"]: "Giá trị trung bình (USD/mục)",
  ["仕入先割合"]: "Tỷ trọng nhà cung cấp",
  ["金額推移"]: "Xu hướng số tiền",
  ["金額推移（日別）"]: "Xu hướng số tiền (theo ngày)",
  ["棒: 合計金額 / 線: 金額推移"]: "Cột: Tổng số tiền / Đường: Xu hướng số tiền",
  ["別サマリー"]: "Tóm tắt theo",
  ["割合"]: "Tỷ trọng",
  ["期間別サマリー"]: "Tóm tắt theo kỳ",
  ["仕入先別サマリー"]: "Tóm tắt theo nhà cung cấp",
  ["顧客別サマリー"]: "Tóm tắt theo khách hàng",
  ["カテゴリ別サマリー"]: "Tóm tắt theo danh mục",
  ["顧客割合"]: "Tỷ trọng khách hàng",
  ["カテゴリ割合"]: "Tỷ trọng danh mục",
  ["その他"]: "Khác",
  ["未設定"]: "Chưa thiết lập",
  ["条件に一致するデータがありません。"]: "Không có dữ liệu phù hợp với điều kiện.",
  ["受注書受領"]: "Đã nhận đơn bán",
  ["複数"]: "Nhiều",
  ["他{count}件"]: "+ {count} mục khác",
  ["インボイス"]: "Hóa đơn",
  ["パッキングリスト"]: "Phiếu đóng gói",
  ["注文書"]: "Đơn đặt hàng (PO)",
  ["注文書発行"]: "Phát hành đơn đặt hàng",
  ["注文書の発行"]: "Phát hành đơn đặt hàng",
  ["テンプレート（発注フォーム.xlsx）から注文書をExcel形式で発行します。"]:
    "Phát hành đơn đặt hàng dạng Excel từ mẫu (発注フォーム.xlsx).",
  ["発行"]: "Phát hành",
  ["インボイス・パッキングリスト発行"]: "Phát hành hóa đơn/Phiếu đóng gói",
  ["インボイス・パッキングリストの発行"]: "Phát hành Hóa đơn / Phiếu đóng gói",
  ["発行するテンプレートを選択してください。"]: "Vui lòng chọn mẫu cần phát hành.",
  ["取引先用"]: "Dành cho đối tác",
  ["取引先に送付するテンプレート"]: "Mẫu gửi cho đối tác",
  ["本社用"]: "Dành cho trụ sở chính",
  ["社内保管用のテンプレート"]: "Mẫu lưu trữ nội bộ",
  ["開始日"]: "Ngày bắt đầu",
  ["終了日"]: "Ngày kết thúc",
  ["顧客別残注数サマリー"]: "Tóm tắt số lượng còn lại theo khách hàng",
  ["合計注数"]: "Tổng số lượng đặt",
  ["合計出荷数"]: "Tổng số lượng xuất",
  ["該当する残注数はありません"]: "Không có số lượng còn lại phù hợp",
  ["製品を選択してください"]: "Vui lòng chọn sản phẩm",
  ["ユーザー情報"]: "Thông tin người dùng",
  ["ユーザー名"]: "Tên người dùng",
  ["所属部署"]: "Phòng ban",
  ["例）Huong Nguyen"]: "Ví dụ) Huong Nguyen",
  ["例）経理部"]: "Ví dụ) Phòng kế toán",
  ["ヘッダーに表示するユーザー名・所属部署を設定します"]: "Thiết lập tên người dùng và phòng ban hiển thị trên header",
  ["文字サイズ"]: "Cỡ chữ",
  ["アプリ全体の文字サイズを設定します"]: "Thiết lập cỡ chữ cho toàn bộ ứng dụng",
  ["サイズ"]: "Kích thước",
  ["小"]: "Nhỏ",
  ["標準"]: "Tiêu chuẩn",
  ["大"]: "Lớn",
  ["換算レート設定"]: "Cài đặt tỷ giá quy đổi",
  ["1 USD あたりの金額を入力してください"]: "Nhập số tiền tương ứng với 1 USD",
  ["JPY → USD レート"]: "Tỷ giá JPY -> USD",
  ["VND → USD レート"]: "Tỷ giá VND -> USD",
  ["設定の取得に失敗しました。時間をおいて再度お試しください。"]: "Không thể tải cài đặt. Vui lòng thử lại sau.",
  ["ユーザー情報の取得に失敗しました。"]: "Không thể tải thông tin người dùng.",
  ["レートは0より大きい数値で入力してください。"]: "Vui lòng nhập tỷ giá là số lớn hơn 0.",
  ["保存に失敗しました。時間をおいて再度お試しください。"]: "Lưu thất bại. Vui lòng thử lại sau.",
  ["文字サイズの保存に失敗しました。時間をおいて再度お試しください。"]: "Không thể lưu cỡ chữ. Vui lòng thử lại sau.",
  ["ユーザー情報の保存に失敗しました。"]: "Không thể lưu thông tin người dùng.",
  ["発注管理の取得に失敗しました。"]: "Không thể tải dữ liệu quản lý đặt hàng.",
  ["受注管理の取得に失敗しました。"]: "Không thể tải dữ liệu quản lý đơn bán.",
  ["支払い管理の取得に失敗しました。"]: "Không thể tải dữ liệu quản lý thanh toán.",
  ["取引先・材料マスタの取得に失敗しました。"]: "Không thể tải danh mục khách hàng và vật liệu.",
  ["取引先・材料・製品マスタの取得に失敗しました。"]: "Không thể tải danh mục khách hàng, vật liệu và sản phẩm.",
  ["支払いマスタの取得に失敗しました。"]: "Không thể tải danh mục thanh toán.",
  ["操作に失敗しました。"]: "Thao tác thất bại.",
};

const baseJaToVi = Object.values(keyedMessages).reduce<Record<string, string>>((acc, message) => {
  acc[message.ja] = message.vi;
  return acc;
}, {});

const jaToViMessages = {
  ...baseJaToVi,
  ...phraseMessages,
};

const jaToViReplacements = Object.entries(jaToViMessages).sort((a, b) => b[0].length - a[0].length);

const dateLocaleMap: Record<AppLanguage, string> = {
  ja: "ja-JP",
  vi: "vi-VN",
};

export const translateText = (language: AppLanguage, text: string): string => {
  if (language === "ja" || !text) {
    return text;
  }

  let translated = text;
  translated = translated
    .replace(/他(\d+)件/g, "Khác $1 mục")
    .replace(/([A-Z]{3})\/件/g, "$1/mục")
    .replace(/製品\s*#\s*(\d+)/g, "Sản phẩm #$1");
  for (const [ja, vi] of jaToViReplacements) {
    if (translated.includes(ja)) {
      translated = translated.split(ja).join(vi);
    }
  }
  return translated;
};

const resolveInitialLanguage = (): AppLanguage => {
  if (typeof window === "undefined") {
    return "ja";
  }
  const stored = window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
  return stored && isAppLanguage(stored) ? stored : "ja";
};

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: TranslationKey) => string;
  tx: (text: string) => string;
  dateLocale: string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(resolveInitialLanguage);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, nextLanguage);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => {
      const message = keyedMessages[key];
      return message ? message[language] : "";
    },
    [language],
  );

  const tx = useCallback(
    (text: string) => {
      return translateText(language, text);
    },
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      tx,
      dateLocale: dateLocaleMap[language],
    }),
    [language, setLanguage, t, tx],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};

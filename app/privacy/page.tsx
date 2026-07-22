import Link from "next/link";

export const metadata = {
  title: "隱私與資料說明｜별빛韓語研究所",
};

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <Link href="/">← 返回韓語研究所</Link>
      <p className="eyebrow">PRIVACY & DATA</p>
      <h1>隱私與資料說明</h1>
      <section>
        <h2>免登入模式</h2>
        <p>
          學習進度、錯題、筆記、學習時間與閱讀設定會保存在目前瀏覽器。清除瀏覽器資料可能使紀錄消失，建議定期使用匯出功能備份。
        </p>
      </section>
      <section>
        <h2>選擇性登入與同步</h2>
        <p>
          使用者主動登入並按下同步後，網站會保存帳號識別、顯示名稱、角色、班級代碼與學習資料。使用者可以繼續只使用免登入模式。
        </p>
      </section>
      <section>
        <h2>班級與家庭檢視</h2>
        <p>
          班級名單顯示成員名稱與身分。學生的自習筆記不會公開給其他班級成員。教師與家長功能以提供學習支持為目的。
        </p>
      </section>
      <section>
        <h2>語音與麥克風</h2>
        <p>
          只有使用者主動按下「開始錄音」時，瀏覽器才會要求麥克風權限。錄音只暫存在目前頁面的瀏覽器記憶體，供本人立即回放與自評；不會上傳、同步、加入班級報告，離開或重新整理頁面後即會消失。
        </p>
      </section>
      <section>
        <h2>分析與第三方追蹤</h2>
        <p>
          網站不使用廣告追蹤器。手帳中的學習統計由裝置內的課程完成紀錄計算；只有使用者主動同步時才會送到雲端。
        </p>
      </section>
      <section>
        <h2>角色與著作權</h2>
        <p>
          網站角色與星空世界觀為原創虛構內容，非任何藝人、團體或娛樂公司的官方作品，也不使用官方照片、標誌或角色。
        </p>
      </section>
      <Link className="primary-button privacy-return" href="/">
        回到學習首頁
      </Link>
    </main>
  );
}

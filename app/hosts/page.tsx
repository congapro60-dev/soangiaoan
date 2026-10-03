import {chatGPTSignInPath, getChatGPTUser} from "../chatgpt-auth";
import HostDashboard from "./host-dashboard";
import "./hosts.css";

export const dynamic = "force-dynamic";

export default async function HostsPage() {
  const user = await getChatGPTUser();
  if (!user) {
    return (
      <main className="hosts-shell hosts-gated">
        <section className="hosts-card">
          <p className="hosts-kicker">Khu vực quản trị host</p>
          <h1>Đăng nhập để quản lý host</h1>
          <p>Danh tính được kiểm tra ở máy chủ. Không có phiên đăng nhập, không thể xem hoặc thay đổi quyền.</p>
          <a className="hosts-button hosts-button-primary" href={chatGPTSignInPath("/hosts")} target="_top">Sign in with ChatGPT</a>
        </section>
      </main>
    );
  }

  return <HostDashboard user={user} />;
}

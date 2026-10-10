import { requireChatGPTUser } from "../chatgpt-auth";
import LessonDashboard from "./lesson-dashboard";
import { AISettingsCard } from "../../components/AISettingsCard";
import "./lesson.css";

export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const user = await requireChatGPTUser("/lessons");

  return (
    <>
      <div className="ai-settings-slot"><AISettingsCard /></div>
      <LessonDashboard
        user={{
          userId: user.userId,
          displayName: user.displayName,
        }}
      />
    </>
  );
}

import { requireChatGPTUser } from "../chatgpt-auth";
import LessonDashboard from "./lesson-dashboard";
import "./lesson.css";

export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const user = await requireChatGPTUser("/lessons");

  return (
    <LessonDashboard
      user={{
        userId: user.userId,
        displayName: user.displayName,
      }}
    />
  );
}

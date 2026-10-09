import { requireChatGPTUser } from "../chatgpt-auth";
import ExamTeacher from "../../components/exam/ExamTeacher";
import "../lessons/lesson.css";
import "../exam/exam.css";

export const dynamic = "force-dynamic";

export default async function ExamsPage() {
  const user = await requireChatGPTUser("/exams");
  return <ExamTeacher user={{ displayName: user.displayName }} />;
}

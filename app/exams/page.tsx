import { requireChatGPTUser } from "../chatgpt-auth";
import ExamTeacher from "../../components/exam/ExamTeacher";
import { AISettingsCard } from "../../components/AISettingsCard";
import "../exam/exam.css";
import { listSemesterExams } from "../../lib/lesson/semester-content.js";

export const dynamic = "force-dynamic";

export default async function ExamsPage() {
  const user = await requireChatGPTUser("/exams");
  return (
    <>
      <div className="ai-settings-slot"><AISettingsCard /></div>
      <details className="lesson-shell" style={{marginBottom:16}}>
        <summary>Đề tham khảo HKI · Discover 10–12</summary>
        <p>Đề tự soạn theo PPCT 2026–2027, cần thầy cô duyệt. Tải đề rồi chọn “Tạo bài kiểm tra từ file đề”; đối chiếu đáp án, điểm và thời lượng trước khi mở phòng.</p>
        <ul>{listSemesterExams().map(exam=><li key={exam.id} style={{marginBottom:12}}>
          {exam.title} · {exam.minutes} phút · <a href={`/api/lesson-content?exam=${exam.id}&format=questions`}>Tải đề</a>{" · "}
          <a href={`/api/lesson-content?exam=${exam.id}&format=solutions`}>Đáp án dành cho GV</a>
        </li>)}</ul>
      </details>
      <ExamTeacher user={{ displayName: user.displayName }} />
    </>
  );
}

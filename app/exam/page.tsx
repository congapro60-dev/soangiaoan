import ExamPlay from "../../components/exam/ExamPlay";
import "../lessons/lesson.css";
import "./exam.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Phòng kiểm tra" };

export default function ExamPage() {
  return <ExamPlay />;
}

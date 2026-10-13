import {requireChatGPTUser} from "../chatgpt-auth";
import LearningRecords from "../../components/lesson/LearningRecords";
import "../hosts/hosts.css";
import "./records.css";

export const dynamic = "force-dynamic";

export default async function LearningRecordsPage() {
  await requireChatGPTUser("/learning-records");
  return <LearningRecords />;
}

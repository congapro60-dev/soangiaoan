import { requireChatGPTUser } from "../../chatgpt-auth";
import LessonCreationWizard from "../../../components/lesson/LessonCreationWizard";

export const dynamic = "force-dynamic";

export default async function NewLessonPage() {
  await requireChatGPTUser("/lessons/new");
  return <LessonCreationWizard />;
}

import { requireChatGPTUser } from "../../chatgpt-auth";
import LessonCreationWizard from "../../../components/lesson/LessonCreationWizard";

export const dynamic = "force-dynamic";

export default async function NewLessonPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requireChatGPTUser("/lessons/new");
  const params = await searchParams;
  const launch = Array.isArray(params?.launch) ? params.launch[0] : params?.launch;
  return <LessonCreationWizard initialLaunchMode={launch === "quick" ? "quick" : "normal"} />;
}

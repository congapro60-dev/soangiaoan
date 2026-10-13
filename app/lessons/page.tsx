import { requireChatGPTUser } from "../chatgpt-auth";
import LessonDashboard from "./lesson-dashboard";
import { AISettingsCard } from "../../components/AISettingsCard";
import "./lesson.css";
import {redirect} from "next/navigation";
import {parseLessonCreation} from "../../lib/lesson/creation-context.js";

export const dynamic = "force-dynamic";

export default async function LessonsPage({searchParams}: {searchParams?: Promise<Record<string,string|string[]|undefined>>}) {
  const user = await requireChatGPTUser("/lessons");
  const params=await searchParams||{};
  const query=new URLSearchParams();
  for(const [key,value] of Object.entries(params))for(const item of Array.isArray(value)?value:value===undefined?[]:[value])query.append(key,item);
  const creation=parseLessonCreation(query);
  if(query.has('session')&&[...query.keys()].some(key=>key!=='session'))redirect('/lessons?session='+encodeURIComponent(query.get('session')||''));
  if (!query.get('session') && !creation) redirect("/lessons/new");

  return (
    <>
      <div className="ai-settings-slot"><AISettingsCard /></div>
      <LessonDashboard
        creation={creation}
        user={{
          userId: user.userId,
          displayName: user.displayName,
        }}
      />
    </>
  );
}

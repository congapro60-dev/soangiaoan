import MDEditor from '@uiw/react-md-editor';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Sparkles, Loader2 } from 'lucide-react';
import { MD_EDITOR_A4_CSS } from '../../../utils/examPaperStyles';

interface Props {
  testResult: string;
  setTestResult: (v: string) => void;
  refineRequest: string;
  setRefineRequest: (v: string) => void;
  onRefine: () => void;
  isRefining: boolean;
}

/**
 * Split-pane exam editor: Markdown textarea (left) + A4-styled live preview (right).
 * Mirrors the LessonContentBoard pattern from CreatorTab.
 *
 * Layout note: This component is placed inside the flex-1 right panel of TestingTab.
 * flex-1 + min-h-0 allows MDEditor to fill all available vertical space without
 * overflowing (fixing the "frozen screen" bug where content below was unreachable).
 */
export const ExamContentBoard = ({
  testResult,
  setTestResult,
  refineRequest,
  setRefineRequest,
  onRefine,
  isRefining,
}: Props) => (
  <>
    {/* Inject scoped A4 CSS for the MDEditor preview pane */}
    <style>{MD_EDITOR_A4_CSS}</style>

    {/*
      exam-board: scope anchor for MD_EDITOR_A4_CSS rules
      data-color-mode="light": forces MDEditor into light theme
      flex-1 + min-h-0: lets this div fill remaining space inside the flex parent
      overflow-hidden: clips MDEditor chrome so only the editor scrolls internally
    */}
    <div
      className="flex-1 min-h-0 overflow-hidden exam-board flex flex-col"
      data-color-mode="light"
    >
      <MDEditor
        value={testResult}
        onChange={val => setTestResult(val ?? '')}
        preview="live"
        height="100%"
        previewOptions={{
          remarkPlugins: [remarkGfm, remarkMath],
          rehypePlugins: [rehypeRaw, rehypeKatex],
        }}
        style={{ borderRadius: 0, border: 'none', boxShadow: 'none', flex: 1, display: 'flex', flexDirection: 'column' }}
      />
    </div>

    {/* Refine prompt bar */}
    <div className="px-5 pt-4 pb-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2 flex-shrink-0">
      <textarea
        value={refineRequest}
        onChange={e => setRefineRequest(e.target.value)}
        placeholder="Ví dụ: Đổi câu 3 sang mức độ vận dụng cao, thêm 1 câu về đạo hàm..."
        disabled={isRefining}
        className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm resize-none min-h-[60px] disabled:opacity-50"
      />
      <button
        onClick={onRefine}
        disabled={isRefining || !refineRequest.trim()}
        className="px-5 py-3 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0 sm:self-stretch"
      >
        {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {isRefining ? 'Đang sửa...' : 'AI chỉnh sửa'}
      </button>
    </div>
  </>
);

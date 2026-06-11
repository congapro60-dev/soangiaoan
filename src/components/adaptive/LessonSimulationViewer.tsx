import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { AdaptiveSimulationSpec } from '../../lib/adaptive/simulationTypes';
import { AdaptiveSimulationBlock } from './AdaptiveSimulationBlock';
import { ExternalToolFrame } from './ExternalToolFrame';
import { SandboxedSimulationFrame } from './SandboxedSimulationFrame';
import { getToolsByIds } from '../../data/externalToolsRegistry';

type SimulationState = 'loading' | 'loaded' | 'not_found' | 'error';

interface LessonSimulationViewerProps {
  lessonId: string;
  unitId: string;
  unitTitle: string;
  inlineSpec?: AdaptiveSimulationSpec;
  externalToolIds?: string[];
}

interface LessonSimulationDocument {
  html?: unknown;
  spec?: unknown;
}

const isAdaptiveSimulationSpec = (value: unknown): value is AdaptiveSimulationSpec => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AdaptiveSimulationSpec>;
  return typeof candidate.id === 'string'
    && typeof candidate.title === 'string'
    && typeof candidate.kind === 'string'
    && typeof candidate.engine === 'string';
};

export const LessonSimulationViewer = ({ lessonId, unitId, unitTitle, inlineSpec, externalToolIds }: LessonSimulationViewerProps) => {
  const [status, setStatus] = useState<SimulationState>(inlineSpec || (externalToolIds && externalToolIds.length > 0) ? 'loaded' : 'loading');
  const [html, setHtml] = useState('');
  const [spec, setSpec] = useState<AdaptiveSimulationSpec | undefined>(inlineSpec);
  const [expanded, setExpanded] = useState(Boolean(inlineSpec) || Boolean(externalToolIds && externalToolIds.length > 0));

  const simulationId = useMemo(() => `${lessonId}_${unitId}`, [lessonId, unitId]);
  const simulationHtml = useMemo(() => html, [html]);
  const externalTools = useMemo(() => getToolsByIds(externalToolIds || []), [externalToolIds]);

  const loadSimulation = useCallback(async (options: { resetExpanded?: boolean } = {}) => {
    if (inlineSpec) {
      setSpec(inlineSpec);
      setStatus('loaded');
      if (options.resetExpanded !== false) setExpanded(true);
      return;
    }

    setStatus('loading');
    setHtml('');
    setSpec(undefined);
    if (options.resetExpanded !== false) setExpanded(false);

    try {
      const snapshot = await getDoc(doc(db, 'lessonSimulations', simulationId));

      if (!snapshot.exists()) {
        setStatus('not_found');
        return;
      }

      const data = snapshot.data() as LessonSimulationDocument;
      const storedSpec = isAdaptiveSimulationSpec(data.spec) ? data.spec : undefined;
      const storedHtml = typeof data.html === 'string' ? data.html.trim() : '';

      if (!storedSpec && !storedHtml) {
        setStatus('not_found');
        return;
      }

      setHtml(storedHtml);
      setSpec(storedSpec);
      setStatus('loaded');
    } catch (error) {
      console.error('Failed to load lesson simulation:', error);
      setStatus('error');
    }
  }, [inlineSpec, simulationId]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      await loadSimulation();
      if (!isMounted) return;
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [loadSimulation]);

  if (status === 'loading') {
    return (
      <div className="mt-5 rounded-3xl border border-violet-100 bg-violet-50/60 p-5">
        <div className="flex h-[200px] animate-pulse items-center justify-center rounded-2xl border border-violet-100 bg-white/70 text-sm font-black text-violet-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Đang kiểm tra mô phỏng...
        </div>
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <p className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-xs font-bold text-violet-500">
        Mảnh kiến thức này chưa có mô phỏng tương tác.
      </p>
    );
  }

  if (status === 'error') {
    return (
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700 sm:flex-row sm:items-center sm:justify-between">
        <span>Không tải được mô phỏng lúc này. Vui lòng thử lại.</span>
        <button
          type="button"
          onClick={() => void loadSimulation({ resetExpanded: false })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-800 transition hover:bg-amber-200"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <section className="mt-5 rounded-3xl border border-violet-100 bg-violet-50/60 p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">🔷 Nhìn thấy bài học trước khi làm</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Mở mô phỏng để quan sát ý tưởng chính của mảnh học này.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-100 transition hover:bg-violet-700"
        >
          {expanded ? 'Thu gọn mô phỏng' : 'Mở mô phỏng'}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 overflow-hidden rounded-3xl border border-violet-100 bg-white">
          <div className="flex items-center gap-2 border-b border-violet-100 bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-violet-500">
            <BookOpen className="h-4 w-4" />
            {spec ? 'Mô phỏng nội bộ có cấu trúc' : externalTools.length > 0 ? 'Công cụ tương tác mở rộng' : 'Mô phỏng HTML an toàn'}
          </div>
          <div className="p-4">
            {spec ? (
              <AdaptiveSimulationBlock spec={spec} />
            ) : externalTools.length > 0 ? (
              <div className="flex flex-col gap-4">
                {externalTools.map(tool => (
                  <ExternalToolFrame key={tool.toolId} tool={tool} studentId="student" />
                ))}
              </div>
            ) : simulationHtml ? (
              <SandboxedSimulationFrame
                html={simulationHtml}
                title={`Mô phỏng tương tác: ${unitTitle || 'Bài học'}`}
                style={{ maxHeight: '600px', height: '600px' }}
              />
            ) : (
              <div className="text-sm font-semibold text-slate-500">Không có mô phỏng cho mảnh học này.</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

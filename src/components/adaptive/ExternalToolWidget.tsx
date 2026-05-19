import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, ExternalLink, Loader2, X } from 'lucide-react';
import type { ExternalTool } from '../../data/externalTools';
import { cn } from '../../lib/utils';

const IFRAME_LOAD_TIMEOUT_MS = 12000;

type IframeStatus = 'loading' | 'loaded' | 'failed';

interface ExternalToolWidgetProps {
  tools: ExternalTool[];
}

interface ToolCardProps {
  tool: ExternalTool;
}

const SourceBadge = ({ tool }: ToolCardProps) => (
  <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
    <span>{tool.source === 'congcutoanhoc' ? 'Công cụ Toán học' : 'Giáo viên AI'}</span>
    <span>•</span>
    <span>Lớp {tool.gradeLevel}</span>
    {tool.urlStatus === 'inferred' && (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
        Chưa xác minh URL
      </span>
    )}
  </div>
);

const ToolAttribution = ({ tool }: ToolCardProps) => (
  <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-500">
    {tool.source === 'congcutoanhoc' ? (
      <>
        Công cụ từ{' '}
        <a href="https://congcutoanhoc.com" target="_blank" rel="noreferrer" className="font-black text-blue-600 hover:text-blue-700">
          congcutoanhoc.com
        </a>{' '}
        — tác giả Nguyễn Cung Hoàng Nam. Không sao chép mã nguồn.
      </>
    ) : (
      <>Công cụ từ {tool.author}. Không sao chép mã nguồn.</>
    )}
    <span className="mt-1 block">Giấy phép/ghi chú: {tool.license}{tool.notes ? ` — ${tool.notes}` : ''}</span>
  </div>
);

const LinkToolCard = ({ tool }: ToolCardProps) => (
  <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
    <SourceBadge tool={tool} />
    <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h4 className="text-lg font-black text-slate-800">{tool.name}</h4>
        <p className="mt-1 text-sm font-semibold text-slate-500">Công cụ này không nhúng trực tiếp được, em mở ở tab mới để sử dụng.</p>
      </div>
      <a
        href={tool.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
      >
        Mở trong tab mới
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
    <ToolAttribution tool={tool} />
  </article>
);

const IframeToolCard = ({ tool }: ToolCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<IframeStatus>('loading');
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!expanded) return;

    setStatus('loading');
    timeoutRef.current = window.setTimeout(() => {
      setStatus(current => (current === 'loading' ? 'failed' : current));
    }, IFRAME_LOAD_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [expanded, tool.url]);

  const handleLoad = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus('loaded');
  };

  const handleError = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus('failed');
  };

  return (
    <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <SourceBadge tool={tool} />
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h4 className="text-lg font-black text-slate-800">{tool.name}</h4>
          <p className="mt-1 text-sm font-semibold text-slate-500">Thử thao tác trực tiếp trong bài học; nếu không tải được, mở công cụ ở tab mới.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExpanded(prev => !prev)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700"
          >
            {expanded ? 'Thu gọn' : 'Mở trong bài học'}
            {expanded ? <X className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
          </button>
          <a
            href={tool.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
          >
            Mở tab mới
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
            <div className="text-xs font-black uppercase tracking-wide text-slate-400">Khung công cụ nhúng</div>
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black',
                status === 'loaded' && 'bg-green-50 text-green-700',
                status === 'loading' && 'bg-blue-50 text-blue-700',
                status === 'failed' && 'bg-amber-50 text-amber-700',
              )}
            >
              {status === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {status === 'failed' && <AlertTriangle className="h-3.5 w-3.5" />}
              {status === 'loaded' ? 'Đã tải' : status === 'loading' ? 'Đang tải' : 'Không nhúng được'}
            </div>
          </div>

          {status === 'failed' ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-sm font-black text-slate-800">Công cụ có thể chặn nhúng trong iframe.</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">Em hãy mở công cụ trong tab mới để tiếp tục học.</p>
              </div>
              <a
                href={tool.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
              >
                Mở trong tab mới
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <iframe
              src={tool.url}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms"
              referrerPolicy="no-referrer"
              onLoad={handleLoad}
              onError={handleError}
              title={tool.name}
              className="block w-full"
              style={{ height: '480px', border: 'none' }}
            />
          )}
        </div>
      )}

      <ToolAttribution tool={tool} />
    </article>
  );
};

export const ExternalToolWidget = ({ tools }: ExternalToolWidgetProps) => {
  if (tools.length === 0) return null;

  return (
    <section className="rounded-3xl border border-blue-100 bg-blue-50/50 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-800">Công cụ Toán tương tác</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Dùng các công cụ ngoài để quan sát quy luật, thử số liệu và tự kiểm chứng kết quả.</p>
        </div>
      </div>
      <div className="space-y-4">
        {tools.map(tool => (
          tool.embedMode === 'link' ? <LinkToolCard key={tool.id} tool={tool} /> : <IframeToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  );
};

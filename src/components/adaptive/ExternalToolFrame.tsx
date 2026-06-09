import { ExternalLink, AlertTriangle } from 'lucide-react';
import type { ExternalTool } from '../../types';

interface ExternalToolFrameProps {
  tool?: ExternalTool;
  studentId?: string;
}

export const ExternalToolFrame = ({ tool }: ExternalToolFrameProps) => {
  if (!tool || tool.status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center">
        <AlertTriangle className="h-8 w-8 text-slate-400 mb-3" />
        <h4 className="text-sm font-bold text-slate-700">Công cụ không khả dụng</h4>
        <p className="mt-1 text-xs text-slate-500">
          Công cụ này đã bị vô hiệu hóa hoặc không tồn tại.
        </p>
      </div>
    );
  }

  // Cấp quyền allow-same-origin ĐỘC QUYỀN cho GeoGebra để có thể chạy HTML5 applet
  const isGeoGebra = tool.sandboxPreset === 'geogebra' || tool.sourceDomain === 'geogebra.org';
  const sandboxRules = isGeoGebra
    ? "allow-scripts allow-forms allow-pointer-lock allow-same-origin"
    : "allow-scripts allow-forms allow-pointer-lock";

  let heightClass = 'h-[600px]'; // standard
  if (tool.heightPreset === 'compact') heightClass = 'h-[420px]';
  if (tool.heightPreset === 'large') heightClass = 'h-[760px]';

  return (
    <div className="flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-4">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
        <span className="text-xs font-bold text-slate-600">{tool.title}</span>
        <a 
          href={tool.url} 
          target="_blank" 
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700"
        >
          Mở tab mới
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <iframe
        src={tool.url}
        sandbox={sandboxRules}
        referrerPolicy="no-referrer"
        loading="lazy"
        title={tool.title}
        className={`w-full ${heightClass} border-none`}
      />
    </div>
  );
};

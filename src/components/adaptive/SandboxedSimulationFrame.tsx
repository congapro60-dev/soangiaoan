import { useMemo } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { injectStrictCSP, validateSimulationHtml } from '../../lib/adaptive/simulationSecurity';

interface SandboxedSimulationFrameProps {
  html: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const SandboxedSimulationFrame = ({ html, title = 'Interactive Simulation', className, style }: SandboxedSimulationFrameProps) => {
  const { isSafe, error, safeHtml } = useMemo(() => {
    if (!html) return { isSafe: false, error: 'No HTML content provided.', safeHtml: '' };

    const validation = validateSimulationHtml(html);
    if (!validation.isValid) {
      return { isSafe: false, error: validation.error, safeHtml: '' };
    }

    const htmlWithCsp = injectStrictCSP(html);
    return { isSafe: true, safeHtml: htmlWithCsp };
  }, [html]);

  if (!isSafe) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-red-200 bg-red-50 rounded-2xl ${className || ''}`} style={style}>
        <div className="p-3 mb-3 bg-red-100 text-red-600 rounded-xl">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-black text-slate-800">Mô phỏng bị chặn vì lý do bảo mật</h3>
        <p className="mt-2 text-xs font-semibold text-slate-600 max-w-sm">
          {error || 'HTML chứa mã không hợp lệ hoặc rủi ro bảo mật.'}
        </p>
      </div>
    );
  }

  return (
    <div className="relative group w-full h-full flex flex-col">
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-100/90 backdrop-blur-sm text-emerald-700 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm pointer-events-none">
        <ShieldCheck className="w-3 h-3" /> Sandbox Active
      </div>
      <iframe
        srcDoc={safeHtml}
        sandbox="allow-scripts" // NO allow-same-origin
        referrerPolicy="no-referrer"
        loading="lazy"
        title={title}
        className={`w-full block bg-white ${className || ''}`}
        style={{ border: 'none', minHeight: '300px', ...style }}
      />
    </div>
  );
};

import React, { Component, ErrorInfo } from 'react';
import type { AdaptiveSimulationSpec } from '../../lib/adaptive/simulationTypes';
import { Geometry2DSimulation } from './Geometry2DSimulation';
import { Geometry3DSimulation } from './Geometry3DSimulation';

class SimulationErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Simulation render error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-center text-red-600">
          <p className="font-bold">Không thể hiển thị mô phỏng do lỗi dữ liệu.</p>
          <p className="text-sm mt-2 opacity-80">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const normalizeSpec = (spec: AdaptiveSimulationSpec): AdaptiveSimulationSpec => ({
  ...spec,
  questions: Array.isArray(spec.questions) ? spec.questions : [],
  interactions: Array.isArray(spec.interactions) ? spec.interactions : [],
  notebookEntries: Array.isArray(spec.notebookEntries) ? spec.notebookEntries : [],
});

interface AdaptiveSimulationBlockProps {
  spec?: AdaptiveSimulationSpec;
}

const AdaptiveSimulationBlockContent = ({ spec: rawSpec }: AdaptiveSimulationBlockProps) => {
  if (!rawSpec) return null;
  const spec = normalizeSpec(rawSpec);
  if (!spec) return null;

  if (spec.engine === 'html' && spec.html?.srcDoc) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <p className="text-xs font-black uppercase tracking-wide text-violet-500">Mô phỏng HTML/Canvas an toàn</p>
          <h3 className="mt-1 text-lg font-black text-slate-900">{spec.title}</h3>
          <p className="mt-2 text-sm font-semibold text-slate-600">{spec.description}</p>
        </div>
        <iframe
          srcDoc={spec.html.srcDoc}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          loading="lazy"
          title={`Mô phỏng tương tác: ${spec.title}`}
          className="block w-full rounded-2xl border border-slate-100 bg-white"
          style={{ height: `${spec.html.height || 600}px`, maxHeight: '760px' }}
        />
        <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
          Mã mô phỏng chạy trong iframe sandbox, tách biệt với giao diện bài học chính.
        </p>
      </div>
    );
  }

  if (spec.kind === 'geometry3d' && spec.engine === 'threejs') {
    return <Geometry3DSimulation spec={spec} />;
  }

  if (spec.kind === 'geometry2d' && spec.engine === 'svg') {
    return <Geometry2DSimulation spec={spec} />;
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">Mô phỏng tương tác</p>
      <h3 className="mt-1 text-lg font-black text-slate-900">{spec.title}</h3>
      <p className="mt-2 text-sm font-semibold text-slate-600">{spec.description}</p>
      <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-700">
        Engine “{spec.engine}” cho loại “{spec.kind}” chưa có renderer nội bộ. Có thể gắn GeoGebra/Desmos hoặc tạo renderer riêng ở bước tiếp theo.
      </div>
    </div>
  );
};

export const AdaptiveSimulationBlock = (props: AdaptiveSimulationBlockProps) => (
  <SimulationErrorBoundary>
    <AdaptiveSimulationBlockContent {...props} />
  </SimulationErrorBoundary>
);

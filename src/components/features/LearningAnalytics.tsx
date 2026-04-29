import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { GradingSession } from '../../types';
import { BarChart3, TrendingUp, Users, Award } from 'lucide-react';

interface Props {
  sessions: GradingSession[];
}

export const LearningAnalytics = ({ sessions }: Props) => {
  const allDone = sessions.flatMap(s => s.results.filter(r => r.status === 'completed'));

  if (allDone.length === 0) return null;

  // Score distribution
  const dist = [
    { label: 'Giỏi (≥8)', count: allDone.filter(r => r.score >= 8).length, color: '#10b981' },
    { label: 'Khá (6.5–8)', count: allDone.filter(r => r.score >= 6.5 && r.score < 8).length, color: '#3b82f6' },
    { label: 'TB (5–6.5)', count: allDone.filter(r => r.score >= 5 && r.score < 6.5).length, color: '#f59e0b' },
    { label: 'Yếu (<5)', count: allDone.filter(r => r.score < 5).length, color: '#ef4444' },
  ];

  // Trend: avg per session, sorted by date, last 10
  const trend = sessions
    .map(s => {
      const done = s.results.filter(r => r.status === 'completed');
      if (done.length === 0) return null;
      const avg = done.reduce((a, r) => a + r.score, 0) / done.length;
      return { name: s.title.length > 12 ? s.title.slice(0, 12) + '…' : s.title, avg: +avg.toFixed(1) };
    })
    .filter(Boolean)
    .slice(-10) as { name: string; avg: number }[];

  const overallAvg = (allDone.reduce((a, r) => a + r.score, 0) / allDone.length).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-violet-600" />
        <h3 className="text-xl font-bold text-slate-800">Phân tích học tập</h3>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: BarChart3, label: 'Phiên chấm', value: sessions.length, color: 'text-violet-600', bg: 'bg-violet-50' },
          { icon: Users, label: 'Bài đã chấm', value: allDone.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Award, label: 'Điểm TB chung', value: `${overallAvg}đ`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-3xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm">
            <div className={`w-10 h-10 rounded-2xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score distribution bar chart */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-700 mb-4">Phổ điểm (tất cả bài)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dist} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                formatter={(v) => [`${v} học sinh`, 'Số lượng']}
                contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {dist.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg score trend line chart */}
        {trend.length >= 2 && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <p className="text-sm font-bold text-slate-700">Điểm TB qua các bài kiểm tra</p>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(v) => [`${v}đ`, 'Điểm TB']}
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }}
                />
                <Line
                  type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2.5}
                  dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

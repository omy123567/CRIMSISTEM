import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { BarChart3, Download, X } from 'lucide-react';

export interface StatKpiItem {
  label: string;
  value: string | number;
  detail?: string;
  tone?: 'navy' | 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
}

export interface StatChartDatum {
  name: string;
  value: number;
  secondary?: number;
}

export interface StatChartConfig {
  id: string;
  title: string;
  subtitle?: string;
  type: 'bar' | 'horizontal-bar' | 'donut' | 'area';
  data: StatChartDatum[];
  valueLabel?: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface ModuleStatsPanelProps {
  title: string;
  subtitle?: string;
  kpis: StatKpiItem[];
  charts: StatChartConfig[];
  onExportPdf?: () => void;
  exportPdfLabel?: string;
  onClose?: () => void;
}

const PALETTE = [
  '#11264d',
  '#1d4ed8',
  '#0284c7',
  '#0f766e',
  '#d97706',
  '#dc2626',
  '#6d28d9',
  '#475569',
];

const TONE_VALUE_CLASS: Record<NonNullable<StatKpiItem['tone']>, string> = {
  navy: 'text-slate-900',
  blue: 'text-blue-900',
  emerald: 'text-emerald-700',
  amber: 'text-amber-700',
  rose: 'text-rose-700',
  slate: 'text-slate-800',
};

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#0f172a',
  borderColor: '#334155',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: '11px',
  padding: '6px 10px',
};

export const ModuleStatsPanel: React.FC<ModuleStatsPanelProps> = ({
  title,
  subtitle,
  kpis,
  charts,
  onExportPdf,
  exportPdfLabel = 'Exportar Reporte Estadístico (PDF)',
  onClose,
}) => {
  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-in fade-in duration-150">
      {/* Header limpio con acción de exportación y cierre opcional */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight truncate">{title}</h2>
            {subtitle && (
              <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-950 text-white text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportPdfLabel}</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Ocultar estadísticas"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tira de KPIs tabular sin bordes anidados */}
      {kpis.length > 0 && (
        <div
          className={`grid grid-cols-2 ${
            kpis.length >= 4 ? 'lg:grid-cols-4' : kpis.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
          } divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-b border-slate-200`}
        >
          {kpis.map((kpi, idx) => (
            <div key={`${kpi.label}-${idx}`} className="px-4 py-3.5 bg-white">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">
                {kpi.label}
              </div>
              <div
                className={`mt-1 text-2xl font-bold font-mono tabular-nums tracking-tight ${
                  TONE_VALUE_CLASS[kpi.tone || 'navy']
                }`}
              >
                {kpi.value}
              </div>
              {kpi.detail && (
                <div className="mt-0.5 text-[11px] text-slate-500 truncate">{kpi.detail}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Grilla de gráficos Recharts */}
      {charts.length > 0 && (
        <div
          className={`grid grid-cols-1 ${
            charts.length > 1 ? 'lg:grid-cols-2' : ''
          } divide-y lg:divide-y-0 lg:divide-x divide-slate-200`}
        >
          {charts.map((chart) => {
            const totalPie = chart.data.reduce((acc, d) => acc + (d.value || 0), 0);
            const hasValues = chart.data.some((d) => (d.value || 0) > 0 || (d.secondary || 0) > 0);

            return (
              <div key={chart.id} className="p-4 sm:p-5 bg-white">
                <div className="flex items-baseline justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      {chart.title}
                    </h3>
                    {chart.subtitle && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{chart.subtitle}</p>
                    )}
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                    {chart.data.length} categ.
                  </span>
                </div>

                {!hasValues ? (
                  <div className="h-56 flex items-center justify-center rounded-lg bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400">
                    Sin datos suficientes para graficar en la vista actual
                  </div>
                ) : chart.type === 'donut' ? (
                  <div className="h-56 flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-full sm:w-1/2 h-48 sm:h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chart.data.filter((d) => d.value > 0)}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={44}
                            outerRadius={72}
                            paddingAngle={2}
                          >
                            {chart.data
                              .filter((d) => d.value > 0)
                              .map((_, i) => (
                                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                              ))}
                          </Pie>
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full sm:w-1/2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {chart.data
                        .filter((d) => d.value > 0)
                        .map((item, idx) => {
                          const pct = totalPie > 0 ? Math.round((item.value / totalPie) * 100) : 0;
                          return (
                            <div
                              key={item.name}
                              className="flex items-center justify-between gap-2 text-xs py-0.5"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                                  style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                                />
                                <span className="truncate text-slate-700" title={item.name}>
                                  {item.name}
                                </span>
                              </div>
                              <span className="font-mono tabular-nums font-bold text-slate-900 shrink-0">
                                {item.value}{' '}
                                <span className="text-[10px] font-normal text-slate-400">
                                  ({pct}%)
                                </span>
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : chart.type === 'horizontal-bar' ? (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chart.data.slice(0, 8)}
                        layout="vertical"
                        margin={{ top: 4, right: 18, left: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={120}
                          tick={{ fontSize: 10, fill: '#334155' }}
                        />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar
                          dataKey="value"
                          name={chart.valueLabel || 'Cantidad'}
                          fill={chart.primaryColor || '#1e3a8a'}
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : chart.type === 'area' ? (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chart.data}
                        margin={{ top: 8, right: 12, left: -16, bottom: 4 }}
                      >
                        <defs>
                          <linearGradient id={`grad-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chart.primaryColor || '#1d4ed8'} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={chart.primaryColor || '#1d4ed8'} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        {chart.secondaryLabel && <Legend wrapperStyle={{ fontSize: '11px' }} />}
                        <Area
                          type="monotone"
                          dataKey="value"
                          name={chart.valueLabel || 'Registros'}
                          stroke={chart.primaryColor || '#1d4ed8'}
                          strokeWidth={2}
                          fill={`url(#grad-${chart.id})`}
                        />
                        {chart.secondaryLabel && (
                          <Area
                            type="monotone"
                            dataKey="secondary"
                            name={chart.secondaryLabel}
                            stroke={chart.secondaryColor || '#0f766e'}
                            strokeWidth={2}
                            fillOpacity={0.08}
                            fill={chart.secondaryColor || '#0f766e'}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chart.data.slice(0, 10)}
                        margin={{ top: 8, right: 10, left: -16, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#475569' }}
                          angle={chart.data.length > 5 ? -16 : 0}
                          textAnchor={chart.data.length > 5 ? 'end' : 'middle'}
                          interval={0}
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        {chart.secondaryLabel && <Legend wrapperStyle={{ fontSize: '11px' }} />}
                        <Bar
                          dataKey="value"
                          name={chart.valueLabel || 'Cantidad'}
                          fill={chart.primaryColor || '#11264d'}
                          radius={[4, 4, 0, 0]}
                        />
                        {chart.secondaryLabel && (
                          <Bar
                            dataKey="secondary"
                            name={chart.secondaryLabel}
                            fill={chart.secondaryColor || '#0284c7'}
                            radius={[4, 4, 0, 0]}
                          />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

import React from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  Bar,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export interface SalesOverviewChartProps {
  data: { date: string; revenue: number; orders: number }[];
  maxRevenue: number;
  maxOrders: number;
  symbol: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  symbol?: string;
}

function CustomSalesTooltip({ active, payload, label, symbol = '₹' }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const rev = payload.find(p => p.dataKey === 'revenue')?.value ?? 0;
    const ord = payload.find(p => p.dataKey === 'orders')?.value ?? 0;

    return (
      <div className="bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700/60 text-xs select-none">
        <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{label}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-1 rounded-full bg-blue-500 inline-block" /> Revenue:
            </span>
            <span className="font-mono font-bold text-blue-300">
              {symbol}{Number(rev).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-xs bg-[#b7c4ff] inline-block" /> Orders:
            </span>
            <span className="font-mono font-bold text-slate-200">
              {ord} {ord === 1 ? 'order' : 'orders'}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function SalesOverviewChart({ data, maxRevenue, maxOrders, symbol }: SalesOverviewChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260} minWidth={100} minHeight={240}>
      <ComposedChart data={data} margin={{ top: 16, right: 12, left: -16, bottom: 4 }}>
        <defs>
          <linearGradient id="colorRevenueComposite" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0052FF" stopOpacity={0.16} />
            <stop offset="100%" stopColor="#0052FF" stopOpacity={0.0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.7} />

        <XAxis
          dataKey="date"
          axisLine={{ stroke: '#CBD5E1', strokeWidth: 1 }}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
          dy={8}
        />

        <YAxis
          yAxisId="left"
          domain={[0, Math.max(100, maxRevenue)]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
          tickFormatter={(val) => (val >= 1000 ? `${symbol}${Math.round(val / 1000)}k` : `${symbol}${val}`)}
        />

        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, Math.max(5, maxOrders)]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          tickFormatter={(val) => `${val} ord`}
        />

        <Tooltip content={<CustomSalesTooltip symbol={symbol} />} />

        {/* Volume Bars */}
        <Bar
          yAxisId="right"
          dataKey="orders"
          fill="#D9DFF4"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          animationDuration={600}
        />

        {/* Revenue Spline Area */}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          stroke="#003EC7"
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: '#FFFFFF', strokeWidth: 2, stroke: '#003EC7' }}
          activeDot={{ r: 5.5, fill: '#E8590C', strokeWidth: 2.5, stroke: '#FFFFFF' }}
          fillOpacity={1}
          fill="url(#colorRevenueComposite)"
          animationDuration={800}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export interface OrderStatusPieChartProps {
  donutData: { name: string; value: number; color: string }[];
  totalOrders: number;
}

export function OrderStatusPieChart({ donutData }: OrderStatusPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={160} minWidth={100} minHeight={160}>
      <PieChart>
        <Pie
          isAnimationActive={false}
          data={donutData}
          innerRadius={48}
          outerRadius={68}
          paddingAngle={donutData.some(d => d.value > 0) ? 3 : 0}
          dataKey="value"
          stroke="#FFFFFF"
          strokeWidth={2}
        >
          {donutData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(val: any, name: any) => [`${val} orders`, name]}
          contentStyle={{
            borderRadius: 12,
            background: 'rgba(15, 23, 42, 0.95)',
            border: 'none',
            color: '#FFFFFF',
            fontSize: 12,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default {
  SalesOverviewChart,
  OrderStatusPieChart,
};

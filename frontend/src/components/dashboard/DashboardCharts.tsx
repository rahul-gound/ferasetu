import React from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
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
      <div className="bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700/60 text-xs">
        <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Revenue:
            </span>
            <span className="font-mono font-bold text-white">
              {symbol}{Number(rev).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Orders:
            </span>
            <span className="font-mono font-bold text-emerald-300">
              {ord}
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
      <AreaChart data={data} margin={{ top: 12, right: 10, left: -20, bottom: 4 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />

        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
          dy={8}
        />

        <YAxis
          yAxisId="left"
          domain={[0, maxRevenue]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
          tickFormatter={(val) => (val >= 1000 ? `${symbol}${Math.round(val / 1000)}k` : `${symbol}${val}`)}
        />

        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, maxOrders]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94A3B8' }}
        />

        <Tooltip content={<CustomSalesTooltip symbol={symbol} />} />

        <Area
          isAnimationActive={false}
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          stroke="#2563EB"
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: '#2563EB', strokeWidth: 2, stroke: '#FFFFFF' }}
          activeDot={{ r: 5, fill: '#2563EB', strokeWidth: 2, stroke: '#FFFFFF' }}
          fillOpacity={1}
          fill="url(#colorRevenue)"
        />

        <Area
          isAnimationActive={false}
          yAxisId="right"
          type="monotone"
          dataKey="orders"
          stroke="#10B981"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={{ r: 3, fill: '#10B981', strokeWidth: 1.5, stroke: '#FFFFFF' }}
          activeDot={{ r: 4.5, fill: '#10B981', strokeWidth: 2, stroke: '#FFFFFF' }}
          fillOpacity={1}
          fill="url(#colorOrders)"
        />
      </AreaChart>
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

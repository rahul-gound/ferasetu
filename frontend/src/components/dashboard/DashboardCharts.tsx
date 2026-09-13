import React from 'react';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
  PieChart, Pie, Cell,
} from 'recharts';

export interface SalesOverviewChartProps {
  data: { date: string; revenue: number; orders: number }[];
  maxRevenue: number;
  maxOrders: number;
  symbol: string;
}

export function SalesOverviewChart({ data, maxRevenue, maxOrders, symbol }: SalesOverviewChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0052FF" stopOpacity={0.15}/>
            <stop offset="95%" stopColor="#0052FF" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} dy={6} />
        <YAxis
          yAxisId="left"
          domain={[0, maxRevenue]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          tickFormatter={(val) => val >= 1000 ? `${symbol}${Math.round(val / 1000)}K` : `${symbol}${val}`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, maxOrders]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94A3B8' }}
        />
        <Tooltip 
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
          formatter={(value: any, name: any) => [
            name === 'revenue' ? `${symbol}${Number(value).toLocaleString()}` : value,
            name === 'revenue' ? 'Revenue' : 'Orders'
          ]}
        />
        <Area
          isAnimationActive={false}
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          stroke="#0052FF"
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: '#0052FF', strokeWidth: 0 }}
          fillOpacity={1}
          fill="url(#colorRevenue)"
        />
        <Area
          isAnimationActive={false}
          yAxisId="right"
          type="monotone"
          dataKey="orders"
          stroke="#93C5FD"
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: '#93C5FD', strokeWidth: 0 }}
          fill="none"
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
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          isAnimationActive={false}
          data={donutData}
          innerRadius={50}
          outerRadius={68}
          paddingAngle={donutData.some(d => d.value > 0) ? 3 : 0}
          dataKey="value"
          stroke="none"
        >
          {donutData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default {
  SalesOverviewChart,
  OrderStatusPieChart,
};

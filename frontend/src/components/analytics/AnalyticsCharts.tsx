import React from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

export interface RevenueChartProps {
  data: { date: string; revenue: number; orders: number }[];
}

export function RevenueAreaChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0052FF" stopOpacity={0.15}/>
            <stop offset="95%" stopColor="#0052FF" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        <XAxis 
          dataKey="date" 
          axisLine={false} tickLine={false} 
          tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 600}} 
          dy={10} 
        />
        <YAxis 
          axisLine={false} tickLine={false} 
          tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 600}} 
          tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`}
        />
        <Tooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 700 }}
          formatter={(v: any) => [`₹${v.toLocaleString()}`, 'Revenue']}
        />
        <Area 
          isAnimationActive={false}
          type="monotone" 
          dataKey="revenue" 
          stroke="#0052FF" 
          strokeWidth={3} 
          fillOpacity={1} 
          fill="url(#colorRev)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export interface OrdersBarChartProps {
  data: { date: string; revenue: number; orders: number }[];
}

export function OrdersBarChart({ data }: OrdersBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} />
        <Tooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
          cursor={{fill: '#F8FAFC'}}
        />
        <Bar isAnimationActive={false} dataKey="orders" fill="#0052FF" radius={[4, 4, 0, 0]} barSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface CategoryPieChartProps {
  data: { name: string; value: number; revenue: number }[];
  colors: string[];
}

export function CategoryPieChart({ data, colors }: CategoryPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
      <PieChart>
        <Pie
          isAnimationActive={false}
          data={data}
          cx="50%" cy="45%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={5}
          dataKey="revenue"
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
          formatter={(v: any) => [`₹${v.toLocaleString()}`, 'Revenue']}
        />
        <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default {
  RevenueAreaChart,
  OrdersBarChart,
  CategoryPieChart,
};

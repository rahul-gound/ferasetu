export interface PlatformStats {
  totalUsers: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
  activeUsers: number;
  citiesCount: number;
  languagesCount: number;
  uptime: string;
}

const API_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function getPlatformStats(): Promise<PlatformStats> {
  const fallback: PlatformStats = {
    totalUsers: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalRevenue: 0,
    activeUsers: 0,
    citiesCount: 0,
    languagesCount: 22,
    uptime: '99.9',
  };

  try {
    const res = await fetch(`${API_URL}/api/auth/public/platform-stats`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    return data;
  } catch {
    return fallback;
  }
}

export function formatNumber(num: number): string {
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr+`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L+`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K+`;
  return num.toString();
}

export function formatCurrency(amount: number): string {
  return `₹${formatNumber(amount)}`;
}

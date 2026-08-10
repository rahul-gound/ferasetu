import api from '../services/api';

export interface ExportedData {
  exportDate: string;
  merchantName: string;
  merchantEmail: string;
  products: any[];
  orders: any[];
}

/**
 * Fetches all products and orders for the authenticated merchant
 * and triggers a browser download of the structured JSON data.
 */
export async function exportMerchantData(merchantName: string, merchantEmail: string): Promise<void> {
  try {
    // 1. Fetch products
    const productsRes = await api.get('/products');
    const products = productsRes.data?.products || [];

    // 2. Fetch orders
    const ordersRes = await api.get('/orders');
    const orders = ordersRes.data?.orders || [];

    // 3. Construct export payload
    const payload: ExportedData = {
      exportDate: new Date().toISOString(),
      merchantName,
      merchantEmail,
      products,
      orders,
    };

    // 4. Create and trigger download
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const formattedDate = new Date().toISOString().split('T')[0];
    link.download = `ferasetu_export_${formattedDate}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err: any) {
    console.error('Failed to export merchant data:', err);
    throw new Error(err?.message || 'Failed to generate export file. Please try again.');
  }
}

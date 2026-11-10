import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import OperationsDashboard, { RealOrder } from '../components/dashboard/OperationsDashboard';
import PaymentSetupModal from '../components/dashboard/PaymentSetupModal';
import CounterQrModal from '../components/dashboard/CounterQrModal';
import AddOrderModal from '../components/orders/AddOrderModal';
import InvoiceDocumentModal, { InvoiceModalOrder } from '../components/orders/InvoiceDocumentModal';
import { getStorefrontUrl } from '../utils/canonicalHostname';

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showQrModal, setShowQrModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<InvoiceModalOrder | null>(null);

  const storeUrl = useMemo(() => getStorefrontUrl(user), [user]);
  const currentUpiId = user?.upi_id || 'merchant@okaxis';

  const firstName = user?.name
    ? user.name.split(' ')[0]
    : user?.business_name || 'Merchant';

  // ── REAL DATA QUERIES (NO FAKE / MOCK DATA) ──────────────────────────────
  const { data: rawOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        const res = await api.get('/orders');
        return res.data?.orders || res.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: rawProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const res = await api.get('/products');
        return res.data?.products || res.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: async () => {
      try {
        const res = await api.get('/analytics/dashboard');
        return res.data;
      } catch {
        return null;
      }
    },
    retry: 1,
  });

  const orders: RealOrder[] = useMemo(() => {
    if (Array.isArray(rawOrders)) return rawOrders;
    if (rawOrders && Array.isArray((rawOrders as any).orders)) return (rawOrders as any).orders;
    return [];
  }, [rawOrders]);

  const products = useMemo(() => {
    if (Array.isArray(rawProducts)) return rawProducts;
    if (rawProducts && Array.isArray((rawProducts as any).products)) return (rawProducts as any).products;
    return [];
  }, [rawProducts]);

  // ── REAL MUTATIONS (UPDATING SERVER LIVE) ─────────────────────────────────
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, newStatus }: { orderId: string; newStatus: string }) =>
      api.patch(`/orders/${orderId}/status`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ orderId, newPaymentStatus }: { orderId: string; newPaymentStatus: string }) =>
      api.patch(`/orders/${orderId}/payment`, { payment_status: newPaymentStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    await updateStatusMutation.mutateAsync({ orderId, newStatus });
  };

  const handleUpdatePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
    await updatePaymentMutation.mutateAsync({ orderId, newPaymentStatus });
  };

  const handleOpenInvoiceModal = (specificOrder?: RealOrder) => {
    if (specificOrder) {
      setInvoiceModalOrder(specificOrder as unknown as InvoiceModalOrder);
      return;
    }
    if (orders.length > 0) {
      setInvoiceModalOrder(orders[0] as unknown as InvoiceModalOrder);
    } else {
      setShowAddOrderModal(true);
    }
  };

  return (
    <>
      <OperationsDashboard
        orders={orders}
        products={products}
        dashboardData={dashboardData}
        user={user}
        storeUrl={storeUrl}
        merchantName={firstName}
        storeName={user?.business_name || 'My Store'}
        isLoading={ordersLoading || productsLoading}
        onOpenNewOrderModal={() => setShowAddOrderModal(true)}
        onOpenInvoiceModal={handleOpenInvoiceModal}
        onOpenQrModal={() => setShowQrModal(true)}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onUpdatePaymentStatus={handleUpdatePaymentStatus}
      />

      {/* ── REAL MODALS ── */}
      {showAddOrderModal && (
        <AddOrderModal
          isOpen={showAddOrderModal}
          onClose={() => setShowAddOrderModal(false)}
          user={user}
          onOrderCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            setShowAddOrderModal(false);
          }}
        />
      )}

      {showPaymentModal && (
        <PaymentSetupModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {showQrModal && (
        <CounterQrModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          upiId={currentUpiId}
          businessName={user?.business_name || user?.name || 'My Store'}
          storeUrl={storeUrl}
        />
      )}

      {invoiceModalOrder && (
        <InvoiceDocumentModal
          order={invoiceModalOrder}
          merchantName={user?.business_name || user?.name || 'My Store'}
          onClose={() => setInvoiceModalOrder(null)}
          onPaymentUpdate={(id, status) => handleUpdatePaymentStatus(id, status)}
        />
      )}
    </>
  );
}

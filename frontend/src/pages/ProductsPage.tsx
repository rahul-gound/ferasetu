import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, Search, Edit2, Trash2, X, Upload, Package,
  AlertTriangle, ChevronDown, ToggleLeft, ToggleRight,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  sale_price?: number;
  category: string;
  stock_quantity: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  sale_price: string;
  category: string;
  stock_quantity: string;
  image_url: string;
  is_active: boolean;
}

const CATEGORIES = ['Grocery', 'Fashion', 'Electronics', 'Food & Beverages', 'Medical', 'Home & Kitchen', 'Sports', 'Beauty', 'Books', 'Other'];

const FREE_LIMIT = 50;

function Shimmer() {
  return (
    <div style={{
      background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
      borderRadius: '12px', height: '260px',
    }} />
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const emptyForm: ProductForm = {
    name: '', description: '', price: '', sale_price: '',
    category: '', stock_quantity: '', image_url: '', is_active: true,
  };
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete product'),
  });

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !category || p.category === category;
    return matchSearch && matchCat;
  });

  const openAdd = () => {
    if (user?.plan === 'free' && products.length >= FREE_LIMIT) {
      toast.error(`Free plan is limited to ${FREE_LIMIT} products. Upgrade to Premium!`);
      return;
    }
    setEditProduct(null);
    setForm(emptyForm);
    setImagePreview('');
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name, description: p.description || '',
      price: String(p.price), sale_price: p.sale_price ? String(p.sale_price) : '',
      category: p.category, stock_quantity: String(p.stock_quantity),
      image_url: p.image_url || '', is_active: p.is_active,
    });
    setImagePreview(p.image_url || '');
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setImagePreview(url);
      setForm(f => ({ ...f, image_url: url }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    if (!form.price || isNaN(Number(form.price))) { toast.error('Valid price is required'); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        category: form.category,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        image_url: form.image_url,
        is_active: form.is_active,
      };

      if (editProduct) {
        await api.put(`/products/${editProduct.id}`, payload);
        toast.success('Product updated!');
      } else {
        await api.post('/products', payload);
        toast.success('Product added!');
      }

      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowModal(false);
    } catch {
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)' }}>{translate('products')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            {products.length} products
            {user?.plan === 'free' && ` · ${FREE_LIMIT - products.length} remaining on free plan`}
          </p>
        </div>
        <button onClick={openAdd} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> {translate('addProduct')}
        </button>
      </div>

      {/* Free plan banner */}
      {user?.plan === 'free' && products.length >= FREE_LIMIT * 0.8 && (
        <div style={{
          marginBottom: '20px', padding: '14px 18px', borderRadius: '10px',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <AlertTriangle size={18} color="#F59E0B" />
          <span style={{ fontSize: '13px', color: 'var(--text)' }}>
            You're using <strong>{products.length}/{FREE_LIMIT}</strong> products on the free plan.
            <a href="#" style={{ color: 'var(--primary)', fontWeight: 600, marginLeft: '6px' }}>Upgrade to Premium →</a>
          </span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            placeholder={`${translate('search')} products...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '38px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <select
            className="input"
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ paddingRight: '32px', cursor: 'pointer', minWidth: '160px' }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => <Shimmer key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <Package size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p style={{ fontSize: '16px', fontWeight: 600 }}>No products found</p>
          <p style={{ fontSize: '14px', marginTop: '4px' }}>
            {search ? 'Try a different search term' : 'Add your first product to get started!'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {filtered.map(product => (
            <div key={product.id} className="card" style={{ overflow: 'hidden', padding: 0 }}>
              {/* Image */}
              <div style={{
                height: '160px', background: product.image_url ? 'none' : 'linear-gradient(135deg,#f5f5f5,#e8e8e8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Package size={48} color="#ccc" />
                )}
                {!product.is_active && (
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                    padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                  }}>Inactive</div>
                )}
                {product.sale_price && product.sale_price < product.price && (
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    background: '#EF4444', color: '#fff',
                    padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                  }}>
                    {Math.round((1 - product.sale_price / product.price) * 100)}% OFF
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '14px' }}>
                <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px' }}>
                  {product.category}
                </div>
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)', marginBottom: '8px', lineHeight: 1.3 }}>
                  {product.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>
                    ₹{(product.sale_price || product.price).toLocaleString('en-IN')}
                  </span>
                  {product.sale_price && product.sale_price < product.price && (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '12px', fontWeight: 600,
                    color: product.stock_quantity <= 5 ? '#EF4444' : product.stock_quantity <= 20 ? '#F59E0B' : '#10B981',
                  }}>
                    {product.stock_quantity <= 0 ? 'Out of stock' : `${product.stock_quantity} in stock`}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => openEdit(product)}
                      style={{
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: '6px', padding: '6px', cursor: 'pointer',
                        color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(product.id)}
                      style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '6px', padding: '6px', cursor: 'pointer',
                        color: '#EF4444', display: 'flex', alignItems: 'center',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '16px', width: '100%', maxWidth: '560px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                {editProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '24px' }}>
              {/* Image Upload */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                  Product Image
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    height: '140px', border: '2px dashed var(--border)', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', overflow: 'hidden', position: 'relative',
                    background: imagePreview ? 'none' : 'var(--bg)',
                  }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Upload size={28} style={{ marginBottom: '8px' }} />
                      <p style={{ fontSize: '13px' }}>Click to upload image (max 5MB)</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              </div>

              {/* Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Product Name *</label>
                <input className="input" style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="e.g. Aashirvaad Atta 5kg"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Description</label>
                <textarea className="input" style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '80px' }}
                  placeholder="Describe your product..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {/* Price + Sale Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Price (₹) *</label>
                  <input className="input" type="number" style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="0.00" min="0" step="0.01"
                    value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Sale Price (₹)</label>
                  <input className="input" type="number" style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="Optional" min="0" step="0.01"
                    value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} />
                </div>
              </div>

              {/* Category + Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Category</label>
                  <select className="input" style={{ width: '100%', boxSizing: 'border-box' }}
                    value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Stock Quantity</label>
                  <input className="input" type="number" style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="0" min="0"
                    value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} />
                </div>
              </div>

              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: form.is_active ? 'var(--primary)' : 'var(--text-muted)', display: 'flex' }}
                >
                  {form.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                  {form.is_active ? 'Active (visible in store)' : 'Inactive (hidden from store)'}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  {translate('cancel')}
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary"
                  style={{ opacity: saving ? 0.7 : 1, minWidth: '100px' }}>
                  {saving ? 'Saving...' : translate('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '16px', padding: '32px',
            maxWidth: '400px', width: '100%', textAlign: 'center',
          }}>
            <Trash2 size={40} color="#EF4444" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>Delete Product?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
              This action cannot be undone. The product will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteId(null)} className="btn btn-secondary">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                style={{
                  padding: '10px 24px', borderRadius: '8px', border: 'none',
                  background: '#EF4444', color: '#fff', fontWeight: 600, cursor: 'pointer',
                  opacity: deleteMutation.isPending ? 0.7 : 1,
                }}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

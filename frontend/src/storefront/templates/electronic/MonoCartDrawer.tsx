import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Lock, CheckCircle2 } from 'lucide-react';
import { useMonoShop } from './MonoContext';
import { PrimaryButton, QtyStepper, scrollToId } from './MonoUI';

function CheckoutModal({ onClose }: { onClose: () => void }) {
  const { placeOrder, subtotal, user, formatPrice } = useMonoShop();
  const [stage, setStage] = useState<'form' | 'done'>('form');
  const [order, setOrder] = useState<{ id: string; total: number } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const o = placeOrder();
    setOrder(o);
    setStage('done');
  };

  const field =
    'w-full rounded-md border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Checkout"
      >
        {stage === 'form' ? (
          <form onSubmit={submit} className="p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
              <Lock size={16} className="text-stock" /> Secure checkout
            </h3>
            <p className="mt-1 text-xs text-ink/50">Direct order checkout — 0% marketplace commission.</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <input required className={`${field} col-span-2`} placeholder="Full name" defaultValue={user?.name ?? ''} />
              <input required type="email" className={`${field} col-span-2`} placeholder="Email address" defaultValue={user?.email ?? ''} />
              <input required className={`${field} col-span-2`} placeholder="Shipping address" />
              <input required className={field} placeholder="City" />
              <input required className={field} placeholder="Postal code" />
              <input required className={`${field} col-span-2`} placeholder="Card number  ·  4242 4242 4242 4242" inputMode="numeric" />
              <input required className={field} placeholder="MM / YY" />
              <input required className={field} placeholder="CVC" inputMode="numeric" />
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
              <span className="text-sm text-ink/60">Total due</span>
              <span className="text-lg font-extrabold text-ink">{formatPrice(subtotal)}</span>
            </div>

            <PrimaryButton type="submit" className="mt-4 w-full py-3 text-sm">
              Place order
            </PrimaryButton>
          </form>
        ) : (
          <div className="p-8 text-center">
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 16 }}
              className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-stock/10 text-stock"
            >
              <CheckCircle2 size={32} />
            </motion.span>
            <h3 className="mt-4 text-xl font-bold text-ink">Order confirmed</h3>
            <p className="mt-2 text-sm text-ink/60">
              {order?.id} · {order ? formatPrice(order.total) : ''}
              <br />
              Confirmation has been sent to the merchant.
            </p>
            <PrimaryButton className="mt-6 w-full py-3 text-sm" onClick={onClose}>
              Continue shopping
            </PrimaryButton>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function MonoCartDrawer() {
  const { ui, openCart, cartItems, cartCount, subtotal, setQty, removeFromCart, formatPrice } = useMonoShop();
  const [checkout, setCheckout] = useState(false);

  return (
    <>
      <AnimatePresence>
        {ui.cart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm"
            onClick={() => openCart(false)}
          >
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Shopping cart"
            >
              <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
                <h2 className="text-lg font-bold text-ink">
                  Your cart <span className="text-ink/40">({cartCount})</span>
                </h2>
                <button
                  onClick={() => openCart(false)}
                  className="grid h-9 w-9 place-items-center rounded-full text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
                  aria-label="Close cart"
                >
                  <X size={18} />
                </button>
              </div>

              {cartItems.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-surface text-ink/40">
                    <ShoppingBag size={26} />
                  </span>
                  <p className="text-sm text-ink/60">Your cart is empty. Let’s fix that.</p>
                  <PrimaryButton
                    className="px-6 py-2.5 text-sm"
                    onClick={() => {
                      openCart(false);
                      scrollToId('catalog');
                    }}
                  >
                    Browse products
                  </PrimaryButton>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-4 overflow-y-auto p-5">
                    <AnimatePresence initial={false}>
                      {cartItems.map(({ product, qty }) => (
                        <motion.div
                          key={product.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 40 }}
                          transition={{ duration: 0.22 }}
                          className="flex gap-4 rounded-xl border border-black/5 p-3"
                        >
                          <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-black/5 bg-white">
                            <img
                              src={product.img}
                              alt={product.name}
                              className={`h-full w-full ${product.fit === 'cover' ? 'object-cover' : 'object-contain p-1.5'}`}
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">{product.brand}</p>
                            <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
                            <p className="mt-0.5 text-xs text-ink/50">{formatPrice(product.price)} each</p>
                            <div className="mt-2 flex items-center gap-2">
                              <QtyStepper small qty={qty} onChange={(q) => setQty(product.id, q)} />
                              <button
                                onClick={() => removeFromCart(product.id)}
                                className="grid h-7 w-7 place-items-center rounded-md text-ink/40 transition-colors hover:bg-red-50 hover:text-red-500"
                                aria-label={`Remove ${product.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <span className="text-sm font-bold tabular-nums text-ink">{formatPrice(product.price * qty)}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <div className="border-t border-black/5 p-5">
                    <div className="flex justify-between text-sm text-ink/60">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-sm text-ink/60">
                      <span>Shipping</span>
                      <span className="font-medium text-stock">Free</span>
                    </div>
                    <div className="mt-3 flex justify-between border-t border-black/5 pt-3 text-base font-extrabold text-ink">
                      <span>Total</span>
                      <span className="tabular-nums">{formatPrice(subtotal)}</span>
                    </div>
                    <PrimaryButton className="mt-4 w-full py-3 text-sm" onClick={() => setCheckout(true)}>
                      Checkout · {formatPrice(subtotal)}
                    </PrimaryButton>
                  </div>
                </>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{checkout && <CheckoutModal onClose={() => setCheckout(false)} />}</AnimatePresence>
    </>
  );
}

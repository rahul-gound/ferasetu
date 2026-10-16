import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserRound } from 'lucide-react';
import { useMonoShop } from './MonoContext';
import { PrimaryButton } from './MonoUI';

export default function MonoAuthModal() {
  const { ui, openAuth, login, signup } = useMonoShop();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') {
      login(email, name || undefined);
    } else {
      signup(name || email.split('@')[0], email);
    }
    openAuth(false);
    setPass('');
  };

  const field =
    'w-full rounded-md border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20';

  return (
    <AnimatePresence>
      {ui.auth && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => openAuth(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Account"
          >
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand/10 text-brand">
                <UserRound size={20} />
              </span>
              <button
                onClick={() => openAuth(false)}
                className="grid h-9 w-9 place-items-center rounded-full text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <h2 className="mt-4 text-xl font-bold text-ink">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1 text-xs text-ink/50">Direct merchant account — your profile and past orders.</p>

            <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-surface p-1">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-md py-2 text-sm font-semibold transition-all ${
                    mode === m ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'
                  }`}
                >
                  {m === 'signin' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-4 space-y-3">
              {mode === 'signup' && (
                <input
                  required
                  className={field}
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
              <input
                required
                type="email"
                className={field}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                required
                type="password"
                minLength={4}
                className={field}
                placeholder="Password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
              <PrimaryButton type="submit" className="w-full py-3 text-sm">
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </PrimaryButton>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

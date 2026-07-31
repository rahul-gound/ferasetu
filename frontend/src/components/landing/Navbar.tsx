import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsOpen(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-lg bg-white/80 border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold">
              <span className="text-orange-600">Fera</span>
              <span className="text-slate-900">Setu</span>
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection('features')}
              className="text-slate-600 hover:text-slate-900 transition text-sm font-medium"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-slate-600 hover:text-slate-900 transition text-sm font-medium"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="text-slate-600 hover:text-slate-900 transition text-sm font-medium"
            >
              FAQ
            </button>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button className="px-6 py-2 text-slate-700 font-medium hover:text-slate-900 transition">
              Sign In
            </button>
            <button className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium">
              Start Free
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 hover:bg-neutral-100 rounded-lg transition"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden border-t border-neutral-200 py-4 space-y-3">
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left px-4 py-2 text-slate-600 hover:bg-neutral-50 rounded"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="block w-full text-left px-4 py-2 text-slate-600 hover:bg-neutral-50 rounded"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="block w-full text-left px-4 py-2 text-slate-600 hover:bg-neutral-50 rounded"
            >
              FAQ
            </button>
            <div className="flex gap-2 pt-2">
              <button className="flex-1 px-4 py-2 text-slate-700 font-medium border border-neutral-300 rounded-lg">
                Sign In
              </button>
              <button className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium">
                Start Free
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

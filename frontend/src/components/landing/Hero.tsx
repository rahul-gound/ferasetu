import { ArrowRight, Sparkles } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-20">
      {/* Gradient Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-full mb-6">
          <Sparkles size={16} className="text-orange-600" />
          <span className="text-sm font-medium text-orange-700">🚀 AI-Powered Store Builder</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6">
          <span className="text-slate-900">Launch Your</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-pink-600">
            Online Store
          </span>
          <br />
          <span className="text-slate-900">in Minutes</span>
        </h1>

        {/* Subheading */}
        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          FeraSetu empowers Indian SMBs to sell online with AI-powered store builder, instant WhatsApp ordering, and built-in inventory management.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <button className="px-8 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition inline-flex items-center justify-center gap-2">
            Start Building Free <ArrowRight size={18} />
          </button>
          <button className="px-8 py-3 border border-slate-300 text-slate-900 rounded-lg font-semibold hover:bg-slate-50 transition">
            Watch Demo
          </button>
        </div>

        {/* Trust Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pt-12 border-t border-slate-200 max-w-2xl mx-auto">
          <div>
            <div className="text-3xl font-bold text-orange-600">10K+</div>
            <div className="text-sm text-slate-600 mt-1">Stores Created</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600">₹50Cr+</div>
            <div className="text-sm text-slate-600 mt-1">GMV</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600">98%</div>
            <div className="text-sm text-slate-600 mt-1">Uptime</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-slate-300 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-slate-300 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}

import { ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-24 px-4 bg-gradient-to-r from-orange-600 to-pink-600">
      <div className="max-w-4xl mx-auto text-center text-white">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Ready to Launch Your <br /> Online Store?
        </h2>
        <p className="text-xl mb-8 opacity-95 max-w-2xl mx-auto">
          Join thousands of Indian businesses already selling online with FeraSetu. Start your free trial today—no credit card required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-8 py-3 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition inline-flex items-center justify-center gap-2">
            Start Free Trial <ArrowRight size={18} />
          </button>
          <button className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition">
            Schedule Demo
          </button>
        </div>
      </div>
    </section>
  );
}

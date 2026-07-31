import { Zap, Lock, TrendingUp, Smartphone } from 'lucide-react';

export function WhyFeraSetu() {
  const reasons = [
    {
      icon: Zap,
      title: 'Built for Speed',
      description: 'Launch your store in minutes, not months. Our AI handles the heavy lifting so you can focus on selling.',
    },
    {
      icon: Lock,
      title: 'Complete Control',
      description: 'Your data is yours. No middlemen, no commissions on your orders. You own everything.',
    },
    {
      icon: TrendingUp,
      title: 'Grow Faster',
      description: 'AI-powered insights and WhatsApp integration help you reach customers where they already are.',
    },
    {
      icon: Smartphone,
      title: 'Mobile First',
      description: 'Your store looks beautiful on every device. Your customers shop anywhere, anytime.',
    },
  ];

  return (
    <section id="why" className="py-24 px-4 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Why <span className="text-primary">FeraSetu</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            We built FeraSetu specifically for Indian SMBs. No compromises, no complexity.
          </p>
        </div>

        {/* Reasons Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {reasons.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <div
                key={index}
                className="flex gap-6 p-8 bg-white rounded-xl border border-slate-200 hover:border-primary hover:shadow-glow transition-all duration-300"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                    <Icon size={24} className="text-primary" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{reason.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{reason.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

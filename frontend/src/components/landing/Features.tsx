import { memo, useMemo } from 'react';
import { Zap, Smartphone, BarChart3, MessageCircle, Package, Brain } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'AI Website Builder',
    description: 'Create stunning online stores without coding. AI-powered templates designed for Indian SMBs.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Optimized',
    description: 'Beautiful stores that work perfectly on all devices. Your customers shop anywhere, anytime.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Ordering',
    description: 'Integrate WhatsApp for instant ordering. Your customers order directly through their favorite app.',
  },
  {
    icon: Package,
    title: 'Inventory Management',
    description: 'Real-time stock tracking and automated alerts. Never oversell again.',
  },
  {
    icon: BarChart3,
    title: 'Smart Analytics',
    description: 'Deep insights into customer behavior and sales trends. Make data-driven decisions.',
  },
  {
    icon: Brain,
    title: 'AI Assistant',
    description: 'Personalized product recommendations powered by AI. Boost your average order value.',
  },
];

export const Features = memo(function FeatsComponent() {
  return (
    <section id="features" className="py-24 px-4 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Everything You Need to <span className="text-primary">Succeed</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Comprehensive tools designed specifically for Indian businesses going online.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="p-8 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-glow transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:from-blue-200 group-hover:to-blue-100 transition">
                  <Icon size={24} className="text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <button className="px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-glow hover:shadow-glow-lg">
            Explore All Features
          </button>
        </div>
      </div>
    </section>
  );
});

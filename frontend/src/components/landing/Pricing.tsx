import { memo } from 'react';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '₹0',
    period: 'Forever free',
    description: 'Perfect for getting started',
    features: [
      'Single product showcase',
      'Basic store customization',
      'Email support',
      'Up to 100 monthly orders',
      'Basic analytics',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '₹499',
    period: '/month',
    description: 'For growing businesses',
    features: [
      'Unlimited products',
      'Advanced customization',
      'WhatsApp integration',
      'Unlimited monthly orders',
      'Advanced analytics',
      'Priority email support',
      'Inventory management',
      'Multiple team members',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'Contact us',
    description: 'For large operations',
    features: [
      'Everything in Professional',
      'API access',
      'Custom domain',
      'Dedicated support',
      'Advanced integrations',
      'Custom branding',
      'SLA guarantee',
      'Training & onboarding',
    ],
    cta: 'Talk to Sales',
    highlighted: false,
  },
];

export const Pricing = memo(function PricingComponent() {
  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Simple, <span className="text-primary">Transparent</span> Pricing
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Start free and upgrade as you grow. No hidden fees.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-6">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-8 transition-all duration-300 ${
                plan.highlighted
                  ? 'bg-gradient-to-br from-primary to-blue-700 text-white shadow-glow-xl scale-105 md:scale-110'
                  : 'bg-white border border-slate-200 hover:border-blue-200'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-300 text-slate-900 px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className={plan.highlighted ? 'text-orange-100' : 'text-slate-600'}>
                {plan.description}
              </p>

              <div className="my-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={plan.highlighted ? 'text-orange-100' : 'text-slate-600'}>
                    {plan.period}
                  </span>
                </div>
              </div>

              <button
                className={`w-full py-3 px-4 rounded-lg font-semibold transition mb-8 ${
                  plan.highlighted
                    ? 'bg-white text-primary hover:bg-blue-50'
                    : 'bg-primary text-white hover:bg-blue-700'
                }`}
              >
                {plan.cta}
              </button>

              <div className="space-y-4">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check
                      size={20}
                      className={plan.highlighted ? 'text-blue-100' : 'text-primary'}
                    />
                    <span className={plan.highlighted ? 'text-blue-50' : 'text-slate-700'}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Link */}
        <div className="mt-16 text-center">
          <p className="text-slate-600 mb-4">
            Have questions about pricing?{' '}
            <button className="text-primary font-semibold hover:text-blue-700">
              View FAQ
            </button>
          </p>
        </div>
      </div>
    </section>
  );
});

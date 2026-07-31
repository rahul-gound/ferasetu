import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Rajesh Kumar',
    business: 'Kumar Clothing Store',
    avatar: '👨‍💼',
    text: 'FeraSetu helped me go online without any technical knowledge. Within a week, I was selling directly through WhatsApp and my website.',
    rating: 5,
  },
  {
    name: 'Priya Sharma',
    business: 'Artisan Crafts Co.',
    avatar: '👩‍💼',
    text: 'The AI analytics helped me understand my customers better. My average order value increased by 40% in the first month!',
    rating: 5,
  },
  {
    name: 'Amit Patel',
    business: 'Fresh Grocery Mart',
    avatar: '👨',
    text: 'WhatsApp integration is a game-changer. My repeat order rate went from 30% to 65%. Absolutely worth it!',
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Loved by <span className="text-orange-600">10,000+ Sellers</span>
          </h2>
          <p className="text-xl text-slate-600">
            See how businesses across India are transforming their operations.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="p-8 bg-slate-50 rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all"
            >
              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} size={16} className="fill-orange-400 text-orange-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-slate-700 mb-6 leading-relaxed">
                &quot;{testimonial.text}&quot;
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="text-3xl">{testimonial.avatar}</div>
                <div>
                  <h4 className="font-semibold text-slate-900">{testimonial.name}</h4>
                  <p className="text-sm text-slate-600">{testimonial.business}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

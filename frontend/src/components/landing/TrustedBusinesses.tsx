export function TrustedBusinesses() {
  const businesses = [
    { name: 'Grocery Stores', icon: '🛒' },
    { name: 'Fashion Boutiques', icon: '👗' },
    { name: 'Electronics Shops', icon: '📱' },
    { name: 'Medical Stores', icon: '💊' },
    { name: 'Restaurants', icon: '🍕' },
    { name: 'Beauty Salons', icon: '💅' },
  ];

  return (
    <section className="py-16 px-4 bg-white border-y border-slate-200">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-slate-600 font-medium mb-8">Trusted by businesses across India</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
          {businesses.map((business, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-3 p-4 rounded-lg hover:bg-blue-50 transition"
            >
              <div className="text-3xl">{business.icon}</div>
              <p className="text-sm font-medium text-slate-700 text-center">{business.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

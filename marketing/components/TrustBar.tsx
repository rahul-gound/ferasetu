const CITIES = ['Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad', 'Pune', 'Jaipur', 'Surat', 'Lucknow'];

export default function TrustBar() {
  return (
    <div
      style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '28px 0',
        background: 'rgba(255, 255, 255, 0.015)',
      }}
    >
      <div className="marquee-mask max-w-7xl mx-auto px-6">
        <div className="marquee-track">
          {[...Array(2)].flatMap((_, dup) =>
            CITIES.map((city) => (
              <div
                key={`${dup}-${city}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'rgba(255, 255, 255, 0.32)',
                  fontSize: 14,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#FF6B35',
                    opacity: 0.6,
                  }}
                />
                {city}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

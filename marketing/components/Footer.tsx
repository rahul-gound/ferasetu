export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '40px 0',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #FF6B35, #E55A24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
            }}
          >
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 16, fontStyle: 'italic' }}>F</span>
          </div>
          <span className="font-display" style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em' }}>
            Fera<span style={{ color: '#FF6B35' }}>Setu</span>
          </span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255, 255, 255, 0.25)' }}>
          © {new Date().getFullYear()} FeraSetu. Your shop's digital bridge.
        </p>
      </div>
    </footer>
  );
}

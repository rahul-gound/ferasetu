interface BreadcrumbProps {
  shopName: string;
}

export default function Breadcrumb({ shopName }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" style={{
      background: '#f8fafc',
      borderBottom: '1px solid #e2e8f0',
      padding: '10px 24px',
      fontSize: '14px',
      color: '#64748b',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <ol style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        maxWidth: '1200px',
      }}>
        <li>
          <a href="/" style={{
            color: '#3b82f6',
            textDecoration: 'none',
          }}>
            FeraSetu
          </a>
        </li>
        <li aria-hidden="true" style={{ color: '#94a3b8' }}>/</li>
        <li aria-current="page" style={{
          color: '#1e293b',
          fontWeight: 600,
        }}>
          {shopName}
        </li>
      </ol>
    </nav>
  );
}

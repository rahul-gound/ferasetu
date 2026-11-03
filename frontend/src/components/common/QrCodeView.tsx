import React, { useMemo, useRef } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  generateQrMatrix,
  generateQrSvgPath,
  type ErrorCorrectionLevel,
} from '../../utils/qrCodeGenerator';

export interface QrCodeViewProps {
  /** The value/URL/UPI URI to encode */
  value: string;
  /** Size in pixels (width and height) */
  size?: number;
  /** Error correction level: L (7%), M (15%), Q (25%), H (30%) */
  level?: ErrorCorrectionLevel;
  /** Quiet zone padding in module units */
  margin?: number;
  /** Foreground module color */
  fgColor?: string;
  /** Background color */
  bgColor?: string;
  /** Optional center badge or logo image/monogram */
  centerBadgeText?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show quick download button */
  downloadable?: boolean;
  /** Download file name */
  downloadFileName?: string;
}

export default function QrCodeView({
  value,
  size = 200,
  level = 'M',
  margin = 3,
  fgColor = '#0f172a',
  bgColor = '#ffffff',
  centerBadgeText,
  className = '',
  downloadable = false,
  downloadFileName = 'ferasetu-qr-code.png',
}: QrCodeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  // Compute QR path
  const { path, viewBoxSize } = useMemo(() => {
    if (!value || typeof value !== 'string') {
      return { path: '', viewBoxSize: 25 };
    }
    try {
      const matrix = generateQrMatrix(value, level);
      const res = generateQrSvgPath(matrix, margin);
      return { path: res.path, viewBoxSize: res.size };
    } catch (err) {
      console.error('[QrCodeView] Failed to generate QR code:', err);
      return { path: '', viewBoxSize: 25 };
    }
  }, [value, level, margin]);

  // Export to high-res PNG for download
  const handleDownload = () => {
    try {
      const canvas = document.createElement('canvas');
      const scale = 3; // 3x resolution for super crisp print quality
      canvas.width = size * scale;
      canvas.height = size * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const matrix = generateQrMatrix(value, level);
      const moduleCount = matrix.length;
      const totalModules = moduleCount + margin * 2;
      const modulePixelSize = (size * scale) / totalModules;

      // Draw dark modules
      ctx.fillStyle = fgColor;
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (matrix[r][c]) {
            const x = (c + margin) * modulePixelSize;
            const y = (r + margin) * modulePixelSize;
            ctx.fillRect(x, y, modulePixelSize + 0.5, modulePixelSize + 0.5);
          }
        }
      }

      // Draw center badge if specified
      if (centerBadgeText) {
        const badgeSize = (size * scale) * 0.22;
        const cx = (size * scale) / 2;
        const cy = (size * scale) / 2;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(cx - badgeSize / 2, cy - badgeSize / 2, badgeSize, badgeSize, 12);
        ctx.fill();

        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 24px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(centerBadgeText.slice(0, 4).toUpperCase(), cx, cy);
      }

      const link = document.createElement('a');
      link.download = downloadFileName;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR Code downloaded successfully');
    } catch {
      toast.error('Failed to download QR code');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className={`inline-flex flex-col items-center ${className}`} ref={containerRef}>
      <div
        className="relative bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-center transition-all"
        style={{ width: size, height: size }}
      >
        {path ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
            width={size - 20}
            height={size - 20}
            shapeRendering="crispEdges"
            className="w-full h-full"
            aria-label="Real Scannable QR Code"
          >
            <rect width="100%" height="100%" fill={bgColor} />
            <path d={path} fill={fgColor} />
          </svg>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-medium">
            Generating QR…
          </div>
        )}

        {/* Center Monogram / Badge (aesthetic & brand recognition without blocking scan error-correction) */}
        {centerBadgeText && path && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-9 h-9 rounded-xl bg-white border-2 border-orange-500 shadow-sm flex items-center justify-center">
              <span className="text-[10px] font-black tracking-wider text-orange-600 uppercase">
                {centerBadgeText.slice(0, 3)}
              </span>
            </div>
          </div>
        )}
      </div>

      {downloadable && (
        <div className="flex items-center gap-2 mt-2.5">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="Download QR code image"
          >
            <Download size={13} />
            <span>Download</span>
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="Copy target URL / UPI address"
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

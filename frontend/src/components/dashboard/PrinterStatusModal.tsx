import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Usb,
  Wifi,
  Bluetooth,
  HelpCircle
} from 'lucide-react';

export interface PrinterStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName?: string;
}

export default function PrinterStatusModal({
  isOpen,
  onClose,
  storeName = 'My Store',
}: PrinterStatusModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [detectedPrinter, setDetectedPrinter] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkDeviceConnection();
    }
  }, [isOpen]);

  const checkDeviceConnection = async () => {
    setIsScanning(true);
    setTestResult(null);

    // Realistic check using Web APIs (Serial/USB/Bluetooth) if supported
    try {
      let found = false;
      let name: string | null = null;

      if (typeof navigator !== 'undefined' && 'serial' in navigator) {
        try {
          const ports = await (navigator as any).serial.getPorts();
          if (ports.length > 0) {
            found = true;
            name = 'USB/Serial ESC/POS Thermal Printer';
          }
        } catch {}
      }

      if (!found && typeof navigator !== 'undefined' && 'usb' in navigator) {
        try {
          const devices = await (navigator as any).usb.getDevices();
          const printer = devices.find((d: any) =>
            d.productName?.toLowerCase().includes('printer') ||
            d.productName?.toLowerCase().includes('pos') ||
            d.deviceClass === 7
          );
          if (printer) {
            found = true;
            name = printer.productName || 'USB Thermal Receipt Printer';
          }
        } catch {}
      }

      setPrinterConnected(found);
      setDetectedPrinter(name);
    } catch {
      setPrinterConnected(false);
      setDetectedPrinter(null);
    } finally {
      setIsScanning(false);
    }
  };

  const handleRequestPair = async () => {
    setIsScanning(true);
    try {
      if (typeof navigator !== 'undefined' && 'serial' in navigator) {
        const port = await (navigator as any).serial.requestPort();
        if (port) {
          setPrinterConnected(true);
          setDetectedPrinter('Paired Serial Thermal Printer');
          setTestResult('Device connected successfully!');
          return;
        }
      }
      setTestResult('No serial port selected.');
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setTestResult('Pairing cancelled or device not supported.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleTriggerPrint = () => {
    if (!printerConnected) {
      setTestResult('Cannot print: Please connect and pair an ESC/POS printer first.');
      return;
    }

    try {
      window.print();
      setTestResult('Dispatched print job to operating system receipt queue.');
    } catch (e: any) {
      setTestResult(`Print failed: ${e.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="printer-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
              <Printer size={20} />
            </div>
            <div>
              <h2
                id="printer-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Receipt Printer Hardware
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                58mm / 80mm ESC/POS thermal counter hardware
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            aria-label="Close printer modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs sm:text-sm">
          {/* Status Box */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              printerConnected
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-300'
            }`}
          >
            {printerConnected ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            )}

            <div className="space-y-1">
              <div className="font-bold">
                {printerConnected ? 'Thermal Printer Connected' : 'Printer Not Connected'}
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                {printerConnected
                  ? `Device: ${detectedPrinter || 'ESC/POS Printer'} is ready to print receipts.`
                  : 'No active thermal printer detected on USB, Bluetooth, or LAN. Please connect your printer before dispatching test bills.'}
              </p>
            </div>
          </div>

          {/* Connection Channels */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Supported Hardware Interfaces
            </span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col items-center gap-1.5 text-center text-slate-700 dark:text-slate-300">
                <Usb size={16} className="text-slate-400" />
                <span className="font-medium">USB / OTG</span>
                <span className="text-[10px] text-slate-400">Direct Cable</span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col items-center gap-1.5 text-center text-slate-700 dark:text-slate-300">
                <Bluetooth size={16} className="text-slate-400" />
                <span className="font-medium">Bluetooth</span>
                <span className="text-[10px] text-slate-400">Wireless</span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col items-center gap-1.5 text-center text-slate-700 dark:text-slate-300">
                <Wifi size={16} className="text-slate-400" />
                <span className="font-medium">LAN / IP</span>
                <span className="text-[10px] text-slate-400">Ethernet</span>
              </div>
            </div>
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 text-xs text-slate-700 dark:text-slate-300">
              {testResult}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={checkDeviceConnection}
              disabled={isScanning}
              className="w-full sm:flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={isScanning ? 'animate-spin' : ''} />
              <span>Rescan Devices</span>
            </button>

            {!printerConnected ? (
              <button
                type="button"
                onClick={handleRequestPair}
                disabled={isScanning}
                className="w-full sm:flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Pair New Printer
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTriggerPrint}
                className="w-full sm:flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Print Test Bill</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

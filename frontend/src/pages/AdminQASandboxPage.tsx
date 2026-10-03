import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Sparkles, ArrowLeft, AlertTriangle, Bug, Image as ImageIcon,
  CheckCircle2, RefreshCw, Terminal, MousePointer
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const rawApi = import.meta.env.VITE_API_URL || '/api';
const API_BASE = rawApi.replace(/\/+$/, '');
const ADMIN_API = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

export default function AdminQASandboxPage() {
  const navigate = useNavigate();
  const [spinnerLoading, setSpinnerLoading] = useState(false);
  const [slowApiLoading, setSlowApiLoading] = useState(false);
  const [apiResult, setApiResult] = useState<string | null>(null);

  // Trigger synthetic 500 failure
  const handleSynthetic500 = async () => {
    setSpinnerLoading(true);
    setApiResult(null);
    try {
      await axios.post(`${API_BASE}/qa/synthetic/server-error`, {});
      setSpinnerLoading(false);
    } catch (err: any) {
      // Deliberately keep spinner active to simulate an unhandled infinite loading defect
      setApiResult('API returned HTTP 500. UI caught error but spinner remained stuck.');
      toast.error('Synthetic 500 simulated!');
      console.error('Synthetic Error Triggered:', new TypeError('Cannot read properties of undefined (reading "success")'));
    }
  };

  // Trigger synthetic slow call
  const handleSyntheticSlow = async () => {
    setSlowApiLoading(true);
    try {
      await axios.get(`${API_BASE}/qa/synthetic/delayed-response?delay=3500`);
      toast.success('Slow API finished after 3.5s');
    } catch {
      toast.error('Slow API failed');
    } finally {
      setSlowApiLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-16 font-sans">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/qa')}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to QA Control Center
          </button>
        </div>

        {/* Sandbox Header */}
        <div className="bg-[#111827] text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-500/20">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">QA Synthetic Failure Fixtures</h1>
              <p className="text-xs text-slate-400">
                Safe internal test fixtures that deliberately produce known failure patterns to verify the detection engine.
              </p>
            </div>
          </div>
        </div>

        {/* Fixtures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fixture 1: Synthetic Broken B2/CDN Image */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <ImageIcon size={18} />
              <h3>Fixture A: Broken B2 Image (403 Forbidden)</h3>
            </div>
            <p className="text-xs text-slate-500">
              Tests whether the ImageScanner correctly identifies a 403 Forbidden B2 CDN media failure and traces the subsystem.
            </p>
            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center">
              <img
                src={`${API_BASE}/qa/synthetic/broken-image`}
                alt="Synthetic Broken Product"
                className="w-32 h-32 object-cover mx-auto rounded-lg border border-slate-200"
                onError={(e) => {
                  (e.target as HTMLElement).setAttribute('data-failed', 'true');
                }}
              />
              <div className="text-[11px] font-mono text-slate-400 mt-2">
                URL: /api/qa/synthetic/broken-image (403)
              </div>
            </div>
          </div>

          {/* Fixture 2: Synthetic 500 Button with Infinite Spinner */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <Bug size={18} />
              <h3>Fixture B: Button API 500 + Stuck Spinner</h3>
            </div>
            <p className="text-xs text-slate-500">
              Tests whether the ButtonScanner correlates the button click with the POST 500 response, console TypeError, and stuck spinner.
            </p>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
              <button
                id="btn-synthetic-fail"
                onClick={handleSynthetic500}
                disabled={spinnerLoading}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                {spinnerLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Processing Forever...</span>
                  </>
                ) : (
                  <span>Click to Trigger Synthetic 500</span>
                )}
              </button>
              {apiResult && (
                <div className="text-xs font-mono text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                  {apiResult}
                </div>
              )}
            </div>
          </div>

          {/* Fixture 3: Accessibility Violation (Unlabelled Icon Button) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <AlertTriangle size={18} />
              <h3>Fixture C: Missing Accessible Label</h3>
            </div>
            <p className="text-xs text-slate-500">
              Interactive icon button rendered without text, aria-label, or title (WCAG 4.1.2 violation).
            </p>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <button
                className="icon-only-unlabelled p-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 mx-auto"
                onClick={() => toast('Icon clicked')}
              >
                <Sparkles size={16} />
              </button>
              <div className="text-[11px] font-mono text-slate-400 mt-2">
                &lt;button class="icon-only-unlabelled"&gt;&lt;svg /&gt;&lt;/button&gt;
              </div>
            </div>
          </div>

          {/* Fixture 4: Slow API Request */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
              <Terminal size={18} />
              <h3>Fixture D: Slow Network Request (3500ms)</h3>
            </div>
            <p className="text-xs text-slate-500">
              Tests whether the NetworkScanner flags requests exceeding the 3000ms latency budget.
            </p>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
              <button
                onClick={handleSyntheticSlow}
                disabled={slowApiLoading}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                {slowApiLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Waiting for slow endpoint...</span>
                  </>
                ) : (
                  <span>Trigger 3.5s Delay API</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

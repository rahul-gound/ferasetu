import { Share2, Users, Code } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <img src="/logo.svg" alt="FeraSetu" className="h-10 w-auto mb-4" />
            <p className="text-slate-400 leading-relaxed">
              Empowering Indian SMBs to build and grow their online presence with AI-powered tools.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <button className="hover:text-white transition">Features</button>
              </li>
              <li>
                <button className="hover:text-white transition">Pricing</button>
              </li>
              <li>
                <button className="hover:text-white transition">Templates</button>
              </li>
              <li>
                <button className="hover:text-white transition">Integrations</button>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <button className="hover:text-white transition">About</button>
              </li>
              <li>
                <button className="hover:text-white transition">Blog</button>
              </li>
              <li>
                <button className="hover:text-white transition">Careers</button>
              </li>
              <li>
                <button className="hover:text-white transition">Contact</button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <button className="hover:text-white transition">Privacy Policy</button>
              </li>
              <li>
                <button className="hover:text-white transition">Terms of Service</button>
              </li>
              <li>
                <button className="hover:text-white transition">Security</button>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800 my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between">
          {/* Copyright */}
          <p className="text-slate-400 text-sm">
            © {currentYear} FeraSetu. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <button className="text-slate-400 hover:text-white transition">
              <Share2 size={20} />
            </button>
            <button className="text-slate-400 hover:text-white transition">
              <Users size={20} />
            </button>
            <button className="text-slate-400 hover:text-white transition">
              <Code size={20} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

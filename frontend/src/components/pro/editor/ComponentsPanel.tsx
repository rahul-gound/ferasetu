// FeraSetu Pro Studio — Components & Templates Panel (Left Sidebar)
// =============================================================================
// Searchable component drawer organized across 6 categories.
// Supports both HTML5 drag & drop and click-to-add into active container.
// =============================================================================

import React, { useState, useMemo } from 'react';
import { SMART_COMPONENT_CATALOG } from './smartComponentCatalog';
import {
  Search,
  Layout,
  Box,
  Columns,
  Grid,
  Layers,
  Maximize2,
  Minus,
  Heading,
  AlignLeft,
  FileText,
  Image,
  Video,
  Sparkles,
  Link as LinkIcon,
  Tag,
  ShoppingBag,
  DollarSign,
  ShoppingCart,
  Receipt,
  CheckSquare,
  Edit3,
  AlignJustify,
  ChevronDown,
  MousePointer,
  Maximize,
  Folder,
  ChevronsDown,
  MoreHorizontal,
  TrendingUp,
  Table,
  MapPin,
  HelpCircle,
  Code,
  Plus,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  Layout: <Layout size={15} />,
  Box: <Box size={15} />,
  Columns: <Columns size={15} />,
  Grid: <Grid size={15} />,
  LayoutGrid: <Grid size={15} />,
  Layers: <Layers size={15} />,
  Maximize2: <Maximize2 size={15} />,
  Minus: <Minus size={15} />,
  Heading: <Heading size={15} />,
  AlignLeft: <AlignLeft size={15} />,
  FileText: <FileText size={15} />,
  Image: <Image size={15} />,
  Video: <Video size={15} />,
  Sparkles: <Sparkles size={15} />,
  Link: <LinkIcon size={15} />,
  Tag: <Tag size={15} />,
  ShoppingBag: <ShoppingBag size={15} />,
  DollarSign: <DollarSign size={15} />,
  ShoppingCart: <ShoppingCart size={15} />,
  Receipt: <Receipt size={15} />,
  CheckSquare: <CheckSquare size={15} />,
  Edit3: <Edit3 size={15} />,
  AlignJustify: <AlignJustify size={15} />,
  ChevronDown: <ChevronDown size={15} />,
  MousePointer: <MousePointer size={15} />,
  Maximize: <Maximize size={15} />,
  Folder: <Folder size={15} />,
  ChevronsDown: <ChevronsDown size={15} />,
  MoreHorizontal: <MoreHorizontal size={15} />,
  TrendingUp: <TrendingUp size={15} />,
  Table: <Table size={15} />,
  MapPin: <MapPin size={15} />,
  HelpCircle: <HelpCircle size={15} />,
  Code: <Code size={15} />,
};

interface ComponentsPanelProps {
  onAddComponent: (type: string) => void;
  onApplyTemplate?: (templateKey: string) => void;
}

export const ComponentsPanel: React.FC<ComponentsPanelProps> = ({
  onAddComponent,
  onApplyTemplate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'components' | 'templates'>('components');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const categories = [
    { key: 'layout', label: 'Layout & Structure' },
    { key: 'content', label: 'Content & Typography' },
    { key: 'commerce', label: 'Commerce & Storefront' },
    { key: 'forms', label: 'Forms & Inputs' },
    { key: 'interaction', label: 'Interaction & UI' },
    { key: 'business', label: 'Business & Trust' },
  ];

  const filteredComponents = useMemo(() => {
    const list = Object.values(SMART_COMPONENT_CATALOG).filter((c) => c.type !== 'custom_code');
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) => c.label.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
  }, [searchQuery]);

  const handleDragStart = (e: React.DragEvent, componentType: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ componentType }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-64 h-full bg-white border-r border-slate-200 flex flex-col shrink-0 select-none">
      {/* Search & Tabs Header */}
      <div className="p-3 border-b border-slate-100 space-y-2">
        <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('components')}
            className={`flex-1 py-1 rounded-md transition-colors ${
              activeTab === 'components' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Components
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex-1 py-1 rounded-md transition-colors ${
              activeTab === 'templates' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Templates
          </button>
        </div>

        {activeTab === 'components' && (
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search components..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-slate-900 outline-hidden"
            />
          </div>
        )}
      </div>

      {/* Component Library List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
        {activeTab === 'components' ? (
          categories.map((cat) => {
            const compsInCat = filteredComponents.filter((c) => c.category === cat.key);
            if (compsInCat.length === 0) return null;
            const isCollapsed = collapsedCategories[cat.key];

            return (
              <div key={cat.key} className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.key)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 py-1"
                >
                  <span>{cat.label} ({compsInCat.length})</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>

                {!isCollapsed && (
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    {compsInCat.map((comp) => (
                      <div
                        key={comp.type}
                        draggable
                        onDragStart={(e) => handleDragStart(e, comp.type)}
                        onClick={() => onAddComponent(comp.type)}
                        className="group flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/20 bg-white shadow-2xs hover:shadow-xs transition-all cursor-grab active:cursor-grabbing text-center"
                      >
                        <div className="text-slate-600 group-hover:text-indigo-600 mb-1 transition-colors">
                          {ICON_MAP[comp.icon] || <Box size={15} />}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 group-hover:text-indigo-900 line-clamp-1">
                          {comp.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* TEMPLATES TAB */
          <div className="space-y-3">
            <div className="text-[11px] text-slate-500 leading-relaxed">
              Inject complete pre-built sections and designs directly into your active page.
            </div>

            {[
              { id: 'studio', title: 'Studio Showcase', desc: 'Creative agency portfolio with manifesto and artefacts' },
              { id: 'launch', title: 'Product Launch', desc: 'Hardware specifications, countdown and pre-order' },
              { id: 'creator', title: 'Creator Vault', desc: 'Member drops, audio stream and newsletter signup' },
              { id: 'commerce_pro', title: 'Commerce Pro', desc: 'D2C catalog, wholesale inquiry and sticky cart' },
            ].map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-400 bg-white shadow-2xs space-y-2 text-left"
              >
                <div className="font-bold text-xs text-slate-900">{tmpl.title}</div>
                <p className="text-[11px] text-slate-500 leading-normal">{tmpl.desc}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Apply '${tmpl.title}' template to this page? Existing content will be replaced.`)) {
                      onApplyTemplate?.(tmpl.id);
                    }
                  }}
                  className="w-full mt-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus size={12} /> Apply Template
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

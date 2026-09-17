// FeraSetu Pro Studio — Interactive Component Renderer
// =============================================================================
// Renders PageComponentNode trees into real interactive React UI for both
// the live canvas editor and standalone responsive preview.
// Includes selection outlines, floating action toolbars, and drop targets.
// =============================================================================

import React, { useState } from 'react';
import type { PageComponentNode, ViewportBreakpoint } from './pageEditorTypes';
import { SMART_COMPONENT_CATALOG } from './smartComponentCatalog';
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  CornerLeftUp,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Code2,
  ArrowRight,
} from 'lucide-react';

interface ComponentRendererProps {
  node: PageComponentNode;
  parent?: PageComponentNode | null;
  isEditorMode?: boolean;
  selectedNodeId?: string | null;
  viewportBreakpoint?: ViewportBreakpoint;
  onSelectNode?: (nodeId: string) => void;
  onMoveUp?: (nodeId: string) => void;
  onMoveDown?: (nodeId: string) => void;
  onDuplicate?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onSelectParent?: (parentId: string) => void;
  onDropTarget?: (targetId: string, position: 'before' | 'after' | 'inside') => void;
}

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  node,
  parent = null,
  isEditorMode = true,
  selectedNodeId,
  viewportBreakpoint = 'desktop',
  onSelectNode,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onSelectParent,
  onDropTarget,
}) => {
  const [activeTabId, setActiveTabId] = useState<string>('tab1');
  const [openAccordionIdx, setOpenAccordionIdx] = useState<number | null>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const isSelected = selectedNodeId === node.id;
  const def = SMART_COMPONENT_CATALOG[node.type];
  const props = {
    ...(def?.defaultProps || {}),
    ...(node.props || {}),
    // Responsive inheritance override
    ...(node.responsive?.[viewportBreakpoint] || {}),
  };

  const handleNodeClick = (e: React.MouseEvent) => {
    if (isEditorMode) {
      e.stopPropagation();
      onSelectNode?.(node.id);
    }
  };

  // ---------------------------------------------------------------------------
  // Component Type Visual Rendering
  // ---------------------------------------------------------------------------
  const renderComponentBody = () => {
    switch (node.type) {
      // ---------------- LAYOUT ----------------
      case 'section':
        return (
          <section
            className={`w-full ${props.paddingY || 'py-12'} ${props.paddingX || 'px-4'} ${props.backgroundColor || 'transparent'} transition-all`}
            aria-label={props.ariaLabel}
          >
            <div className={`mx-auto ${props.maxWidth || 'max-w-7xl'}`}>
              {renderChildren()}
            </div>
          </section>
        );

      case 'container':
        return (
          <div className={`${props.maxWidth || 'max-w-6xl'} ${props.padding || 'p-4'} ${props.alignment || 'mx-auto'} transition-all`}>
            {renderChildren()}
          </div>
        );

      case 'row':
        return (
          <div className={`flex ${props.direction || 'flex-row'} ${props.wrap || 'flex-wrap'} ${props.gap || 'gap-6'} ${props.justify || 'justify-start'} ${props.align || 'items-center'} w-full`}>
            {renderChildren()}
          </div>
        );

      case 'columns': {
        const count = Number(props.count) || 2;
        const colClass = count === 4 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4' : count === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2';
        return (
          <div className={`grid ${colClass} ${props.gap || 'gap-6'} w-full`}>
            {renderChildren()}
          </div>
        );
      }

      case 'grid':
        return (
          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${props.gap || 'gap-6'} w-full`}>
            {renderChildren()}
          </div>
        );

      case 'stack':
        return (
          <div className={`flex flex-col ${props.gap || 'gap-4'} w-full`}>
            {renderChildren()}
          </div>
        );

      case 'spacer':
        return (
          <div
            style={{
              height: viewportBreakpoint === 'mobile' ? props.heightMobile || '24px' : props.heightDesktop || '48px',
            }}
            className="w-full bg-slate-100/30 border border-dashed border-slate-200/50 rounded-sm flex items-center justify-center text-[10px] text-slate-400 select-none"
          >
            {isEditorMode ? `Spacer (${props.heightDesktop || '48px'})` : null}
          </div>
        );

      case 'divider':
        return <hr className={`border-slate-200 ${props.marginY || 'my-6'} w-full`} />;

      // ---------------- CONTENT ----------------
      case 'heading': {
        const Tag = (props.level || 'h2') as keyof JSX.IntrinsicElements;
        return (
          <Tag className={`${props.fontSize || 'text-3xl'} ${props.fontWeight || 'font-bold'} ${props.color || 'text-slate-900'} ${props.align || 'text-left'} leading-tight tracking-tight`}>
            {props.text || 'Heading Text'}
          </Tag>
        );
      }

      case 'text':
        return (
          <p className={`${props.fontSize || 'text-base'} ${props.color || 'text-slate-600'} ${props.lineHeight || 'leading-relaxed'} ${props.align || 'text-left'}`}>
            {props.content || 'Paragraph text...'}
          </p>
        );

      case 'rich_text':
        return (
          <div
            className="prose max-w-none text-slate-700"
            dangerouslySetInnerHTML={{ __html: props.htmlContent || '<p>Rich text content</p>' }}
          />
        );

      case 'image':
        return (
          <div className="w-full overflow-hidden">
            <img
              src={props.src}
              alt={props.alt || 'Visual'}
              className={`w-full ${props.borderRadius || 'rounded-xl'} ${props.shadow || 'shadow-sm'} object-cover aspect-video`}
            />
          </div>
        );

      case 'video':
        return (
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-sm">
            <iframe
              src={props.url?.replace('watch?v=', 'embed/')}
              title="Video"
              className="w-full h-full border-0"
              allowFullScreen
            />
          </div>
        );

      case 'icon':
        return (
          <div className="inline-flex items-center justify-center">
            <Sparkles size={Number(props.size) || 24} className={props.color || 'text-indigo-600'} />
          </div>
        );

      case 'link':
        return (
          <a
            href={props.href || '#'}
            onClick={(e) => isEditorMode && e.preventDefault()}
            className={`${props.color || 'text-indigo-600'} font-medium hover:underline inline-flex items-center gap-1`}
          >
            {props.text || 'Link →'}
          </a>
        );

      case 'badge':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold ${props.size || 'text-xs'} ${props.color || 'bg-indigo-50 text-indigo-700'}`}>
            {props.text || 'Badge'}
          </span>
        );

      // ---------------- COMMERCE ----------------
      case 'product_card':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow">
            <div className="aspect-square w-full bg-slate-100 relative overflow-hidden">
              <img src={props.image} alt={props.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-4 space-y-2">
              <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">{props.title}</h4>
              {props.showPrice && <div className="font-bold text-slate-900 text-sm">{props.price}</div>}
              <button
                type="button"
                onClick={(e) => {
                  if (!isEditorMode) alert(`Added ${props.title} to bag!`);
                }}
                className="w-full mt-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <ShoppingBag size={13} /> {props.ctaText || 'Add to Cart'}
              </button>
            </div>
          </div>
        );

      case 'product_grid':
        return (
          <div className="space-y-4 w-full">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catalog Showcase</div>
              <span className="text-xs text-indigo-600 font-medium">Viewing {props.limit || 6} items</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="aspect-square rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-mono">
                    Product #{i}
                  </div>
                  <div className="font-semibold text-xs text-slate-900">Atelier Ceramic Vase #{i}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">₹{1999 + i * 500}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">In Stock</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'product_image':
        return (
          <div className="relative rounded-xl overflow-hidden bg-slate-100 aspect-square">
            <img src={props.src} alt="Product visual" className="w-full h-full object-cover" />
            {props.badge && (
              <span className="absolute top-3 left-3 bg-slate-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                {props.badge}
              </span>
            )}
          </div>
        );

      case 'price':
        return (
          <div className="flex items-baseline gap-2">
            <span className={props.fontSize || 'text-2xl font-bold text-slate-900'}>
              {props.currencySymbol || '₹'}{props.amount || '1,999'}
            </span>
            {props.comparePrice && (
              <span className="text-sm line-through text-slate-400">
                {props.currencySymbol || '₹'}{props.comparePrice}
              </span>
            )}
          </div>
        );

      case 'add_to_cart':
        return (
          <button
            type="button"
            onClick={() => !isEditorMode && alert('Added item to cart')}
            className={`py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 ${props.fullWidth ? 'w-full' : 'w-auto'}`}
          >
            <ShoppingBag size={14} /> {props.buttonText || 'Add to Bag'}
          </button>
        );

      case 'cart_button':
        return (
          <button
            type="button"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 relative shadow-xs"
          >
            <ShoppingBag size={18} />
            {props.showItemCount && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                2
              </span>
            )}
          </button>
        );

      case 'cart_summary':
        return (
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
            <h5 className="font-bold text-sm text-slate-900">Order Summary</h5>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">₹4,998</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Estimated Shipping</span>
              <span className="text-emerald-700 font-semibold">Free</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
              <span>Total</span>
              <span>₹4,998</span>
            </div>
            <button
              type="button"
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-colors mt-2"
            >
              {props.checkoutButtonText || 'Proceed to Checkout'}
            </button>
          </div>
        );

      // ---------------- FORMS ----------------
      case 'form':
        return (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isEditorMode) alert(props.successMessage || 'Form submitted!');
            }}
            className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4"
          >
            {renderChildren()}
          </form>
        );

      case 'input':
        return (
          <div className="space-y-1 w-full text-left">
            <label className="text-xs font-semibold text-slate-700 block">
              {props.label || 'Input'}
              {props.required && <span className="text-rose-500 ml-1">*</span>}
            </label>
            <input
              type={props.inputType || 'text'}
              placeholder={props.placeholder || ''}
              disabled={isEditorMode}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-xs focus:ring-2 focus:ring-slate-900 outline-hidden"
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-1 w-full text-left">
            <label className="text-xs font-semibold text-slate-700 block">
              {props.label || 'Textarea'}
              {props.required && <span className="text-rose-500 ml-1">*</span>}
            </label>
            <textarea
              rows={props.rows || 4}
              placeholder={props.placeholder || ''}
              disabled={isEditorMode}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-xs focus:ring-2 focus:ring-slate-900 outline-hidden resize-none"
            />
          </div>
        );

      case 'select':
        return (
          <div className="space-y-1 w-full text-left">
            <label className="text-xs font-semibold text-slate-700 block">{props.label || 'Select'}</label>
            <select
              disabled={isEditorMode}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-xs outline-hidden"
            >
              {(props.options || []).map((o: any, idx: number) => (
                <option key={idx} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2 text-left">
            <input
              type="checkbox"
              defaultChecked={props.checked}
              disabled={isEditorMode}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-600 font-medium">{props.label || 'Checkbox option'}</span>
          </div>
        );

      case 'button':
        return (
          <button
            type="button"
            onClick={(e) => {
              if (isEditorMode) return;
              if (props.action === 'external_url' && props.target) {
                window.open(props.target, '_blank');
              } else if (props.action === 'navigate') {
                alert(`Navigating to ${props.target || '/'}`);
              } else {
                alert(`Triggered action: ${props.action || 'click'}`);
              }
            }}
            className={`px-5 py-2.5 rounded-xl font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors shadow-xs ${
              props.variant === 'primary' ? 'bg-slate-900 text-white hover:bg-slate-800' :
              props.variant === 'rose' ? 'bg-rose-600 text-white hover:bg-rose-500' :
              props.variant === 'secondary' ? 'bg-slate-100 text-slate-800 hover:bg-slate-200' :
              props.variant === 'outline' ? 'border border-slate-300 text-slate-700 hover:bg-slate-50' :
              'text-slate-600 hover:text-slate-900'
            } ${props.fullWidth ? 'w-full' : 'w-auto'}`}
          >
            <span>{props.text || 'Button'}</span>
            <ArrowRight size={13} />
          </button>
        );

      // ---------------- INTERACTION ----------------
      case 'modal':
        return (
          <div className="p-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 space-y-2 text-left">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-800">
              <span>Modal Dialog Container: {props.title || 'Dialog'}</span>
              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">id: {props.modalId}</span>
            </div>
            <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-xs">
              {renderChildren()}
            </div>
          </div>
        );

      case 'tabs':
        return (
          <div className="w-full space-y-4">
            <div className="flex border-b border-slate-200 space-x-4">
              {(props.tabList || []).map((t: any) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTabId(t.id)}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-colors ${
                    activeTabId === t.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
              Active Tab Content ({activeTabId})
              {renderChildren()}
            </div>
          </div>
        );

      case 'accordion':
        return (
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden w-full text-left">
            {(props.items || []).map((item: any, idx: number) => {
              const isOpen = openAccordionIdx === idx;
              return (
                <div key={idx} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => setOpenAccordionIdx(isOpen ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between text-xs font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    <span>{item.title}</span>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-xs text-slate-600 leading-relaxed">
                      {item.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'pagination':
        return (
          <div className="flex items-center justify-center space-x-1 w-full py-3">
            {[1, 2, 3, 4, 5].map((page) => (
              <button
                key={page}
                type="button"
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                  page === 1 ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        );

      // ---------------- BUSINESS ----------------
      case 'stats':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full py-4">
            {(props.items || []).map((st: any, idx: number) => (
              <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-center">
                <div className="text-3xl font-extrabold text-slate-900">{st.value}</div>
                <div className="text-xs text-slate-500 font-medium mt-1">{st.label}</div>
              </div>
            ))}
          </div>
        );

      case 'table':
        return (
          <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  {(props.headers || []).map((h: string, i: number) => (
                    <th key={i} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(props.rows || []).map((row: string[], rIdx: number) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50">
                    {row.map((cell: string, cIdx: number) => (
                      <td key={cIdx} className="px-4 py-3">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'map':
        return (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-left">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900">{props.locationName || 'Studio Location'}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{props.address || 'Address details'}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <ExternalLink size={16} />
              </div>
            </div>
            <div className="w-full h-40 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs font-mono">
              [Embedded Interactive Map Preview]
            </div>
          </div>
        );

      case 'faq':
        return (
          <div className="w-full space-y-4 text-left">
            {props.heading && <h3 className="text-2xl font-bold text-slate-900">{props.heading}</h3>}
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden">
              {(props.questions || []).map((faq: any, idx: number) => (
                <div key={idx} className="p-4 space-y-1">
                  <div className="text-xs font-bold text-slate-900">{faq.q}</div>
                  <div className="text-xs text-slate-600 leading-relaxed">{faq.a}</div>
                </div>
              ))}
            </div>
          </div>
        );

      // ---------------- CUSTOM CODE BLOCK (Preserved Verbatim) ----------------
      case 'custom_code':
        return (
          <div className="w-full rounded-xl border border-amber-300 bg-amber-50/40 p-4 text-left space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
              <span className="flex items-center gap-1.5">
                <Code2 size={14} /> Custom Code Region ({props.language || 'jsx'})
              </span>
              <span className="text-[10px] bg-amber-100 px-2 py-0.5 rounded font-mono text-amber-900 border border-amber-200">
                Preserved Verbatim
              </span>
            </div>
            <pre className="p-3 bg-slate-900 text-amber-200 rounded-lg text-xs font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
              {props.code || '// Custom code preserved here'}
            </pre>
          </div>
        );

      default:
        return (
          <div className="p-4 border border-dashed border-slate-300 rounded-lg text-xs text-slate-400">
            Unknown Component ({node.type})
          </div>
        );
    }
  };

  // ---------------------------------------------------------------------------
  // Children Recursive Rendering
  // ---------------------------------------------------------------------------
  const renderChildren = () => {
    if (!Array.isArray(node.children) || node.children.length === 0) {
      if (isEditorMode && def?.canHaveChildren) {
        return (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode?.(node.id);
            }}
            className="p-6 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl text-center text-xs text-slate-400 bg-slate-50/50 transition-colors my-2 select-none"
          >
            Empty {def.label} — Drag or insert components here
          </div>
        );
      }
      return null;
    }

    return (
      <div className="w-full space-y-3">
        {node.children.map((child) => (
          <ComponentRenderer
            key={child.id}
            node={child}
            parent={node}
            isEditorMode={isEditorMode}
            selectedNodeId={selectedNodeId}
            viewportBreakpoint={viewportBreakpoint}
            onSelectNode={onSelectNode}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onSelectParent={onSelectParent}
            onDropTarget={onDropTarget}
          />
        ))}
      </div>
    );
  };

  if (!isEditorMode) {
    return <div data-node-id={node.id}>{renderComponentBody()}</div>;
  }

  // ---------------------------------------------------------------------------
  // Editor Canvas Wrapper with Highlights & Floating Toolbar
  // ---------------------------------------------------------------------------
  return (
    <div
      data-node-id={node.id}
      onClick={handleNodeClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative group transition-all duration-150 ${
        isSelected
          ? 'ring-2 ring-indigo-600 ring-offset-2 z-20 shadow-xs'
          : isHovered
          ? 'ring-1 ring-indigo-300 ring-offset-1'
          : ''
      }`}
    >
      {/* Selection Label & Action Toolbar */}
      {isSelected && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute -top-7 left-0 z-30 flex items-center gap-1 bg-indigo-600 text-white text-[11px] font-semibold py-0.5 px-2 rounded-t-md shadow-md select-none"
        >
          <span>{def?.label || node.type}</span>

          {parent && (
            <button
              type="button"
              onClick={() => onSelectParent?.(parent.id)}
              className="p-1 hover:bg-white/20 rounded transition-colors ml-1"
              title={`Select parent: ${parent.type}`}
            >
              <CornerLeftUp size={11} />
            </button>
          )}

          <div className="w-px h-3 bg-indigo-400 mx-0.5" />

          <button
            type="button"
            onClick={() => onMoveUp?.(node.id)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Move Up"
          >
            <ChevronUp size={12} />
          </button>

          <button
            type="button"
            onClick={() => onMoveDown?.(node.id)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Move Down"
          >
            <ChevronDown size={12} />
          </button>

          <button
            type="button"
            onClick={() => onDuplicate?.(node.id)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Duplicate"
          >
            <Copy size={11} />
          </button>

          <button
            type="button"
            onClick={() => onDelete?.(node.id)}
            className="p-1 hover:bg-rose-500 rounded transition-colors text-rose-200 hover:text-white"
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      {renderComponentBody()}
    </div>
  );
};

// FeraSetu Pro Studio — Template to PageComponentNode Tree Adapter
// =============================================================================
// Converts existing Pro Templates (Studio, Launch, Creator, Commerce Pro)
// and legacy sections into fully editable, draggable PageComponentNode trees.
// Strictly produces validated schemaVersion: 1 documents.
// =============================================================================

import {
  SCHEMA_VERSION,
  PAGE_STATES,
  generateNodeId,
  validatePageDocument
} from './pageModel.js';
import { PRO_TEMPLATES } from '../templates/proTemplates.js';

/**
 * Converts a template page definition into a structured PageComponentNode tree
 */
export function convertTemplatePageToDocument(templateKey, pageSlug = 'home') {
  const template = PRO_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Unknown template '${templateKey}'`);
  }

  const tmplPage = (template.pages || []).find(p => p.slug === pageSlug) || template.pages?.[0];
  if (!tmplPage) {
    throw new Error(`Page '${pageSlug}' not found in template '${templateKey}'`);
  }

  const nodes = [];
  const content = tmplPage.content || {};

  // 1. Convert Hero Block if present
  if (content.hero) {
    const hero = content.hero;
    const heroSectionId = generateNodeId('sec_hero');
    const heroContainerId = generateNodeId('cnt_hero');

    const heroChildren = [
      {
        id: generateNodeId('hdg_hero'),
        type: 'heading',
        version: 1,
        props: {
          text: hero.title || 'Welcome',
          level: 'h1',
          fontSize: 'text-5xl',
          fontWeight: 'font-extrabold',
          color: 'text-slate-900',
          align: 'text-center',
        },
      },
    ];

    if (hero.subtitle) {
      heroChildren.push({
        id: generateNodeId('txt_hero'),
        type: 'text',
        version: 1,
        props: {
          content: hero.subtitle,
          fontSize: 'text-lg',
          color: 'text-slate-600',
          align: 'text-center',
        },
      });
    }

    if (hero.ctaText) {
      heroChildren.push({
        id: generateNodeId('btn_hero'),
        type: 'button',
        version: 1,
        props: {
          text: hero.ctaText,
          action: 'navigate',
          target: hero.ctaLink || '/work',
          variant: 'primary',
          size: 'lg',
        },
      });
    }

    nodes.push({
      id: heroSectionId,
      type: 'section',
      version: 1,
      props: {
        paddingY: 'py-20',
        paddingX: 'px-4',
        backgroundColor: 'bg-gradient-to-b from-white to-slate-50',
        maxWidth: 'max-w-7xl',
      },
      children: [
        {
          id: heroContainerId,
          type: 'container',
          version: 1,
          props: {
            maxWidth: 'max-w-4xl',
            padding: 'p-4',
            alignment: 'mx-auto flex flex-col items-center text-center gap-6',
          },
          children: heroChildren,
        },
      ],
    });
  }

  // 2. Convert Sections Array
  if (Array.isArray(content.sections)) {
    for (let i = 0; i < content.sections.length; i++) {
      const sec = content.sections[i];
      const sectionNode = convertTemplateSectionToNode(sec, i);
      if (sectionNode) {
        nodes.push(sectionNode);
      }
    }
  }

  const doc = {
    schemaVersion: SCHEMA_VERSION,
    state: PAGE_STATES.VISUAL_NATIVE,
    title: tmplPage.title || 'Template Page',
    customCss: '',
    sourceCode: '',
    nodes,
  };

  const validation = validatePageDocument(doc);
  if (!validation.valid) {
    throw new Error(`Template conversion produced invalid document: ${validation.errors.join(', ')}`);
  }

  return doc;
}

function convertTemplateSectionToNode(sec, index) {
  const secId = generateNodeId(`sec_${index}`);
  const cntId = generateNodeId(`cnt_${index}`);

  const secType = sec.type || 'generic';

  // Product Grid
  if (secType === 'product_grid' || secType === 'curated_work_grid' || secType === 'portfolio_index') {
    return {
      id: secId,
      type: 'section',
      version: 1,
      props: { paddingY: 'py-16', paddingX: 'px-4', maxWidth: 'max-w-7xl' },
      children: [
        {
          id: cntId,
          type: 'container',
          version: 1,
          props: { maxWidth: 'max-w-6xl', padding: 'p-4' },
          children: [
            {
              id: generateNodeId('hdg_grid'),
              type: 'heading',
              version: 1,
              props: {
                text: sec.heading || (secType === 'product_grid' ? 'Featured Collection' : 'Selected Works'),
                level: 'h2',
                fontSize: 'text-3xl',
                fontWeight: 'font-bold',
                color: 'text-slate-900',
              },
            },
            {
              id: generateNodeId('grid_comp'),
              type: 'product_grid',
              version: 1,
              props: {
                dataSource: sec.bound_function || 'catalog_all',
                limit: sec.limit || 6,
                colsDesktop: 3,
                colsMobile: 1,
                showPrice: true,
                showAddToCart: true,
              },
            },
          ],
        },
      ],
    };
  }

  // Editorial Manifesto / Disciplines
  if (secType === 'editorial_manifesto') {
    return {
      id: secId,
      type: 'section',
      version: 1,
      props: { paddingY: 'py-16', paddingX: 'px-4', backgroundColor: 'bg-slate-900', maxWidth: 'max-w-7xl' },
      children: [
        {
          id: cntId,
          type: 'container',
          version: 1,
          props: { maxWidth: 'max-w-4xl', padding: 'p-4', alignment: 'mx-auto' },
          children: [
            {
              id: generateNodeId('hdg_man'),
              type: 'heading',
              version: 1,
              props: { text: sec.heading || 'Disciplines', level: 'h2', color: 'text-white' },
            },
            {
              id: generateNodeId('stats_man'),
              type: 'stats',
              version: 1,
              props: {
                items: (sec.items || []).map(item => ({ value: '•', label: item })),
              },
            },
          ],
        },
      ],
    };
  }

  // Inquiry Banner
  if (secType === 'inquiry_banner') {
    return {
      id: secId,
      type: 'section',
      version: 1,
      props: { paddingY: 'py-16', paddingX: 'px-4', backgroundColor: 'bg-indigo-50', maxWidth: 'max-w-7xl' },
      children: [
        {
          id: cntId,
          type: 'container',
          version: 1,
          props: { maxWidth: 'max-w-3xl', padding: 'p-4', alignment: 'mx-auto text-center' },
          children: [
            {
              id: generateNodeId('hdg_inq'),
              type: 'heading',
              version: 1,
              props: { text: sec.heading || 'Initiate an Engagement', level: 'h2', align: 'text-center' },
            },
            {
              id: generateNodeId('btn_inq'),
              type: 'button',
              version: 1,
              props: {
                text: sec.buttonText || 'Contact Us',
                action: 'navigate',
                target: sec.buttonLink || '/contact',
                variant: 'primary',
                size: 'md',
              },
            },
          ],
        },
      ],
    };
  }

  // Rich Text / About
  if (secType === 'rich_text') {
    return {
      id: secId,
      type: 'section',
      version: 1,
      props: { paddingY: 'py-12', paddingX: 'px-4', maxWidth: 'max-w-7xl' },
      children: [
        {
          id: cntId,
          type: 'container',
          version: 1,
          props: { maxWidth: 'max-w-3xl', padding: 'p-4', alignment: 'mx-auto' },
          children: [
            {
              id: generateNodeId('hdg_rt'),
              type: 'heading',
              version: 1,
              props: { text: sec.title || 'About', level: 'h2' },
            },
            {
              id: generateNodeId('txt_rt'),
              type: 'text',
              version: 1,
              props: { content: sec.body || '', fontSize: 'text-base' },
            },
          ],
        },
      ],
    };
  }

  // Fallback Section
  return {
    id: secId,
    type: 'section',
    version: 1,
    props: { paddingY: 'py-12', paddingX: 'px-4', maxWidth: 'max-w-7xl' },
    children: [
      {
        id: cntId,
        type: 'container',
        version: 1,
        props: { maxWidth: 'max-w-6xl', padding: 'p-4' },
        children: [
          {
            id: generateNodeId('hdg_gen'),
            type: 'heading',
            version: 1,
            props: { text: sec.heading || sec.title || `Section ${index + 1}`, level: 'h3' },
          },
        ],
      },
    ],
  };
}

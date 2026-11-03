/**
 * Runtime module for Node.js test execution of CSV parsing logic.
 */
export function parseRawCsvText(text) {
  const clean = text.replace(/^\uFEFF/, '');
  if (!clean.trim()) return [];

  const firstLine = clean.split(/\r\n|\n|\r/)[0] || '';
  let delimiter = ',';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows.filter(r => r.some(c => c && c.trim().length > 0));
}

export function cleanNumber(val, fallback = 0) {
  if (val === undefined || val === null || val === '') return fallback;
  const str = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(str);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function stripHtml(html) {
  if (!html) return '';
  const withBreaks = html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n');
  const text = withBreaks.replace(/<[^>]*>/g, ' ');
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHeader(h) {
  return (h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function normalizeCategory(rawCat) {
  if (!rawCat || !rawCat.trim()) return 'Other';
  const clean = rawCat.trim();
  const lower = clean.toLowerCase();

  const STANDARD_CATEGORIES = [
    'Grocery',
    'Fashion',
    'Electronics',
    'Food & Beverages',
    'Medical',
    'Home & Kitchen',
    'Sports',
    'Beauty',
    'Books',
    'Other'
  ];

  const matchedExact = STANDARD_CATEGORIES.find(c => c.toLowerCase() === lower);
  if (matchedExact) return matchedExact;

  if (lower.includes('beverag') || lower.includes('drink') || lower.includes('tea') || lower.includes('coffee') || lower.includes('juice')) {
    return 'Food & Beverages';
  }
  if (lower.includes('cloth') || lower.includes('apparel') || lower.includes('fashion') || lower.includes('wear') || lower.includes('shirt') || lower.includes('dress') || lower.includes('top')) {
    return 'Fashion';
  }
  if (lower.includes('elect') || lower.includes('gadget') || lower.includes('phone') || lower.includes('audio') || lower.includes('comput')) {
    return 'Electronics';
  }
  if (lower.includes('groc') || lower.includes('food') || lower.includes('snack') || lower.includes('spice') || lower.includes('grain')) {
    return 'Grocery';
  }
  if (lower.includes('medic') || lower.includes('health') || lower.includes('pharma') || lower.includes('wellness')) {
    return 'Medical';
  }
  if (lower.includes('home') || lower.includes('kitchen') || lower.includes('cook') || lower.includes('decor')) {
    return 'Home & Kitchen';
  }
  if (lower.includes('sport') || lower.includes('gym') || lower.includes('fitness')) {
    return 'Sports';
  }
  if (lower.includes('beauty') || lower.includes('cosmetic') || lower.includes('skin') || lower.includes('hair')) {
    return 'Beauty';
  }
  if (lower.includes('book') || lower.includes('station')) {
    return 'Books';
  }

  return clean;
}

export function parseInventoryCsv(csvText) {
  const rows = parseRawCsvText(csvText);
  if (rows.length === 0) {
    return {
      products: [],
      totalRows: 0,
      detectedFormat: 'generic',
      formatLabel: 'Empty CSV',
      summary: { totalProducts: 0, validCount: 0, warningCount: 0, totalVariants: 0 },
      errors: ['The selected CSV file appears to be empty.'],
    };
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders.map(normalizeHeader);
  const dataRows = rows.slice(1);

  const hasHandle = headers.includes('handle');
  const hasTitle = headers.includes('title');
  const hasVariantPrice = headers.includes('variantprice');
  const hasBodyHtml = headers.includes('bodyhtml') || headers.includes('body');
  const hasOption1Name = headers.includes('option1name');

  const isShopify = hasHandle && (hasTitle || hasVariantPrice || hasOption1Name || hasBodyHtml);
  const isWooCommerce = headers.includes('regularprice') || headers.includes('shortdescription') || headers.includes('taxstatus');
  const isFeraSetu = headers.includes('id') && headers.includes('productname') && headers.includes('saleprice');

  let detectedFormat = 'generic';
  let formatLabel = 'Standard Retail CSV';

  if (isShopify) {
    detectedFormat = 'shopify';
    formatLabel = 'Shopify Product Catalog';
  } else if (isWooCommerce) {
    detectedFormat = 'woocommerce';
    formatLabel = 'WooCommerce Product Export';
  } else if (isFeraSetu) {
    detectedFormat = 'ferasetu';
    formatLabel = 'FeraSetu Catalog Backup';
  }

  if (isShopify) {
    return parseShopifyCsv(rawHeaders, headers, dataRows);
  }

  return parseGenericOrStandardCsv(rawHeaders, headers, dataRows, detectedFormat, formatLabel);
}

function parseShopifyCsv(rawHeaders, headers, dataRows) {
  const col = (name) => headers.indexOf(normalizeHeader(name));

  const handleIdx = col('handle');
  const titleIdx = col('title');
  const bodyIdx = col('body (html)') !== -1 ? col('body (html)') : col('body');
  const typeIdx = col('type') !== -1 ? col('type') : col('product category');
  const publishedIdx = col('published');
  const statusIdx = col('status');
  const opt1NameIdx = col('option1 name');
  const opt1ValIdx = col('option1 value');
  const opt2NameIdx = col('option2 name');
  const opt2ValIdx = col('option2 value');
  const opt3NameIdx = col('option3 name');
  const opt3ValIdx = col('option3 value');
  const varSkuIdx = col('variant sku');
  const varQtyIdx = col('variant inventory qty');
  const varPriceIdx = col('variant price');
  const varCompareIdx = col('variant compare at price');
  const varBarcodeIdx = col('variant barcode');
  const imgIdx = col('image src');
  const costIdx = col('cost per item');

  const handleMap = new Map();
  dataRows.forEach(row => {
    const rawHandle = handleIdx !== -1 && row[handleIdx] ? row[handleIdx].trim() : '';
    const rawTitle = titleIdx !== -1 && row[titleIdx] ? row[titleIdx].trim() : '';
    const key = rawHandle || rawTitle || `product_${Math.random()}`;
    if (!handleMap.has(key)) {
      handleMap.set(key, []);
    }
    handleMap.get(key).push(row);
  });

  const products = [];
  let totalVariants = 0;

  handleMap.forEach((rows, handleKey) => {
    const firstRow = rows[0];

    let name = '';
    for (const r of rows) {
      if (titleIdx !== -1 && r[titleIdx]?.trim()) {
        name = r[titleIdx].trim();
        break;
      }
    }
    if (!name) {
      name = handleKey
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    }

    let rawDesc = '';
    for (const r of rows) {
      if (bodyIdx !== -1 && r[bodyIdx]?.trim()) {
        rawDesc = r[bodyIdx].trim();
        break;
      }
    }
    const description = stripHtml(rawDesc);

    let rawCategory = '';
    for (const r of rows) {
      if (typeIdx !== -1 && r[typeIdx]?.trim()) {
        rawCategory = r[typeIdx].trim();
        break;
      }
    }
    const category = normalizeCategory(rawCategory);

    let imageUrl = '';
    for (const r of rows) {
      if (imgIdx !== -1 && r[imgIdx]?.trim() && r[imgIdx].startsWith('http')) {
        imageUrl = r[imgIdx].trim();
        break;
      }
    }

    let status = 'active';
    for (const r of rows) {
      if (statusIdx !== -1 && r[statusIdx]?.trim()) {
        const s = r[statusIdx].trim().toLowerCase();
        if (s === 'draft') status = 'draft';
        else if (s === 'archived') status = 'archived';
        break;
      }
      if (publishedIdx !== -1 && r[publishedIdx]?.trim()) {
        const p = r[publishedIdx].trim().toLowerCase();
        if (p === 'false' || p === '0') status = 'draft';
        break;
      }
    }

    const optNames = [];
    if (opt1NameIdx !== -1 && firstRow[opt1NameIdx]?.trim() && firstRow[opt1NameIdx].trim().toLowerCase() !== 'title') {
      optNames.push(firstRow[opt1NameIdx].trim());
    }
    if (opt2NameIdx !== -1 && firstRow[opt2NameIdx]?.trim()) {
      optNames.push(firstRow[opt2NameIdx].trim());
    }
    if (opt3NameIdx !== -1 && firstRow[opt3NameIdx]?.trim()) {
      optNames.push(firstRow[opt3NameIdx].trim());
    }

    const variants = [];
    const optionValuesMap = {};
    optNames.forEach(n => { optionValuesMap[n] = new Set(); });

    let totalStock = 0;
    let basePrice = 0;
    let baseSalePrice = null;
    let baseCostPrice = null;
    let baseSku = '';
    let baseBarcode = '';

    rows.forEach((r, idx) => {
      const vPrice = varPriceIdx !== -1 ? cleanNumber(r[varPriceIdx]) : 0;
      const vCompare = varCompareIdx !== -1 && r[varCompareIdx]?.trim() ? cleanNumber(r[varCompareIdx]) : null;
      const vCost = costIdx !== -1 && r[costIdx]?.trim() ? cleanNumber(r[costIdx]) : null;
      const vQty = varQtyIdx !== -1 && r[varQtyIdx]?.trim() ? Math.max(0, Math.trunc(cleanNumber(r[varQtyIdx]))) : 0;
      const vSku = varSkuIdx !== -1 && r[varSkuIdx] ? r[varSkuIdx].trim() : '';
      const vBarcode = varBarcodeIdx !== -1 && r[varBarcodeIdx] ? r[varBarcodeIdx].trim() : '';

      totalStock += vQty;

      if (idx === 0) {
        basePrice = vPrice;
        baseSalePrice = vCompare;
        baseCostPrice = vCost;
        baseSku = vSku;
        baseBarcode = vBarcode;
      }

      const optionValues = {};
      const valParts = [];

      if (optNames[0] && opt1ValIdx !== -1 && r[opt1ValIdx]?.trim()) {
        const val = r[opt1ValIdx].trim();
        optionValues[optNames[0]] = val;
        optionValuesMap[optNames[0]]?.add(val);
        valParts.push(val);
      }
      if (optNames[1] && opt2ValIdx !== -1 && r[opt2ValIdx]?.trim()) {
        const val = r[opt2ValIdx].trim();
        optionValues[optNames[1]] = val;
        optionValuesMap[optNames[1]]?.add(val);
        valParts.push(val);
      }
      if (optNames[2] && opt3ValIdx !== -1 && r[opt3ValIdx]?.trim()) {
        const val = r[opt3ValIdx].trim();
        optionValues[optNames[2]] = val;
        optionValuesMap[optNames[2]]?.add(val);
        valParts.push(val);
      }

      const variantTitle = valParts.join(' / ') || `Variant ${idx + 1}`;

      if (optNames.length > 0 || rows.length > 1) {
        variants.push({
          title: variantTitle,
          price: vPrice,
          compare_at_price: vCompare,
          cost_price: vCost,
          sku: vSku,
          barcode: vBarcode,
          status: 'active',
          stock_quantity: vQty,
          option_values: optionValues,
        });
      }
    });

    const parsedOptions = optNames
      .filter(n => optionValuesMap[n] && optionValuesMap[n].size > 0)
      .map(n => ({
        name: n,
        values: Array.from(optionValuesMap[n] || []),
      }));

    const warnings = [];
    if (basePrice <= 0 && variants.length === 0) warnings.push('Price is 0.00');
    if (!imageUrl) warnings.push('No image attached');

    totalVariants += variants.length;

    products.push({
      tempId: `import_${Math.random().toString(36).substring(2, 9)}`,
      name,
      description,
      category,
      price: basePrice,
      sale_price: baseSalePrice,
      cost_price: baseCostPrice,
      stock_quantity: totalStock,
      sku: baseSku,
      barcode: baseBarcode,
      image_url: imageUrl,
      is_active: status === 'active',
      status,
      options: parsedOptions,
      variants,
      sourceFormat: 'shopify',
      warnings,
      selectedForImport: true,
    });
  });

  const validCount = products.filter(p => p.name && p.price >= 0).length;
  const warningCount = products.filter(p => p.warnings.length > 0).length;

  return {
    products,
    totalRows: dataRows.length,
    detectedFormat: 'shopify',
    formatLabel: 'Shopify Product Catalog',
    summary: {
      totalProducts: products.length,
      validCount,
      warningCount,
      totalVariants,
    },
    errors: [],
  };
}

function parseGenericOrStandardCsv(rawHeaders, headers, dataRows, detectedFormat, formatLabel) {
  const findCol = (candidates) => {
    for (const cand of candidates) {
      const target = normalizeHeader(cand);
      const idx = headers.indexOf(target);
      if (idx !== -1) return idx;
    }
    for (const cand of candidates) {
      const target = normalizeHeader(cand);
      const idx = headers.findIndex(h => h.includes(target));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameIdx = findCol(['product name', 'item name', 'name', 'title', 'product']);
  const priceIdx = findCol(['price', 'regular price', 'selling price', 'mrp', 'rate', 'unit price']);
  const salePriceIdx = findCol(['sale price', 'discounted price', 'offer price', 'compare at price']);
  const costPriceIdx = findCol(['cost price', 'cost', 'cost per item', 'purchase price', 'buying price']);
  const stockIdx = findCol(['stock quantity', 'stock', 'inventory', 'quantity', 'qty', 'count']);
  const categoryIdx = findCol(['category', 'product category', 'type', 'department', 'collection']);
  const descIdx = findCol(['description', 'product description', 'body', 'details', 'short description']);
  const skuIdx = findCol(['sku', 'product sku', 'item code', 'code', 'variant sku']);
  const barcodeIdx = findCol(['barcode', 'upc', 'ean', 'isbn']);
  const imageIdx = findCol(['image url', 'image', 'image src', 'photo', 'picture']);
  const statusIdx = findCol(['status', 'state']);

  if (nameIdx === -1 && priceIdx === -1) {
    return {
      products: [],
      totalRows: dataRows.length,
      detectedFormat,
      formatLabel,
      summary: { totalProducts: 0, validCount: 0, warningCount: 0, totalVariants: 0 },
      errors: [
        'Could not detect standard product columns. Ensure your CSV has at least "Name" and "Price" columns.',
      ],
    };
  }

  const products = [];

  dataRows.forEach((row, idx) => {
    const rawName = nameIdx !== -1 && row[nameIdx] ? row[nameIdx].trim() : '';
    if (!rawName) return;

    const price = priceIdx !== -1 ? cleanNumber(row[priceIdx]) : 0;
    const salePrice = salePriceIdx !== -1 && row[salePriceIdx]?.trim() ? cleanNumber(row[salePriceIdx]) : null;
    const costPrice = costPriceIdx !== -1 && row[costPriceIdx]?.trim() ? cleanNumber(row[costPriceIdx]) : null;
    const stock = stockIdx !== -1 && row[stockIdx]?.trim() ? Math.max(0, Math.trunc(cleanNumber(row[stockIdx]))) : 0;
    const rawCategory = categoryIdx !== -1 && row[categoryIdx] ? row[categoryIdx].trim() : 'Other';
    const category = normalizeCategory(rawCategory);
    const description = descIdx !== -1 && row[descIdx] ? stripHtml(row[descIdx]) : '';
    const sku = skuIdx !== -1 && row[skuIdx] ? row[skuIdx].trim() : '';
    const barcode = barcodeIdx !== -1 && row[barcodeIdx] ? row[barcodeIdx].trim() : '';
    const imageUrl = imageIdx !== -1 && row[imageIdx] ? row[imageIdx].trim() : '';

    let status = 'active';
    if (statusIdx !== -1 && row[statusIdx]) {
      const s = row[statusIdx].trim().toLowerCase();
      if (s === 'draft') status = 'draft';
      else if (s === 'archived' || s === 'inactive' || s === '0') status = 'archived';
    }

    const warnings = [];
    if (price <= 0) warnings.push('Price is 0.00');
    if (!imageUrl) warnings.push('No image attached');

    products.push({
      tempId: `gen_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      name: rawName,
      description,
      category,
      price,
      sale_price: salePrice,
      cost_price: costPrice,
      stock_quantity: stock,
      sku,
      barcode,
      image_url: imageUrl,
      is_active: status === 'active',
      status,
      options: [],
      variants: [],
      sourceFormat: detectedFormat,
      warnings,
      selectedForImport: true,
    });
  });

  const validCount = products.filter(p => p.name && p.price >= 0).length;
  const warningCount = products.filter(p => p.warnings.length > 0).length;

  return {
    products,
    totalRows: dataRows.length,
    detectedFormat,
    formatLabel,
    summary: {
      totalProducts: products.length,
      validCount,
      warningCount,
      totalVariants: 0,
    },
    errors: [],
  };
}

export function generateSampleCsv(type = 'standard') {
  if (type === 'shopify') {
    const headers = [
      'Handle',
      'Title',
      'Body (HTML)',
      'Vendor',
      'Product Category',
      'Type',
      'Tags',
      'Published',
      'Option1 Name',
      'Option1 Value',
      'Option2 Name',
      'Option2 Value',
      'Variant SKU',
      'Variant Inventory Qty',
      'Variant Price',
      'Variant Compare At Price',
      'Cost per item',
      'Variant Barcode',
      'Image Src',
      'Status'
    ];

    const rows = [
      [
        'organic-basmati-rice-5kg',
        'Organic Basmati Rice (5kg)',
        '<p>Aged long-grain royal aromatic basmati rice for festive biryanis.</p>',
        'FeraSetu Kirana',
        'Food & Beverages > Grains',
        'Grocery',
        'organic, rice, staples',
        'TRUE',
        'Title',
        'Default Title',
        '',
        '',
        'RICE-BAS-5KG',
        '45',
        '499.00',
        '550.00',
        '380.00',
        '8901234567890',
        'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
        'active'
      ],
      [
        'cotton-printed-kurti',
        'Handblock Cotton Kurti',
        '<p>Breathable Jaipur hand-block printed pure cotton casual tunic.</p>',
        'Jaipur Craft',
        'Apparel & Accessories > Clothing',
        'Fashion',
        'kurti, cotton, ethnic',
        'TRUE',
        'Size',
        'M',
        'Color',
        'Indigo',
        'KURTI-M-IND',
        '12',
        '799.00',
        '1199.00',
        '450.00',
        '8901234567891',
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80',
        'active'
      ],
      [
        'cotton-printed-kurti',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'Size',
        'L',
        'Color',
        'Indigo',
        'KURTI-L-IND',
        '18',
        '799.00',
        '1199.00',
        '450.00',
        '8901234567892',
        '',
        'active'
      ]
    ];

    return [headers.join(','), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
  }

  const headers = [
    'Product Name',
    'Category',
    'Price',
    'Sale Price',
    'Cost Price',
    'Stock Quantity',
    'SKU',
    'Barcode',
    'Description',
    'Image URL',
    'Status'
  ];

  const rows = [
    [
      'Aashirvaad Shudh Chakki Atta (10kg)',
      'Grocery',
      '440.00',
      '480.00',
      '390.00',
      '50',
      'ATTA-10KG',
      '8901030383786',
      '100% whole wheat flour, naturally rich in dietary fibre.',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
      'active'
    ],
    [
      'Tata Gold Tea (500g)',
      'Food & Beverages',
      '275.00',
      '295.00',
      '230.00',
      '30',
      'TEA-TATA-500G',
      '8901030383790',
      'Exquisite tea leaves with gently rolled aromatic long leaves.',
      'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
      'active'
    ],
    [
      'Handcrafted Brass Diya',
      'Home & Kitchen',
      '350.00',
      '499.00',
      '200.00',
      '20',
      'BRASS-DIYA-01',
      '',
      'Traditional handcrafted solid brass oil lamp for puja and home decor.',
      'https://images.unsplash.com/photo-1605651202774-7d573fd3f12d?auto=format&fit=crop&w=600&q=80',
      'active'
    ]
  ];

  return [headers.join(','), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
}

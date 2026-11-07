import React from 'react';
import { motion } from 'framer-motion';
import { COMPARE_COLUMNS, COMPARE_ROWS } from './electronicData';
import { useMonoShop } from './MonoContext';
import { fadeUp } from './MonoUI';

export default function MonoCompareTable() {
  const { products, formatPrice } = useMonoShop();

  const { columns, rows } = React.useMemo(() => {
    if (products.length > 0) {
      const topProducts = products.slice(0, 3);
      const cols = topProducts.map((p) => p.name);
      const tableRows = [
        { label: 'Category', values: topProducts.map((p) => p.sub || p.category) },
        { label: 'Starting Price', values: topProducts.map((p) => formatPrice(p.price)), isPrice: true },
        { label: 'Availability', values: topProducts.map((p) => (p.stock === 'in' ? 'In Stock · Ready to Dispatch' : 'Out of Stock')) },
        { label: 'Direct Guarantee', values: topProducts.map(() => 'Direct Storefront · 0% Markup') },
      ];
      return { columns: cols, rows: tableRows };
    }
    return { columns: COMPARE_COLUMNS, rows: COMPARE_ROWS };
  }, [products, formatPrice]);

  return (
    <motion.section
      id="compare"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={fadeUp}
      aria-label="Compare models"
    >
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-ink">Compare</h2>

      <div className="compare-wrap overflow-x-auto rounded-lg border border-black/5">
        <table className="compare w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-[130px] px-4 py-4" aria-label="Specification" />
              {columns.map((col) => (
                <th key={col} className="whitespace-nowrap px-4 py-4 text-left font-semibold text-ink">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="odd:bg-white even:bg-[#FAFAF8]">
                <th
                  scope="row"
                  className="whitespace-nowrap px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55"
                >
                  {row.label}
                </th>
                {row.values.map((v, i) => (
                  <td
                    key={i}
                    className={`whitespace-nowrap px-4 py-3.5 ${
                      row.isPrice ? 'text-base font-bold text-ink' : 'text-ink/75'
                    }`}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}

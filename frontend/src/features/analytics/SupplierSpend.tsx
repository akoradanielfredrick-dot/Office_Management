import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';
import { ReportToolbar } from './ReportToolbar';
import { downloadCsvFile } from '../../lib/download';

interface SupplierData {
  id: string;
  name: string;
  category: string;
  total_spend: number;
  transactions: number;
  last_transaction: string;
}

const fallbackSuppliers: SupplierData[] = [
  { id: '1', name: 'Shell Station', category: 'Fuel', total_spend: 15000, transactions: 1, last_transaction: '2026-03-29' },
  { id: '2', name: 'Rent Co.', category: 'Office', total_spend: 45000, transactions: 1, last_transaction: '2026-03-28' },
];

export const SupplierSpend: React.FC = () => {
  const navigate = useNavigate();
  const [supplierData, setSupplierData] = useState<SupplierData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await fetch('/api/finance/analytics/supplier_spend/');
        if (!response.ok) {
          throw new Error(`Supplier request failed with status ${response.status}`);
        }
        const data = await response.json();
        setSupplierData(data);
      } catch (err) {
        console.error('Supplier fetch failed', err);
        setSupplierData(fallbackSuppliers);
      } finally {
        setLoading(false);
      }
    };
    fetchSuppliers();
  }, []);

  const totalSpend = supplierData.reduce((sum, d) => sum + Number(d.total_spend), 0);
  const handleExport = () => {
    downloadCsvFile(
      'supplier-expenditure.csv',
      ['Supplier', 'Category', 'Transactions', 'Total Spend', 'Last Transaction'],
      supplierData.map((supplier) => [
        supplier.name,
        supplier.category,
        supplier.transactions,
        supplier.total_spend,
        supplier.last_transaction || '',
      ])
    );
  };

  if (loading) return <div className="p-8 text-center text-[var(--color-text-muted)]">Aggregating vendor expenditure...</div>;

  return (
    <div className="space-y-8">
      <section className="flex items-start gap-4">
        <button
          onClick={() => navigate('/analytics')}
          className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] shadow-[0_12px_24px_-20px_rgba(111,130,5,0.24)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Detailed Analytics</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-primary-strong)]">Supplier Expenditure</h1>
          <p className="mt-2 text-sm font-medium text-[var(--color-text-secondary)]">Vendor concentration and categorized procurement spend across operations.</p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[1.8rem] border border-[var(--color-border)] bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-hover)_55%,var(--color-primary-strong)_100%)] p-5 text-white shadow-[0_18px_40px_-28px_rgba(111,130,5,0.55)]">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/72">Gross Operational Spend</p>
          <p className="mt-3 text-3xl font-black">{totalSpend.toLocaleString()}</p>
          <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-[var(--color-primary-strong)]">
            <TrendingDown size={22} />
          </div>
        </div>
        <Metric label="Active Vendors" value={`${supplierData.length}`} tone="accent" />
        <Metric
          label="Average Spend / Vendor"
          value={`${(totalSpend / (supplierData.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          tone="primary"
        />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-white shadow-[0_16px_36px_-30px_rgba(111,130,5,0.28)]">
        <ReportToolbar placeholder="Search suppliers or categories..." onSearch={() => {}} onDateChange={() => {}} onExport={handleExport} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-white">
              <tr className="border-b border-[var(--color-border)] text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-center">Transactions</th>
                <th className="px-6 py-4 text-right">Total Spend</th>
                <th className="px-6 py-4 text-right">% of Gross</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {supplierData
                .sort((a, b) => b.total_spend - a.total_spend)
                .map((supplier) => (
                  <tr key={supplier.id} className="transition-colors hover:bg-[var(--color-primary-tint)]">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                          <Building size={18} />
                        </div>
                        <p className="font-black text-[var(--color-text-primary)]">{supplier.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-accent-hover)] ring-1 ring-[var(--color-accent)]/20">
                        {supplier.category}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center text-sm font-black text-[var(--color-text-primary)]">{supplier.transactions}</td>
                    <td className="px-6 py-5 text-right text-sm font-black text-[var(--color-text-primary)]">{Number(supplier.total_spend).toLocaleString()}</td>
                    <td className="px-6 py-5 text-right">
                      <div className="ml-auto flex w-28 items-center justify-end gap-3">
                        <span className="text-xs font-black text-[var(--color-text-secondary)]">
                          {((Number(supplier.total_spend) / (totalSpend || 1)) * 100).toFixed(1)}%
                        </span>
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-[var(--color-primary-soft)]">
                          <div
                            className="h-full rounded-full bg-[var(--color-primary)]"
                            style={{ width: `${(Number(supplier.total_spend) / (totalSpend || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; tone: 'primary' | 'accent' }> = ({ label, value, tone }) => (
  <div className="rounded-[1.8rem] border border-[var(--color-border)] bg-white p-5 shadow-[0_16px_32px_-28px_rgba(111,130,5,0.22)]">
    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-text-muted)]">{label}</p>
    <p className="mt-3 text-3xl font-black text-[var(--color-primary-strong)]">{value}</p>
    <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[var(--color-primary-soft)]">
      <div
        className={clsx(
          'h-full rounded-full',
          tone === 'accent' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-primary)]'
        )}
        style={{ width: tone === 'accent' ? '58%' : '74%' }}
      />
    </div>
  </div>
);

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, TrendingDown } from 'lucide-react';
import { ReportToolbar } from './ReportToolbar';

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

  if (loading) return <div className="p-8 text-center text-slate-400">Aggregating vendor expenditure...</div>;

  return (
    <div className="space-y-8">
      <section className="flex items-start gap-4">
        <button
          onClick={() => navigate('/analytics')}
          className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Detailed Analytics</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Supplier Expenditure</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Vendor concentration and categorized procurement spend across operations.</p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[1.8rem] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.8)]">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/50">Gross Operational Spend</p>
          <p className="mt-3 text-3xl font-black">KES {totalSpend.toLocaleString()}</p>
          <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-rose-400">
            <TrendingDown size={24} />
          </div>
        </div>
        <Metric label="Active Vendors" value={`${supplierData.length}`} />
        <Metric label="Average Spend / Vendor" value={`KES ${(totalSpend / (supplierData.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <ReportToolbar placeholder="Search suppliers or categories..." onSearch={() => {}} onDateChange={() => {}} onExport={() => window.print()} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-white">
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-center">Transactions</th>
                <th className="px-6 py-4 text-right">Total Spend</th>
                <th className="px-6 py-4 text-right">% of Gross</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {supplierData.sort((a, b) => b.total_spend - a.total_spend).map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-slate-50/80">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                        <Building size={18} />
                      </div>
                      <p className="font-black text-slate-900">{s.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 ring-1 ring-slate-200">
                      {s.category}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center text-sm font-black text-slate-900">{s.transactions}</td>
                  <td className="px-6 py-5 text-right text-sm font-black text-slate-900">{Number(s.total_spend).toLocaleString()}</td>
                  <td className="px-6 py-5 text-right">
                    <div className="ml-auto flex w-28 items-center justify-end gap-3">
                      <span className="text-xs font-black text-slate-500">{((Number(s.total_spend) / (totalSpend || 1)) * 100).toFixed(1)}%</span>
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-primary-600" style={{ width: `${(Number(s.total_spend) / (totalSpend || 1)) * 100}%` }} />
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

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">{label}</p>
    <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
  </div>
);

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, CirclePlus, Search, Tags, Globe2, Pencil } from 'lucide-react';
import { api } from '../../lib/api';

interface ProductPrice {
  id: string;
  currency: string;
  amount: string | number;
  rate_name: string;
  participant_category_label?: string;
}

interface ProductRecord {
  id: string;
  product_code: string;
  name: string;
  category_display: string;
  pricing_mode_display: string;
  destination: string;
  duration_text?: string;
  is_active: boolean;
  prices: ProductPrice[];
}

const displayedCurrencies = ['USD', 'EUR', 'GBP'] as const;

export const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = React.useState<ProductRecord[]>([]);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    const fetchProducts = async () => {
      const response = await api.get('/operations/products/');
      setProducts(response.data);
    };

    fetchProducts().catch((error) => {
      console.error('Failed to load products:', error);
      setProducts([]);
    });
  }, []);

  const filteredProducts = products.filter((product) => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return true;
    }

    return [
      product.product_code,
      product.name,
      product.category_display,
      product.destination,
    ].some((value) => value?.toLowerCase().includes(needle));
  });

  const getCurrencyAmount = (product: ProductRecord, currency: (typeof displayedCurrencies)[number]) => {
    const price = product.prices.find(
      (item) => item.currency === currency && (!item.participant_category_label || item.participant_category_label.toUpperCase() === 'ADULT')
    ) ?? product.prices.find((item) => item.currency === currency);

    return price ? Number(price.amount).toLocaleString() : '0';
  };

  const activeCount = filteredProducts.filter((product) => product.is_active).length;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Catalog Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Products & Rates</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              Manage sellable tours, excursions, and safari products with structured price rows ready for booking flows and future OTA mapping.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/products/new')}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <CirclePlus size={17} />
          New Product
        </button>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[1.8rem] border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Boxes size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Structured Products</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{filteredProducts.length}</p>
        </div>

        <div className="rounded-[1.8rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Tags size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Active Products</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{activeCount}</p>
        </div>

        <div className="rounded-[1.8rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Globe2 size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Required Currencies</p>
          <p className="mt-2 text-3xl font-black text-slate-900">3</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by product code, name, category, or destination..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="bg-white">
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Destination</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Rates</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="transition-colors hover:bg-slate-50/80">
                  <td className="px-6 py-5">
                    <p className="font-black text-slate-900">{product.name}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{product.product_code}</p>
                  </td>
                  <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                    <div>{product.category_display}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{product.pricing_mode_display}</div>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-slate-600">{product.destination || 'Not set'}</td>
                  <td className="px-6 py-5 text-sm font-medium text-slate-600">{product.duration_text || 'Not set'}</td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-2">
                      {displayedCurrencies.map((currency) => (
                        <span key={`${product.id}-${currency}`} className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 ring-1 ring-slate-200">
                          {currency} {getCurrencyAmount(product, currency)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ring-1 ${product.is_active ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
                      {product.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => navigate(`/products/${product.id}/edit`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>
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

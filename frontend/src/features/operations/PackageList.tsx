import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BriefcaseBusiness, CirclePlus, Pencil, Search, Tag } from 'lucide-react';
import { api } from '../../lib/api';

interface PackageRecord {
  id: string;
  name: string;
  package_type: string;
  package_type_display: string;
  price: string | number;
  itinerary?: string;
}

export const PackageList: React.FC = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = React.useState<PackageRecord[]>([]);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    api.get('/operations/packages/')
      .then((response) => setPackages(response.data))
      .catch((error) => {
        console.error('Failed to load packages:', error);
        setPackages([]);
      });
  }, []);

  const filteredPackages = packages.filter((item) => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return true;
    }

    return [item.name, item.package_type_display, item.itinerary]
      .some((value) => value?.toLowerCase().includes(needle));
  });

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Legacy Catalog</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Packages</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              Existing package records coming straight from the backend package API.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/packages/new')}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <CirclePlus size={17} />
          New Package
        </button>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[1.8rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <BriefcaseBusiness size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Package Records</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{filteredPackages.length}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by package name, type, or itinerary..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-white">
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                <th className="px-6 py-4">Package</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Itinerary</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPackages.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                  <td className="px-6 py-5">
                    <p className="font-black text-slate-900">{item.name}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-700 ring-1 ring-slate-200">
                      <Tag size={12} />
                      {item.package_type_display}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-black text-slate-900">{Number(item.price).toLocaleString()}</td>
                  <td className="px-6 py-5 text-sm font-medium text-slate-600">{item.itinerary || 'Not provided'}</td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => navigate(`/packages/${item.id}/edit`)}
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

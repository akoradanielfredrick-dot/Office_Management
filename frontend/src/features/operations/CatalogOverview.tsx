import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Boxes, Compass, Users } from 'lucide-react';
import { api } from '../../lib/api';

interface ClientRecord {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
}

interface ProductRecord {
  id: string;
  product_code: string;
  name: string;
  category_display: string;
  destination?: string;
}

interface ExcursionRecord {
  id: string;
  name: string;
  location: string;
  excursion_type_display: string;
  price: string | number;
}

export const CatalogOverview: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = React.useState<ClientRecord[]>([]);
  const [products, setProducts] = React.useState<ProductRecord[]>([]);
  const [excursions, setExcursions] = React.useState<ExcursionRecord[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      const [clientResponse, productResponse, excursionResponse] = await Promise.all([
        api.get('/clients/'),
        api.get('/operations/products/'),
        api.get('/operations/excursions/'),
      ]);

      setClients(clientResponse.data);
      setProducts(productResponse.data);
      setExcursions(excursionResponse.data);
    };

    fetchData().catch((error) => {
      console.error('Failed to load catalog overview:', error);
      setClients([]);
      setProducts([]);
      setExcursions([]);
    });
  }, []);

  const cards = [
    {
      label: 'Clients',
      value: clients.length,
      description: 'Live people and company profiles from the client backend.',
      icon: Users,
      tone: 'bg-sky-100 text-sky-700',
      path: '/clients',
    },
    {
      label: 'Structured Products',
      value: products.length,
      description: 'OTA-ready products and rates from the unified product service.',
      icon: Boxes,
      tone: 'bg-emerald-100 text-emerald-700',
      path: '/products',
    },
    {
      label: 'Excursions',
      value: excursions.length,
      description: 'Excursion records linked directly to the operations API.',
      icon: Compass,
      tone: 'bg-violet-100 text-violet-700',
      path: '/excursions',
    },
  ];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Connected Catalog</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Clients, Products & Excursions</h1>
            <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
              This page confirms the frontend is talking to the backend across the main commercial records: client profiles, structured products, and excursions.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => navigate(card.path)}
            className="rounded-[1.8rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.tone}`}>
              <card.icon size={22} />
            </div>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">{card.label}</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{card.value}</p>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-500">{card.description}</p>
            <p className="mt-4 inline-flex items-center gap-2 text-sm font-black text-primary-700">
              Open
              <ArrowRight size={16} />
            </p>
          </button>
        ))}
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Latest Clients</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Client Records</h2>
          <div className="mt-6 space-y-3">
            {clients.slice(0, 6).map((client) => (
              <div key={client.id} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-black text-slate-900">{client.full_name}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{client.email || client.phone || 'No contact detail'}</p>
              </div>
            ))}
            {!clients.length ? <p className="text-sm font-medium text-slate-500">No clients returned from the backend.</p> : null}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Catalog Mix</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Products & Excursions</h2>
          <div className="mt-6 space-y-3">
            {products.slice(0, 3).map((product) => (
              <div key={product.id} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-black text-slate-900">{product.name}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{product.category_display} {product.destination ? `| ${product.destination}` : ''}</p>
              </div>
            ))}
            {excursions.slice(0, 2).map((item) => (
              <div key={item.id} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-black text-slate-900">{item.name}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{item.excursion_type_display} | {item.location}</p>
              </div>
            ))}
            {!products.length && !excursions.length ? (
              <p className="text-sm font-medium text-slate-500">No catalog records returned from the backend.</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

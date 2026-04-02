import React from 'react';
import { Compass, MapPin, Route, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { api, formatMoney } from '../../lib/api';

interface ExcursionRecord {
  id: string;
  name: string;
  location: string;
  price: string | number;
  itinerary?: string;
}

export const ExcursionList: React.FC = () => {
  const [excursions, setExcursions] = React.useState<ExcursionRecord[]>([]);

  React.useEffect(() => {
    const fetchExcursions = async () => {
      const response = await api.get('/operations/excursions/');
      setExcursions(response.data);
    };

    fetchExcursions().catch((error) => {
      console.error('Failed to load excursions:', error);
      setExcursions([]);
    });
  }, []);

  const summaryCards = [
    {
      label: 'Excursion Records',
      description: `${excursions.length} excursions are currently available for operational planning.`,
      icon: Compass,
      tone: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: 'Tour Locations',
      description: `${new Set(excursions.map((excursion) => excursion.location)).size} unique destination areas are covered by the current excursion library.`,
      icon: MapPin,
      tone: 'bg-sky-100 text-sky-700',
    },
    {
      label: 'Itinerary Ready',
      description: `${excursions.filter((excursion) => excursion.itinerary).length} excursions already include a written route or safari outline.`,
      icon: Route,
      tone: 'bg-amber-100 text-amber-700',
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[1.45rem] border border-[#c7ecd7] bg-[linear-gradient(135deg,#effcf4_0%,#ddf6e8_52%,#cbefdc_100%)] px-8 py-8 text-slate-950 shadow-[0_18px_36px_-24px_rgba(69,136,98,0.28)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.95),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.24),transparent_58%)]" />

          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#b9e6cc] bg-white/72 px-4 py-2 text-[0.82rem] font-semibold uppercase tracking-[0.22em] text-[#2f7a55] backdrop-blur-sm">
                <Sparkles size={12} />
                Excursions Workspace
              </div>

              <h1 className="mt-6 text-[2.85rem] font-semibold tracking-tight text-slate-950">Excursions</h1>
              <p className="mt-3 max-w-2xl text-[1.02rem] font-medium leading-8 text-slate-700">
                Explore the operational library of local tours, destination routes, and excursion pricing available to the team.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1rem] border border-white/70 bg-white/62 px-5 py-4 shadow-[0_12px_24px_-20px_rgba(69,136,98,0.28)] backdrop-blur-sm">
                <p className="text-[0.85rem] uppercase tracking-[0.05em] text-slate-500">Status</p>
                <p className="mt-2 text-[1.25rem] font-semibold text-slate-950">Live Excursion Board</p>
              </div>
              <div className="rounded-[1rem] border border-white/70 bg-white/62 px-5 py-4 shadow-[0_12px_24px_-20px_rgba(69,136,98,0.28)] backdrop-blur-sm">
                <p className="text-[0.85rem] uppercase tracking-[0.05em] text-slate-500">Operational Use</p>
                <p className="mt-2 text-[1.25rem] font-semibold text-slate-950">Tours & Add-ons</p>
              </div>
              <div className="rounded-[1rem] border border-white/70 bg-white/62 px-5 py-4 shadow-[0_12px_24px_-20px_rgba(69,136,98,0.28)] backdrop-blur-sm">
                <p className="text-[0.85rem] uppercase tracking-[0.05em] text-slate-500">Excursions</p>
                <p className="mt-2 text-[1.25rem] font-semibold text-slate-950">{excursions.length}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Excursion Overview</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Operational Snapshot</h2>

          <div className="mt-6 space-y-3">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.tone}`}>
                    <card.icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{card.label}</p>
                    <p className="mt-1 text-xs font-medium leading-6 text-slate-500">{card.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Excursion Library</p>
            <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Available Excursions</h3>
          </div>
          <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
            {excursions.length} excursions
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          {excursions.length > 0 ? excursions.map((excursion) => (
            <div key={excursion.id} className="grid gap-4 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 md:grid-cols-[1.1fr_0.85fr_1fr]">
              <div>
                <p className="text-lg font-black text-slate-900">{excursion.name}</p>
                <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                  <MapPin size={15} />
                  {excursion.location}
                </p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Excursion Price</p>
                <p className="mt-2 text-lg font-black text-emerald-700">{formatMoney('KES', excursion.price)}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Itinerary</p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  {excursion.itinerary || 'No itinerary details provided yet.'}
                </p>
              </div>
            </div>
          )) : (
            <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                <Compass size={28} />
              </div>
              <p className="mt-5 text-lg font-black text-slate-900">No excursion records found yet</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Excursions saved in the backend will appear here automatically for the office team.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CirclePlus,
  Users,
  Phone,
  Mail,
  Building2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';

interface ClientRecord {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const ClientList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = React.useState<ClientRecord[]>([]);
  const focusedClientId = searchParams.get('clientId');

  React.useEffect(() => {
    const fetchClients = async () => {
      const response = await api.get('/clients/');
      setClients(response.data);
    };

    fetchClients().catch((error) => {
      console.error('Failed to load clients:', error);
      setClients([]);
    });
  }, []);

  const summaryCards = [
    {
      label: 'Contact Profiles',
      description: `${clients.filter((client) => client.phone || client.email).length} clients have direct contact details.`,
      icon: Users,
      tone: 'bg-sky-100 text-sky-700',
    },
    {
      label: 'Communication Ready',
      description: `${clients.filter((client) => client.email).length} clients include email addresses for proposal follow-up.`,
      icon: Mail,
      tone: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: 'Business Accounts',
      description: `${clients.filter((client) => client.address).length} records include address details for administration.`,
      icon: Building2,
      tone: 'bg-amber-100 text-amber-700',
    },
  ];

  const orderedClients = React.useMemo(() => {
    if (!focusedClientId) {
      return clients;
    }

    const focusedClient = clients.find((client) => client.id === focusedClientId);
    if (!focusedClient) {
      return clients;
    }

    return [focusedClient, ...clients.filter((client) => client.id !== focusedClientId)];
  }, [clients, focusedClientId]);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[1.45rem] border border-[#f0ddb0] bg-[linear-gradient(135deg,#fff9ea_0%,#fff1c7_52%,#f7e2a6_100%)] px-8 py-8 text-slate-950 shadow-[0_18px_36px_-24px_rgba(171,132,42,0.28)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.95),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.26),transparent_58%)]" />

          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ecd48d] bg-white/72 px-4 py-2 text-[0.82rem] font-semibold uppercase tracking-[0.22em] text-[#9c7421] backdrop-blur-sm">
                <Sparkles size={12} />
                Client Workspace
              </div>

              <h1 className="mt-6 text-[2.85rem] font-semibold tracking-tight text-slate-950">Clients</h1>
              <p className="mt-3 max-w-2xl text-[1.02rem] font-medium leading-8 text-slate-700">
                Live client records are available here for booking, payment, expense, and account workflows.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1rem] border border-white/70 bg-white/62 px-5 py-4 shadow-[0_12px_24px_-20px_rgba(171,132,42,0.28)] backdrop-blur-sm">
                <p className="text-[0.85rem] uppercase tracking-[0.05em] text-slate-500">Status</p>
                <p className="mt-2 text-[1.25rem] font-semibold text-slate-950">Live Directory</p>
              </div>
              <div className="rounded-[1rem] border border-white/70 bg-white/62 px-5 py-4 shadow-[0_12px_24px_-20px_rgba(171,132,42,0.28)] backdrop-blur-sm">
                <p className="text-[0.85rem] uppercase tracking-[0.05em] text-slate-500">Linked Data</p>
                <p className="mt-2 text-[1.25rem] font-semibold text-slate-950">Bookings & Accounts</p>
              </div>
              <div className="rounded-[1rem] border border-white/70 bg-white/62 px-5 py-4 shadow-[0_12px_24px_-20px_rgba(171,132,42,0.28)] backdrop-blur-sm">
                <p className="text-[0.85rem] uppercase tracking-[0.05em] text-slate-500">Client Records</p>
                <p className="mt-2 text-[1.25rem] font-semibold text-slate-950">{clients.length}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Client Operations</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Directory Summary</h2>

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
        {focusedClientId ? (
          <div className="mb-6 flex flex-col gap-3 rounded-[1.4rem] border border-sky-200 bg-sky-50 px-5 py-4 text-sky-900 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">Linked From Booking</p>
              <p className="mt-1 text-sm font-semibold">
                The booking client has been brought to the top so you can review the exact record quickly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-black text-sky-700 transition-colors hover:bg-sky-100"
            >
              Clear Focus
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Live Client Directory</p>
            <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Client Records</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary-50 px-4 py-2 text-sm font-black text-primary-700">
              {clients.length} clients
            </div>
            <button
              type="button"
              onClick={() => navigate('/clients/new')}
              className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-primary-700"
            >
              <CirclePlus size={16} />
              Add Client
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          {orderedClients.length > 0 ? orderedClients.map((client) => (
            <div
              key={client.id}
              className={`grid gap-4 rounded-[1.6rem] border p-5 md:grid-cols-[1.2fr_0.9fr_0.9fr] ${
                client.id === focusedClientId
                  ? 'border-sky-200 bg-sky-50 shadow-[0_18px_34px_-28px_rgba(2,132,199,0.45)]'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div>
                <p className="text-lg font-black text-slate-900">{client.full_name}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{client.address || 'No address provided'}</p>
                {client.id === focusedClientId ? (
                  <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-sky-700 ring-1 ring-sky-200">
                    Booking Client
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Email</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{client.email || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Phone</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{client.phone || 'Not provided'}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-primary-700 shadow-sm">
                <ShieldCheck size={28} />
              </div>
              <p className="mt-5 text-lg font-black text-slate-900">No client records found yet</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Start by creating a client here, then use that client directly in booking and finance workflows.
              </p>
              <button
                type="button"
                onClick={() => navigate('/clients/new')}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-primary-700"
              >
                Add First Client
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

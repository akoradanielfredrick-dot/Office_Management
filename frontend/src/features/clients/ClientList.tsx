import React from 'react';
import {
  Users,
  Phone,
  Mail,
  Building2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';

interface ClientRecord {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const ClientList: React.FC = () => {
  const [clients, setClients] = React.useState<ClientRecord[]>([]);

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

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-primary-100 bg-[linear-gradient(135deg,#0f2d0f_0%,#153d15_46%,#214d2f_100%)] p-8 text-white shadow-[0_22px_60px_-30px_rgba(15,45,15,0.7)]">
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M19 0h2v40h-2zM0 19h40v2H0z'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.3em] text-primary-100">
                <Sparkles size={12} />
                Client Workspace
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight">Clients</h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-primary-100">
                Live client records from the backend are available here for quotation, booking, and account workflows.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary-200">Status</p>
                <p className="mt-2 text-lg font-black text-white">Live Directory</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary-200">Linked Data</p>
                <p className="mt-2 text-lg font-black text-white">Quotations & Bookings</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary-200">Client Records</p>
                <p className="mt-2 text-lg font-black text-white">{clients.length}</p>
              </div>
            </div>
          </div>
        </div>

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
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Live Client Directory</p>
            <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Client Records</h3>
          </div>
          <div className="rounded-full bg-primary-50 px-4 py-2 text-sm font-black text-primary-700">
            {clients.length} clients
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          {clients.length > 0 ? clients.map((client) => (
            <div key={client.id} className="grid gap-4 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 md:grid-cols-[1.2fr_0.9fr_0.9fr]">
              <div>
                <p className="text-lg font-black text-slate-900">{client.full_name}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{client.address || 'No address provided'}</p>
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
                Add clients from the backend admin and they will appear here automatically for quotations and bookings.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

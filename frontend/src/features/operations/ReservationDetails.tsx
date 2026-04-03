import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, Clock3, RefreshCcw, ShieldAlert, Users } from 'lucide-react';
import { api, formatMoney, toNumber } from '../../lib/api';

interface ReservationDetail {
  id: string;
  reference_no: string;
  client?: string;
  product?: string;
  product_name: string;
  schedule?: string;
  schedule_code: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'CONVERTED';
  customer_full_name: string;
  customer_email?: string;
  customer_phone?: string;
  hold_expires_at: string;
  notes?: string;
  internal_comments?: string;
  participants: Array<{
    id: string;
    category_code: string;
    category_label: string;
    quantity: number;
    unit_price: string | number;
    total_price: string | number;
  }>;
  created_at: string;
}

export const ReservationDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = React.useState<ReservationDetail | null>(null);
  const [busy, setBusy] = React.useState(false);

  const fetchReservation = React.useCallback(async () => {
    if (!id) {
      return;
    }
    const response = await api.get(`/operations/reservations/${id}/`);
    setReservation(response.data);
  }, [id]);

  React.useEffect(() => {
    fetchReservation().catch((error) => {
      console.error('Failed to load reservation details:', error);
      setReservation(null);
    });
  }, [fetchReservation]);

  if (!reservation) {
    return <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500 shadow-sm">Loading reservation...</div>;
  }

  const holdValue = reservation.participants.reduce((sum, line) => sum + toNumber(line.total_price), 0);
  const participantTotal = reservation.participants.reduce((sum, line) => sum + Number(line.quantity || 0), 0);

  const handleConvert = async () => {
    setBusy(true);
    try {
      const response = await api.post(`/operations/reservations/${reservation.id}/convert_to_booking/`, {
        travel_date: new Date().toISOString().slice(0, 10),
        number_of_days: 1,
        status: 'CONFIRMED',
        source: 'MANUAL_OFFICE',
        product_destination_snapshot: reservation.product_name,
        notes: reservation.notes || '',
        internal_notes: reservation.internal_comments || '',
      });
      navigate(`/bookings/${response.data.id}`);
    } catch (error) {
      console.error('Failed to convert reservation:', error);
      window.alert('Unable to convert this reservation right now.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt(`Cancel reservation ${reservation.reference_no}. Enter a reason:`)?.trim();
    if (!reason) {
      return;
    }

    setBusy(true);
    try {
      await api.post(`/operations/reservations/${reservation.id}/cancel/`, {
        reason,
        cancelled_by_type: 'ADMIN',
      });
      await fetchReservation();
    } catch (error) {
      console.error('Failed to cancel reservation:', error);
      window.alert('Unable to cancel this reservation right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/reservations')}
            className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Reservation Record</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">{reservation.reference_no}</h1>
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700 ring-1 ring-emerald-200">
                {reservation.status}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">
              Hold for {reservation.customer_full_name} | {reservation.product_name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {reservation.status === 'ACTIVE' ? (
            <>
              <button
                onClick={handleConvert}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/20 transition-colors hover:bg-primary-800 disabled:opacity-60"
              >
                <RefreshCcw size={18} />
                Convert to Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-60"
              >
                <Ban size={18} />
                Cancel Hold
              </button>
            </>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Clock3 size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Hold Expiry</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{new Date(reservation.hold_expires_at).toLocaleString()}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{reservation.schedule_code}</p>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
            <Users size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Participants</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{participantTotal} held spaces</p>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldAlert size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Hold Value</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{formatMoney('KES', holdValue)}</p>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.7fr_0.8fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Held Inventory</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Participant Breakdown</h2>
          </div>

          <div className="mt-6 space-y-3">
            {reservation.participants.map((line) => (
              <div key={line.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">{line.category_label}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{line.category_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">{line.quantity} x {toNumber(line.unit_price).toLocaleString()}</p>
                  <p className="text-xs font-medium text-slate-500">{toNumber(line.total_price).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Customer</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Contact Snapshot</h2>
            <div className="mt-5 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-bold text-slate-900">{reservation.customer_full_name}</p>
              <p className="mt-2 text-sm font-medium text-slate-600">{reservation.customer_email || 'No email captured'}</p>
              <p className="mt-1 text-sm font-medium text-slate-600">{reservation.customer_phone || 'No phone captured'}</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Notes</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Handling Context</h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Customer Notes</p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{reservation.notes || 'No customer notes'}</p>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Internal Comments</p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{reservation.internal_comments || 'No internal comments'}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

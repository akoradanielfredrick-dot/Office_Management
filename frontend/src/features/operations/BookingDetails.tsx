import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  Printer,
  CreditCard,
  ShieldCheck,
  Download,
  History,
  ListChecks,
  ShoppingCart,
  Pencil,
  MapPin,
  Calendar,
  Users,
  ReceiptText,
} from 'lucide-react';
import { clsx } from 'clsx';
import { jsPDF } from 'jspdf';
import { api, toNumber } from '../../lib/api';

interface BookingPayment {
  id: string;
  internal_reference: string;
  payment_date: string;
  amount: number | string;
  method: string;
  receipt?: { id: string };
}

interface BookingExpense {
  id: string;
  internal_reference: string;
  expense_date: string;
  category: string;
  amount: number | string;
  supplier_name?: string;
}

interface BookingDetailRecord {
  id: string;
  client: string;
  reference_no: string;
  status: string;
  payment_status?: string;
  source?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  customer_full_name?: string;
  customer_email?: string;
  customer_phone?: string;
  product_name?: string;
  product_name_snapshot?: string;
  product_category_display?: string;
  schedule_code?: string;
  reservation_reference?: string;
  product_destination_snapshot: string;
  travel_date?: string;
  number_of_days: number;
  num_adults: number;
  price_per_adult: number | string;
  num_children: number;
  price_per_child: number | string;
  extra_charges: number | string;
  itinerary?: string;
  start_date: string;
  end_date: string;
  currency: string;
  subtotal: number | string;
  discount: number | string;
  total_cost: number | string;
  paid_amount: number | string;
  booking_validity?: string;
  deposit_terms?: string;
  payment_channels?: string;
  supplier_notes?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  cancelled_by_type?: string;
  refund_status?: string;
  inventory_released_on_cancel?: boolean;
  amendment_history?: Array<{
    timestamp?: string;
    actor_name?: string;
    previous_schedule?: string | null;
    new_schedule?: string | null;
    previous_total_quantity?: number;
    new_total_quantity?: number;
  }>;
  audit_entries?: Array<{
    id: string;
    entity_type: string;
    action: string;
    actor_name?: string;
    notes?: string;
    payload?: Record<string, unknown>;
    created_at: string;
  }>;
  participant_quantities?: Array<{
    id: string;
    category_code: string;
    category_label: string;
    quantity: number;
    unit_price: number | string;
    total_price: number | string;
  }>;
  created_at: string;
}

export const BookingDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'itinerary' | 'payments' | 'travellers' | 'expenses' | 'timeline'>('expenses');
  const [booking, setBooking] = React.useState<BookingDetailRecord | null>(null);
  const [payments, setPayments] = React.useState<BookingPayment[]>([]);
  const [expenses, setExpenses] = React.useState<BookingExpense[]>([]);
  const [busy, setBusy] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!id) {
      return;
    }

    const [bookingResponse, paymentsResponse, expensesResponse] = await Promise.all([
      api.get(`/operations/bookings/${id}/`),
      api.get(`/finance/payments/?booking=${id}`),
      api.get(`/finance/expenses/?booking=${id}`),
    ]);

    setBooking(bookingResponse.data);
    setPayments(paymentsResponse.data);
    setExpenses(expensesResponse.data);
  }, [id]);

  React.useEffect(() => {
    fetchData().catch((error) => {
      console.error('Failed to load booking details:', error);
      setBooking(null);
      setPayments([]);
      setExpenses([]);
    });
  }, [fetchData]);

  if (!booking) {
    return <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500 shadow-sm">Loading booking...</div>;
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const paidAmount = toNumber(booking.paid_amount);
  const totalCost = toNumber(booking.total_cost);
  const grossProfit = paidAmount - totalExpenses;
  const balance = totalCost - paidAmount;
  const paymentProgress = totalCost > 0 ? (paidAmount / totalCost) * 100 : 0;
  const timelineItems = [
    ...(booking.audit_entries || []).map((entry) => ({
      id: `audit-${entry.id}`,
      kind: 'audit' as const,
      title: entry.action.replace(/_/g, ' '),
      subtitle: entry.notes || `${entry.entity_type} event`,
      actor: entry.actor_name || 'System',
      at: entry.created_at,
    })),
    ...(booking.amendment_history || []).map((entry, index) => ({
      id: `amendment-${index}`,
      kind: 'amendment' as const,
      title: 'Booking amended',
      subtitle: [
        entry.previous_schedule && entry.new_schedule && entry.previous_schedule !== entry.new_schedule
          ? `${entry.previous_schedule} -> ${entry.new_schedule}`
          : null,
        typeof entry.previous_total_quantity === 'number' && typeof entry.new_total_quantity === 'number'
          ? `${entry.previous_total_quantity} pax -> ${entry.new_total_quantity} pax`
          : null,
      ].filter(Boolean).join(' | ') || 'Inventory-safe amendment recorded',
      actor: entry.actor_name || 'System',
      at: entry.timestamp || booking.created_at,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const getStatusTone = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
      case 'ONGOING':
        return 'bg-sky-100 text-sky-700 ring-sky-200';
      case 'COMPLETED':
        return 'bg-slate-100 text-slate-700 ring-slate-200';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-700 ring-rose-200';
      case 'PENDING':
        return 'bg-amber-100 text-amber-700 ring-amber-200';
      case 'FAILED':
        return 'bg-rose-100 text-rose-700 ring-rose-200';
      case 'AMENDED':
        return 'bg-violet-100 text-violet-700 ring-violet-200';
      default:
        return 'bg-slate-100 text-slate-700 ring-slate-200';
    }
  };

  const handleCancelBooking = async () => {
    const reason = window.prompt(`Cancel booking ${booking.reference_no}. Enter a reason:`)?.trim();
    if (!reason) {
      return;
    }

    const shouldReleaseInventory = window.confirm(
      'Release inventory back to the schedule?\n\nChoose OK to restore space, or Cancel to keep inventory blocked.'
    );
    const refundStatusInput = window.prompt(
      'Refund status (NONE, PENDING, PARTIAL, REFUNDED). Leave blank for NONE:',
      booking.refund_status || 'NONE'
    );

    setBusy(true);
    try {
      await api.post(`/operations/bookings/${booking.id}/cancel/`, {
        reason,
        cancelled_by_type: 'ADMIN',
        release_inventory: shouldReleaseInventory,
        refund_status: (refundStatusInput || 'NONE').trim().toUpperCase(),
      });
      await fetchData();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      window.alert('Unable to cancel this booking right now.');
    } finally {
      setBusy(false);
    }
  };

  const downloadBooking = () => {
    const itinerary = booking.itinerary?.trim() || 'Not provided';
    const bookingValidity = booking.booking_validity?.trim() || 'Not provided';
    const depositTerms = booking.deposit_terms?.trim() || 'Not provided';
    const paymentChannels = booking.payment_channels?.trim() || 'Not provided';
    const travelDate = booking.travel_date || booking.start_date || 'TBD';
    const endDate = booking.end_date || 'TBD';
    const productName = booking.product_name || booking.product_name_snapshot || booking.product_destination_snapshot || 'Custom Booking';
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const left = 48;
    const right = pageWidth - 48;
    const contentWidth = right - left;
    let y = 54;
    const companyName = 'MRANGA TOURS & SAFARI LTD.';
    const companyAddress = 'Arman Complex, opposite Diani Sea Lodge, Diani, Kenya';
    const companyPhones = '+254 116 837982 / +41 79 400 28 81';
    const companyEmail = 'info@mrangatoursandsafaris.com';
    const generatedFrom = 'Office Management Portal';
    const generatedOn = new Date().toLocaleString();
    const columnGap = 10;
    const columnCount = 4;
    const columnWidth = (contentWidth - columnGap * (columnCount - 1)) / columnCount;

    const ensureSpace = (needed = 24) => {
      if (y + needed <= pageHeight - 48) {
        return;
      }
      doc.addPage();
      y = 54;
    };

    const drawFieldBox = (x: number, top: number, width: number, label: string, value: string, minHeight = 72) => {
      const displayValue = value || 'Not provided';
      const labelLines = doc.splitTextToSize(label.toUpperCase(), width - 20);
      const valueLines = doc.splitTextToSize(displayValue, width - 20);
      const contentHeight = 18 + labelLines.length * 9 + 10 + valueLines.length * 13 + 18;
      const boxHeight = Math.max(minHeight, contentHeight);

      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, top, width, boxHeight, 10, 10, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(labelLines, x + 10, top + 16);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(15, 23, 42);
      doc.text(valueLines, x + 10, top + 38);

      return boxHeight;
    };

    const drawGridRow = (fields: Array<{ label: string; value: string }>, minHeight = 72) => {
      const estimatedHeights = fields.map((field) => {
        const labelLines = doc.splitTextToSize(field.label.toUpperCase(), columnWidth - 20);
        const valueLines = doc.splitTextToSize(field.value || 'Not provided', columnWidth - 20);
        const contentHeight = 18 + labelLines.length * 9 + 10 + valueLines.length * 13 + 18;
        return Math.max(minHeight, contentHeight);
      });

      const rowHeight = Math.max(...estimatedHeights);
      ensureSpace(rowHeight + 4);

      fields.forEach((field, index) => {
        const x = left + index * (columnWidth + columnGap);
        drawFieldBox(x, y, columnWidth, field.label, field.value, rowHeight);
      });

      y += rowHeight + 12;
    };

    const drawFullWidthSection = (label: string, value: string, minHeight = 110) => {
      ensureSpace(minHeight + 4);
      const actualHeight = drawFieldBox(left, y, contentWidth, label, value, minHeight);
      y += actualHeight + 12;
    };

    const drawTwoColumnRow = (fields: Array<{ label: string; value: string }>, minHeight = 72) => {
      const twoColumnGap = 12;
      const twoColumnWidth = (contentWidth - twoColumnGap) / 2;
      const estimatedHeights = fields.map((field) => {
        const labelLines = doc.splitTextToSize(field.label.toUpperCase(), twoColumnWidth - 20);
        const valueLines = doc.splitTextToSize(field.value || 'Not provided', twoColumnWidth - 20);
        const contentHeight = 18 + labelLines.length * 9 + 10 + valueLines.length * 13 + 18;
        return Math.max(minHeight, contentHeight);
      });

      const rowHeight = Math.max(...estimatedHeights);
      ensureSpace(rowHeight + 4);

      fields.forEach((field, index) => {
        const x = left + index * (twoColumnWidth + twoColumnGap);
        drawFieldBox(x, y, twoColumnWidth, field.label, field.value, rowHeight);
      });

      y += rowHeight + 12;
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('OFFICIAL BOOKING', left, y);
    y += 18;
    doc.setFontSize(22);
    doc.setTextColor(31, 67, 38);
    doc.text(companyName, left, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(companyAddress, left, y);
    y += 15;
    doc.text(companyPhones, left, y);
    y += 15;
    doc.text(companyEmail, left, y);
    y += 24;
    doc.setDrawColor(109, 129, 65);
    doc.setLineWidth(1.5);
    doc.line(left, y, right, y);
    y += 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(31, 67, 38);
    doc.text('Structured Booking Summary', left, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Grouped booking details laid out for professional printing and easy client review.', left, y);
    y += 18;

    drawGridRow([
      { label: 'Booking Number', value: booking.reference_no },
      { label: 'Client Name', value: booking.client_name },
      { label: 'Client Email', value: booking.client_email || 'No email provided' },
      { label: 'Client Phone', value: booking.client_phone || 'No phone provided' },
    ]);

    drawGridRow([
      { label: 'Product', value: productName },
      { label: 'Product Category', value: booking.product_category_display || 'Not specified' },
      { label: 'Travel Date', value: travelDate },
      { label: 'End Date', value: endDate },
    ]);

    drawGridRow([
      { label: 'Duration', value: `${booking.number_of_days} day(s)` },
      { label: 'Status', value: booking.status },
      { label: 'Travellers', value: `${booking.num_adults} adult(s), ${booking.num_children} child(ren)` },
      { label: 'Price per Adult', value: `${booking.currency} ${toNumber(booking.price_per_adult).toLocaleString()}` },
    ]);

    drawGridRow([
      { label: 'Price per Child', value: `${booking.currency} ${toNumber(booking.price_per_child).toLocaleString()}` },
      { label: 'Extra Charges', value: `${booking.currency} ${toNumber(booking.extra_charges).toLocaleString()}` },
      { label: 'Subtotal', value: `${booking.currency} ${toNumber(booking.subtotal).toLocaleString()}` },
      { label: 'Discount', value: `${booking.currency} ${toNumber(booking.discount).toLocaleString()}` },
    ]);

    drawGridRow([
      { label: 'Total Cost', value: `${booking.currency} ${toNumber(booking.total_cost).toLocaleString()}` },
      { label: 'Booking Validity', value: bookingValidity },
      { label: 'Deposit Terms', value: depositTerms },
      { label: 'Payment Channels', value: paymentChannels },
    ], 84);

    drawFullWidthSection('Itinerary', itinerary, 140);
    drawTwoColumnRow([
      { label: 'Generated From', value: generatedFrom },
      { label: 'Generated On', value: generatedOn },
    ], 76);

    doc.save(`${booking.reference_no.toLowerCase()}-booking.pdf`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/bookings')}
            className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Operations Record</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">{booking.reference_no}</h1>
              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ring-1 ${getStatusTone(booking.status)}`}>
                {booking.status}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">
              Tour for {booking.customer_full_name || booking.client_name} | {booking.product_name || booking.product_name_snapshot || booking.product_destination_snapshot}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Printer size={18} />
            Print Voucher
          </button>
          <button
            onClick={downloadBooking}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Download size={18} />
            Download Booking
          </button>
          <button
            onClick={() => navigate(`/clients?clientId=${booking.client}`)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
          >
            <Users size={18} />
            View Client
          </button>
          <button
            onClick={() => navigate(`/finance/payments/new?bookingId=${booking.id}`)}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/20 transition-colors hover:bg-primary-800"
          >
            <CreditCard size={18} />
            Add Payment
          </button>
          {booking.status !== 'CANCELLED' ? (
            <button
              onClick={() => navigate(`/bookings/${booking.id}/amend`)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-60"
            >
              <Pencil size={18} />
              Amend Booking
            </button>
          ) : null}
          {booking.status !== 'CANCELLED' ? (
            <button
              onClick={handleCancelBooking}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-60"
            >
              <Ban size={18} />
              Cancel Booking
            </button>
          ) : null}
          <button
            onClick={() => navigate(`/finance/expenses/new?bookingId=${booking.id}`)}
            className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-900/20 transition-colors hover:bg-rose-700"
          >
            <ShoppingCart size={18} />
            Add Expense
          </button>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
            <MapPin size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Product</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{booking.product_name || booking.product_name_snapshot || booking.product_destination_snapshot}</p>
          {booking.product_category_display ? <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">{booking.product_category_display}</p> : null}
          {booking.schedule_code ? <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{booking.schedule_code}</p> : null}
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Calendar size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Travel Date</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{booking.travel_date || booking.start_date}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{booking.number_of_days} day trip</p>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
            <Users size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Travellers</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{booking.num_adults} Adults, {booking.num_children} Children</p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {booking.currency} {toNumber(booking.price_per_adult).toLocaleString()} per adult | {booking.currency} {toNumber(booking.price_per_child).toLocaleString()} per child
          </p>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
            <Ban size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Cancellation / Refund</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{booking.refund_status || 'NONE'}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            {booking.cancelled_at ? `Cancelled ${new Date(booking.cancelled_at).toLocaleDateString()}` : 'Active booking'}
          </p>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.7fr_0.8fr]">
        <div className="space-y-6">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-[1.4rem] border border-slate-200 bg-white p-2 shadow-sm">
            {[
              { id: 'expenses', label: 'Expenses', icon: ShoppingCart },
              { id: 'payments', label: 'Payments', icon: History },
              { id: 'itinerary', label: 'Itinerary', icon: ListChecks },
              { id: 'travellers', label: 'Travellers', icon: Users },
              { id: 'timeline', label: 'Timeline', icon: History },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all',
                  activeTab === tab.id
                    ? 'bg-primary-700 text-white shadow-md shadow-primary-900/20'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            {activeTab === 'expenses' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Direct Operations Costing</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-900">Expense Register</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                    {expenses.length} items
                  </span>
                </div>

                <div className="overflow-hidden rounded-[1.6rem] border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                      <tr>
                        <th className="px-5 py-4">Reference</th>
                        <th className="px-5 py-4">Category</th>
                        <th className="px-5 py-4">Supplier</th>
                        <th className="px-5 py-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses.map((e) => (
                        <tr key={e.id}>
                          <td className="px-5 py-5 text-sm font-black text-slate-900">{e.internal_reference}</td>
                          <td className="px-5 py-5">
                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 ring-1 ring-slate-200">
                              {e.category}
                            </span>
                          </td>
                          <td className="px-5 py-5 text-sm font-medium text-slate-600">{e.supplier_name || 'No supplier'}</td>
                          <td className="px-5 py-5 text-right text-sm font-black text-rose-600">
                            -{booking.currency} {toNumber(e.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-rose-50/60">
                        <td colSpan={3} className="px-5 py-5 text-right text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                          Total Direct Costs
                        </td>
                        <td className="px-5 py-5 text-right text-sm font-black text-rose-700">
                          {booking.currency} {totalExpenses.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'payments' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Collections</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-900">Payment History</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                    {payments.length} transaction
                  </span>
                </div>

                <div className="overflow-hidden rounded-[1.6rem] border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                      <tr>
                        <th className="px-5 py-4">Reference</th>
                        <th className="px-5 py-4">Date</th>
                        <th className="px-5 py-4">Method</th>
                        <th className="px-5 py-4 text-right">Amount</th>
                        <th className="px-5 py-4 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-5 py-5 text-sm font-black text-slate-900">{p.internal_reference}</td>
                          <td className="px-5 py-5 text-sm font-medium text-slate-500">{p.payment_date?.slice(0, 10)}</td>
                          <td className="px-5 py-5 text-sm font-semibold text-slate-700">{p.method}</td>
                          <td className="px-5 py-5 text-right text-sm font-black text-slate-900">
                            {booking.currency} {toNumber(p.amount).toLocaleString()}
                          </td>
                          <td className="px-5 py-5 text-right">
                            <button
                              onClick={() => p.receipt?.id && window.open(`/api/finance/receipts/${p.receipt.id}/download/`, '_blank')}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                            >
                              <Download size={15} />
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'itinerary' ? (
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Safari Plan</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">Itinerary & Terms</h2>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Booking Validity</p>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-700">{booking.booking_validity || 'Not specified'}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Deposit Terms</p>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-700">{booking.deposit_terms || 'Not specified'}</p>
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Itinerary</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700">
                    {booking.itinerary || 'No itinerary has been entered yet.'}
                  </p>
                </div>

                <div className="rounded-[1.6rem] border border-slate-200 bg-primary-50 p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary-700">Payment Channels</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700">
                    {booking.payment_channels || 'No payment channels have been specified yet.'}
                  </p>
                </div>
              </div>
            ) : activeTab === 'travellers' ? (
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Client Snapshot</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">Traveller Contact Context</h2>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Lead Client</p>
                    <p className="mt-3 text-sm font-bold text-slate-900">{booking.customer_full_name || booking.client_name}</p>
                    <p className="mt-2 text-sm font-medium text-slate-600">{booking.customer_email || booking.client_email || 'No email captured'}</p>
                    <p className="mt-1 text-sm font-medium text-slate-600">{booking.customer_phone || booking.client_phone || 'No phone captured'}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Pricing Snapshot</p>
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      Adults: {booking.num_adults} x {booking.currency} {toNumber(booking.price_per_adult).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Children: {booking.num_children} x {booking.currency} {toNumber(booking.price_per_child).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Extra charges: {booking.currency} {toNumber(booking.extra_charges).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Discount: {booking.currency} {toNumber(booking.discount).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Payment status: {booking.payment_status || 'UNPAID'}
                    </p>
                  </div>
                </div>

                {booking.participant_quantities?.length ? (
                  <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Structured Participant Quantities</p>
                    <div className="mt-4 space-y-3">
                      {booking.participant_quantities.map((line) => (
                        <div key={line.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{line.category_label}</p>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{line.category_code}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-900">{line.quantity} x {booking.currency} {toNumber(line.unit_price).toLocaleString()}</p>
                            <p className="text-xs font-medium text-slate-500">{booking.currency} {toNumber(line.total_price).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Record Trace</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-900">Audit Timeline</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                    {timelineItems.length} events
                  </span>
                </div>

                <div className="space-y-4">
                  {timelineItems.length ? timelineItems.map((item) => (
                    <div key={item.id} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">{item.title}</p>
                          <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{item.subtitle}</p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{item.actor}</p>
                          <p className="mt-2 text-sm font-medium text-slate-600">{new Date(item.at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5 text-sm font-medium text-slate-600">
                      No audit events have been recorded yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.8)]">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Performance View</p>
              <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-white">
                <ShieldCheck size={22} />
                Profitability Index
              </h2>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Revenue Collected</p>
                <p className="mt-2 text-2xl font-black text-emerald-400">+{booking.currency} {paidAmount.toLocaleString()}</p>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Direct Tour Costs</p>
                <p className="mt-2 text-2xl font-black text-rose-400">-{booking.currency} {totalExpenses.toLocaleString()}</p>
              </div>

              <div className="border-t border-white/10 pt-5">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Estimated Gross Profit</p>
                <p className={clsx('mt-2 text-4xl font-black', grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-500')}>
                  {booking.currency} {grossProfit.toLocaleString()}
                </p>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={clsx('h-full rounded-full transition-all duration-1000', grossProfit >= 0 ? 'bg-emerald-400' : 'bg-rose-500')}
                  style={{ width: `${Math.max(0, Math.min(100, paidAmount > 0 ? (grossProfit / paidAmount) * 100 : 0))}%` }}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Collections Progress</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Payment Target</h2>

            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Balance Due</p>
                <p className="mt-1 text-3xl font-black text-rose-600">{booking.currency} {balance.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-primary-50 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-primary-700">
                {Math.round(paymentProgress)}% paid
              </div>
            </div>

            <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-primary-600" style={{ width: `${paymentProgress}%` }} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Booking Record</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Reference Notes</h2>

            <div className="mt-5 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-200 text-slate-700">
                  <ReceiptText size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{booking.reference_no}</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Created {new Date(booking.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Subtotal</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{booking.currency} {toNumber(booking.subtotal).toLocaleString()}</p>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Payment Channels</p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{booking.payment_channels || 'Not specified'}</p>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Source & Reservation</p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                  {booking.source || 'MANUAL_OFFICE'}{booking.reservation_reference ? ` | ${booking.reservation_reference}` : ''}
                </p>
                {booking.cancellation_reason ? <p className="mt-2 text-sm font-medium leading-6 text-rose-600">{booking.cancellation_reason}</p> : null}
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Cancellation Controls</p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                  {booking.cancelled_at
                    ? `Cancelled on ${new Date(booking.cancelled_at).toLocaleString()} by ${booking.cancelled_by_type || 'SYSTEM'}`
                    : 'Booking is still active.'}
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                  Refund status: {booking.refund_status || 'NONE'}
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                  Inventory release: {booking.inventory_released_on_cancel ? 'Released' : 'Not released'}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

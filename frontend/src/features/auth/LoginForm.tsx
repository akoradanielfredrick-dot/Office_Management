import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LogIn, Lock, Loader2, Mail } from 'lucide-react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';

const mrangaLogo = '/mranga-brand.jpeg';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
  const { login } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(searchParams.get('message'));

  React.useEffect(() => {
    setError(searchParams.get('message'));
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login/', {
        email: data.email,
        password: data.password,
      });
      login({
        ...res.data.user,
      });
    } catch (err) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null;
      setError(detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left decorative panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,var(--color-sidebar-bg)_0%,var(--color-primary-strong)_48%,#2b3302_100%)] p-12 text-white lg:flex">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div
          className="absolute -left-16 top-20 h-72 w-72 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgb(255 162 3 / 18%)' }}
        />
        <div className="absolute bottom-8 right-0 h-80 w-80 rounded-full bg-white/8 blur-3xl" />

        <div className="relative z-10 flex items-center justify-center flex-1">
          <div className="max-w-xl rounded-[2rem] border border-white/12 bg-gradient-to-br from-white/14 via-white/10 to-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur-sm">
            <div className="flex flex-col items-center text-center">
              <div
                className="flex h-44 w-44 items-center justify-center rounded-[2rem] bg-white/96 p-4 shadow-xl shadow-black/20 ring-1"
                style={{ ['--tw-ring-color' as '--tw-ring-color']: 'rgb(255 162 3 / 45%)' }}
              >
                <img
                  src={mrangaLogo}
                  alt="Mranga Tours and Safaris Ltd"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="mt-6 space-y-2">
                <p className="text-[0.7rem] font-black uppercase tracking-[0.45em] text-[var(--color-accent)]">
                  Safari Operations Portal
                </p>
                <h1 className="text-3xl font-black uppercase leading-tight text-white">
                  MRANGA TOURS AND SAFARIS LTD
                </h1>
                <p className="max-w-md text-sm font-medium leading-6 text-white/80">
                  Internal portal for bookings, finance, reporting, and client operations.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-white/80">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Kenya</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Est. 2024</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Mranga Operations Portal v1.0</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 h-12" />
      </div>

      {/* Right login panel */}
      <div className="flex flex-1 items-center justify-center bg-[linear-gradient(180deg,var(--color-surface-soft)_0%,var(--color-surface-muted)_100%)] px-8 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src={mrangaLogo} alt="Mranga Tours & Safaris Ltd." className="h-20 mx-auto object-contain" />
          </div>

          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 shadow-[0_28px_60px_-42px_rgba(111,130,5,0.4)]">
            <div className="mb-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-[0_14px_26px_-20px_rgba(111,130,5,0.6)]">
                <LogIn size={26} />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Mranga Staff Access</p>
              <h2 className="mt-2 text-2xl font-black text-[var(--color-primary-strong)]">Welcome Back</h2>
              <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">Sign in to your staff account</p>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--color-text-primary)]">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="name@mranga.com"
                    className={`w-full rounded-xl border bg-[var(--color-surface-soft)] py-3 pl-11 pr-4 text-sm font-medium transition-all ${
                      errors.email ? 'border-red-400 bg-red-50' : 'border-[var(--color-border)]'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--color-text-primary)]">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    {...register('password')}
                    type="password"
                    placeholder="********"
                    className={`w-full rounded-xl border bg-[var(--color-surface-soft)] py-3 pl-11 pr-4 text-sm font-medium transition-all ${
                      errors.password ? 'border-red-400 bg-red-50' : 'border-[var(--color-border)]'
                    }`}
                  />
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3.5 text-sm font-black tracking-wide text-white shadow-[0_18px_30px_-22px_rgba(111,130,5,0.78)] transition-all duration-200 hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-strong)]"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <><LogIn size={18} /> Sign In to Portal</>
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs font-medium text-[var(--color-text-muted)]">
            &copy; {new Date().getFullYear()} Mranga Tours &amp; Safaris Ltd. | All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LogIn, Lock, Loader2, Mail } from 'lucide-react';
import axios from 'axios';
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
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
        id: res.data.user.id,
        email: res.data.user.email,
        full_name: res.data.user.full_name,
        role: res.data.user.role,
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
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-primary-800 p-12 text-white relative overflow-hidden">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 flex items-center justify-center flex-1">
          <div className="max-w-xl rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/15 via-white/10 to-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-44 w-44 items-center justify-center rounded-[2rem] bg-white/95 p-4 shadow-xl shadow-black/20 ring-1 ring-accent-200/60">
                <img
                  src={mrangaLogo}
                  alt="Mranga Tours and Safaris Ltd"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="mt-6 space-y-2">
                <p className="text-[0.7rem] font-black uppercase tracking-[0.45em] text-accent-200">
                  Safari Operations Portal
                </p>
                <h1 className="text-3xl font-black uppercase leading-tight text-white">
                  MRANGA TOURS AND SAFARIS LTD
                </h1>
                <p className="max-w-md text-sm font-medium leading-6 text-primary-100">
                  Office management system for bookings, quotations, finance, reporting, and client operations.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-primary-100">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Kenya</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Est. 2024</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Office Management System v1.0</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 h-12" />
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-8 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src={mrangaLogo} alt="Mranga Tours & Safaris Ltd." className="h-20 mx-auto object-contain" />
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200 p-10 border border-slate-100">
            <div className="mb-8">
              <div className="w-14 h-14 bg-primary-50 text-primary-700 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                <LogIn size={26} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Welcome Back</h2>
              <p className="text-slate-500 text-sm mt-1 font-medium">Sign in to your staff account</p>
            </div>

            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="name@mranga.com"
                    className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all bg-slate-50 font-medium text-sm ${
                      errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    {...register('password')}
                    type="password"
                    placeholder="********"
                    className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all bg-slate-50 font-medium text-sm ${
                      errors.password ? 'border-red-400 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-700 hover:bg-primary-800 active:bg-primary-900 text-white font-black py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-primary-700/20 mt-2 text-sm tracking-wide"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <><LogIn size={18} /> Sign In to Portal</>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6 font-medium">
            &copy; {new Date().getFullYear()} Mranga Tours &amp; Safaris Ltd. | All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

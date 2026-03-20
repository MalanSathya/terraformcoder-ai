import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { login } from '../services/api';
import GlassCard from '../components/GlassCard';
import { useNavigate } from 'react-router-dom';
import { Bolt, ArrowRight, Loader } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login: setLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Please enter both email and password.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await login({ email, password });
      setLogin(res.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-950 flex flex-col justify-center items-center p-4 overflow-hidden">
      {/* Ambient background — matches dashboard */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 flex flex-col items-center w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-5">
            <Bolt className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            AI Terraform Coder
          </h1>
          <p className="text-slate-400 text-sm">
            Sign in to automate your infrastructure
          </p>
        </div>

        {/* Login Form */}
        <GlassCard className="w-full">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3.5 rounded-xl bg-white/[0.04] text-white border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all duration-300 placeholder-slate-500 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full p-3.5 rounded-xl bg-white/[0.04] text-white border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all duration-300 placeholder-slate-500 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
            >
              <span className="flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-6 text-center">
            Don't have an account?{' '}
            <a href="/register" className="font-medium text-emerald-400 hover:text-cyan-400 transition-colors">
              Register
            </a>
          </p>
        </GlassCard>
      </main>
    </div>
  );
};

export default Login;

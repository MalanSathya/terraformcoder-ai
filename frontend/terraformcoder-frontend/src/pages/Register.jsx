import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { register } from '../services/api';
import GlassCard from '../components/GlassCard';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
        alert('Please fill in all fields.');
        return;
    }
    setIsLoading(true);
    try {
      const res = await register({ name, email, password });
      login(res.data.access_token);
      navigate('/dashboard'); // Redirect after successful registration
    } catch (err) {
      alert(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col justify-center items-center p-4 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      <main className="relative z-10 flex flex-col items-center">
        {/* Header Section */}
        <div className="flex flex-col items-center space-y-3 mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg mb-2">
              <span className="text-3xl font-bold text-white">⚡</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Create Your Account
            </h1>
            <p className="text-lg text-slate-400">
              Join to start automating your infrastructure
            </p>
        </div>

        {/* Register Form Card */}
        <GlassCard className="w-full max-w-md">
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Name" 
                className="w-full p-4 rounded-xl bg-slate-800/50 backdrop-blur-sm text-white border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 placeholder-slate-400"
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required
              />
              <input 
                type="email" 
                placeholder="Email" 
                className="w-full p-4 rounded-xl bg-slate-800/50 backdrop-blur-sm text-white border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 placeholder-slate-400"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
              />
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full p-4 rounded-xl bg-slate-800/50 backdrop-blur-sm text-white border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 placeholder-slate-400"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
              />
            </div>
            
            <button 
              type="submit"
              disabled={isLoading}
              className="group relative w-full px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
            >
              <span className="flex items-center justify-center space-x-3">
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>

          <p className="text-sm text-slate-400 mt-6 text-center">
            Already have an account?{' '}
            <a href="/login" className="font-medium text-emerald-400 hover:text-cyan-400 transition-colors duration-200">
              Sign In
            </a>
          </p>
        </GlassCard>
      </main>
    </div>
  );
};

export default Register;
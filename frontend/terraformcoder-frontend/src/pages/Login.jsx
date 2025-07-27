import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { login } from '../services/api';
import GlassCard from '../components/GlassCard';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login: setLogin } = useContext(AuthContext);

const navigate = useNavigate();

 const handleLogin = async () => {
  try {
    const res = await login({ email, password });
    setLogin(res.data.access_token);
    navigate('/dashboard'); // ✅ redirect after login
  } catch (err) {
    alert(err.response?.data?.detail || 'Login failed');
  }
};

  return (
    
    <div className="flex justify-center items-center min-h-screen">
      <GlassCard className="w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Welcome to Terraform Coder AI</h2>
        <p className="text-sm mb-4 text-gray-300">Login to generate infrastructure as code with AI</p>
        <input type="email" placeholder="Email" className="w-full p-2 mb-2 rounded bg-gray-800 text-white"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full p-2 mb-4 rounded bg-gray-800 text-white"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={handleLogin} className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded">Login</button>
        <p className="text-sm mt-4 text-center">
  Don't have an account? <a href="/register" className="text-blue-400 hover:underline">Register</a>
</p>
      </GlassCard>
    </div>
  );
};

export default Login;
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { register } from '../services/api';
import GlassCard from '../components/GlassCard';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);

const navigate = useNavigate();

  const handleRegister = async () => {
  try {
    const res = await register({ name, email, password });
    login(res.data.access_token);
    navigate('/dashboard'); // ✅ redirect after register
  } catch (err) {
    alert(err.response?.data?.detail || 'Registration failed');
  }
};

  return (
    <div className="flex justify-center items-center min-h-screen">
      <GlassCard className="w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Register</h2>
        <input type="text" placeholder="Name" className="w-full p-2 mb-2 rounded bg-gray-800 text-white"
          value={name} onChange={(e) => setName(e.target.value)} />
        <input type="email" placeholder="Email" className="w-full p-2 mb-2 rounded bg-gray-800 text-white"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full p-2 mb-4 rounded bg-gray-800 text-white"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={handleRegister} className="w-full bg-green-500 hover:bg-green-600 p-2 rounded">Register</button>
      </GlassCard>
    </div>
  );
};

export default Register;

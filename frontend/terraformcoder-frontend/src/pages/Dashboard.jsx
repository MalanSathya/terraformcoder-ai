import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { generateCode } from '../services/api';
import GlassCard from '../components/GlassCard';

const Dashboard = () => {
  const [description, setDescription] = useState('');
  const [result, setResult] = useState(null);
  const { user, logout } = useContext(AuthContext);

  const handleGenerate = async () => {
    try {
      const res = await generateCode(description, 'aws', localStorage.getItem('token'));
      setResult(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error generating code');
    }
  };

  return (
    <div className="p-6">
      <GlassCard className="mb-6">
        <h2 className="text-3xl mb-2 font-bold">Welcome, {user?.name || 'Terraform Coder'} 👋</h2>
        <button onClick={logout} className="bg-red-500 hover:bg-red-600 px-4 py-1 rounded">Logout</button>
        <p className="mb-4 text-gray-400">Describe your infrastructure and let AI generate Terraform instantly.</p>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white mb-4" rows={4} placeholder="Describe your infrastructure..." />
        <button onClick={handleGenerate} className="bg-green-500 hover:bg-green-600 p-2 rounded">Generate</button>
      </GlassCard>

      {result && (
        <GlassCard>
          <h3 className="text-xl font-bold mb-2">Generated Code</h3>
          <pre className="bg-black text-green-300 p-2 rounded overflow-auto"><code>{result.code}</code></pre>
          <p className="mt-4"><strong>Explanation:</strong> {result.explanation}</p>
          <p><strong>Estimated Cost:</strong> {result.estimated_cost}</p>
        </GlassCard>
      )}
    </div>
  );
};

export default Dashboard;
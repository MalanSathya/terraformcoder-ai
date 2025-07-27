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
    <div className="relative min-h-screen p-6 bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      
      {/* Logout button */}
      <button
  onClick={logout}
  className="fixed top-4 left-4 z-50 bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-2 rounded-lg shadow-lg hover:bg-white/20 transition duration-200"
>
  Logout
</button>

      {/* Welcome Section */}
      <GlassCard className="mb-8">
        <h2 className="text-3xl font-semibold mb-2">
          Welcome, {user?.name || 'Terraform Coder'} 👋
        </h2>
        <p className="mb-6 text-gray-300">
          Describe your infrastructure and let AI generate Terraform instantly.
        </p>
        
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition mb-4"
          rows={4}
          placeholder="Describe your infrastructure..."
        />

        <button
          onClick={handleGenerate}
          className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-lg text-white font-medium transition duration-200"
        >
          🚀 Generate
        </button>
      </GlassCard>

      {/* Result Section */}
      {result && (
        <GlassCard>
          <h3 className="text-2xl font-semibold mb-4">Generated Code</h3>

          <pre className="bg-black text-green-300 p-4 rounded-lg overflow-auto text-sm">
            <code>{result.code}</code>
          </pre>

          <div className="mt-6 space-y-2">
            <p><strong>🧠 Explanation:</strong> {result.explanation}</p>
            <p><strong>💰 Estimated Cost:</strong> {result.estimated_cost}</p>
          </div>

          <footer className="text-center text-xs text-gray-500 mt-10">
            Terraform Coder AI © 2025 • Built with ❤️ by Malan
          </footer>
        </GlassCard>
      )}
    </div>
  );
};

export default Dashboard;
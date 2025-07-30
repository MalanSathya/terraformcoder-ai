// components/InvalidRequestCard.jsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import GlassCard from './GlassCard';

const InvalidRequestCard = ({ message }) => {
  const defaultMessage = "⚠️ Please only provide a clear description of your cloud infrastructure requirements (e.g., 'Create a VPC with two EC2 instances and RDS').";

  const examples = [
    "Deploy a web application with load balancer and database",
    "Create a Kubernetes cluster with monitoring",
    "Set up a VPC with public and private subnets",
    "Configure auto-scaling EC2 instances with RDS",
    "Deploy a serverless application with API Gateway and Lambda"
  ];

  return (
    <GlassCard className="animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
          <AlertTriangle className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          Invalid Request
        </h3>
      </div>
      <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
        <p className="text-yellow-200 text-lg leading-relaxed mb-4">
          {message || defaultMessage}
        </p>
        <div className="p-4 bg-slate-800/30 rounded-lg">
          <p className="text-sm text-slate-400 mb-3 font-medium">Try these infrastructure examples:</p>
          <ul className="text-sm text-slate-300 space-y-2">
            {examples.map((example, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>"{example}"</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </GlassCard>
  );
};

export default InvalidRequestCard;
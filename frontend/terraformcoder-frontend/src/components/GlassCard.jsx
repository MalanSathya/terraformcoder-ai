import React from 'react';

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-glass border border-borderGlass backdrop-blur-sm rounded-2xl shadow-lg p-6 ${className}`}>
    {children}
  </div>
);

export default GlassCard;
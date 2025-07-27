import React from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({ children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className={`bg-glass border border-borderGlass backdrop-blur-sm rounded-2xl shadow-lg p-6 ${className}`}
  >
    {children}
  </motion.div>
);
export default GlassCard;
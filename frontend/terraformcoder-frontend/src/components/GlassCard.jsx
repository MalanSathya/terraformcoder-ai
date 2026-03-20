import React from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({ children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    className={`bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl rounded-2xl shadow-2xl p-6 ${className}`}
  >
    {children}
  </motion.div>
);
export default GlassCard;
import React from 'react';

export function Label({ children, className = '', ...props }) {
  return (
    <label 
      className={`block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ${className}`} 
      {...props}
    >
      {children}
    </label>
  );
}

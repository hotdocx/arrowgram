import React from 'react';

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400
      focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500
      disabled:bg-gray-50 disabled:text-gray-500 transition-shadow ${className}`}
      {...props}
    />
  );
}

import React from 'react';

export function Select({ children, className = '', ...props }) {
  return (
    <div className="relative">
      <select
        className={`w-full appearance-none px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900
        focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500
        disabled:bg-gray-50 disabled:text-gray-500 transition-shadow ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
        </svg>
      </div>
    </div>
  );
}

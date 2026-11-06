import React from 'react';

export const PoliceShieldIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-8 h-8 text-blue-900',
  size = 32,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Contorno de Escudo Policial */}
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#1e3a8a" fillOpacity="0.15" />
      {/* Estrella o Emblema Central */}
      <polygon
        points="12,7 13.5,10.2 17,10.5 14.3,12.8 15.1,16.2 12,14.3 8.9,16.2 9.7,12.8 7,10.5 10.5,10.2"
        fill="currentColor"
      />
      {/* Líneas laureadas */}
      <path d="M8 19c2 1 4 1 8 0" strokeWidth="1.5" />
    </svg>
  );
};

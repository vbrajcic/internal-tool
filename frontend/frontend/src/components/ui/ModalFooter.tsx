import React, { ReactNode } from 'react';

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

const ModalFooter: React.FC<ModalFooterProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`px-4 sm:px-6 py-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3 ${className}`}
      style={{ borderColor: 'var(--color-gray-200)', backgroundColor: 'var(--color-gray-50)' }}
    >
      {children}
    </div>
  );
};

export default ModalFooter;
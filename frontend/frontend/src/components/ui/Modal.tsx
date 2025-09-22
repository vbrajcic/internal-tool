import React, { useEffect, ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md mx-4 sm:mx-auto',
    md: 'max-w-lg mx-4 sm:mx-auto',
    lg: 'max-w-2xl mx-4 sm:mx-auto',
    xl: 'max-w-4xl mx-4 sm:mx-auto'
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="flex items-center justify-center min-h-screen px-4 py-4 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={onClose}
        />

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel */}
        <div
          className={`
            inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl
            transform transition-all w-full sm:w-full ${sizeClasses[size]}
            animate-in fade-in-0 zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto
          `}
          style={{
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          {/* Header */}
          <div
            className="px-4 sm:px-6 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--color-gray-200)' }}
          >
            <div>
              <h3
                className="text-heading-3 font-semibold"
                style={{ color: 'var(--color-gray-950)' }}
                id="modal-title"
              >
                {title}
              </h3>
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                style={{
                  color: 'var(--color-gray-500)'
                }}
                aria-label="Close modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
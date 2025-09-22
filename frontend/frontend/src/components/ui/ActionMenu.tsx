import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';

interface ActionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  hidden?: boolean;
}

interface ActionMenuProps {
  actions: ActionItem[];
  primaryAction?: ActionItem;
  variant?: 'button' | 'dots';
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
}

const ActionMenu: React.FC<ActionMenuProps> = ({
  actions,
  primaryAction,
  variant = 'dots',
  align = 'right',
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter visible actions
  const visibleActions = actions.filter(action => !action.hidden);

  const handleActionClick = (action: ActionItem) => {
    if (!action.disabled) {
      action.onClick();
      setIsOpen(false);
    }
  };

  const triggerButtonClasses = `
    inline-flex items-center justify-center rounded-md transition-colors duration-150
    ${size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'}
    ${variant === 'button' ? 'bg-white border border-gray-300 hover:bg-gray-50' : ''}
    ${variant === 'dots' ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' : ''}
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
  `.trim();

  const menuClasses = `
    absolute z-50 mt-1 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none
    ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}
  `.trim();

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Primary Action + Dropdown */}
      {primaryAction && variant === 'button' ? (
        <div className="flex">
          <button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className="btn-primary rounded-r-none border-r border-blue-700"
          >
            {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
            {primaryAction.label}
          </button>
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className="btn-primary rounded-l-none border-l-0 px-2"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* Simple Dots Menu */
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className={triggerButtonClasses}
          title="More actions"
        >
          <EllipsisVerticalIcon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={menuClasses}>
          <div className="py-1">
            {visibleActions.map((action) => (
              <React.Fragment key={action.id}>
                {action.id === 'separator' ? (
                  <div className="border-t border-gray-100 my-1" />
                ) : (
                  <button
                    onClick={() => handleActionClick(action)}
                    disabled={action.disabled}
                    className={`
                      group flex w-full items-center px-4 py-2 text-sm transition-colors duration-150
                      ${action.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : action.variant === 'danger'
                          ? 'text-red-700 hover:bg-red-50 hover:text-red-900'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `.trim()}
                  >
                    {action.icon && (
                      <span className="mr-3 flex-shrink-0">
                        {action.icon}
                      </span>
                    )}
                    {action.label}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
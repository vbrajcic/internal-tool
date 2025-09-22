import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'dot';
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'default',
  size = 'md'
}) => {
  const getStatusStyles = (status: string) => {
    const statusLower = status.toLowerCase();

    switch (statusLower) {
      case 'available':
        return {
          badge: 'bg-green-100 text-green-700 border-green-200',
          dot: 'bg-green-500'
        };
      case 'assigned':
        return {
          badge: 'bg-blue-100 text-blue-700 border-blue-200',
          dot: 'bg-blue-500'
        };
      case 'maintenance':
        return {
          badge: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          dot: 'bg-yellow-500'
        };
      case 'retired':
        return {
          badge: 'bg-red-100 text-red-700 border-red-200',
          dot: 'bg-red-500'
        };
      case 'new':
        return {
          badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500'
        };
      case 'good':
        return {
          badge: 'bg-blue-100 text-blue-700 border-blue-200',
          dot: 'bg-blue-500'
        };
      case 'fair':
        return {
          badge: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          dot: 'bg-yellow-500'
        };
      case 'poor':
        return {
          badge: 'bg-red-100 text-red-700 border-red-200',
          dot: 'bg-red-500'
        };
      case 'pending':
        return {
          badge: 'bg-amber-100 text-amber-700 border-amber-200',
          dot: 'bg-amber-500'
        };
      case 'approved':
        return {
          badge: 'bg-green-100 text-green-700 border-green-200',
          dot: 'bg-green-500'
        };
      case 'rejected':
        return {
          badge: 'bg-red-100 text-red-700 border-red-200',
          dot: 'bg-red-500'
        };
      case 'active':
        return {
          badge: 'bg-green-100 text-green-700 border-green-200',
          dot: 'bg-green-500'
        };
      case 'inactive':
        return {
          badge: 'bg-gray-100 text-gray-700 border-gray-200',
          dot: 'bg-gray-500'
        };
      default:
        return {
          badge: 'bg-gray-100 text-gray-700 border-gray-200',
          dot: 'bg-gray-500'
        };
    }
  };

  const styles = getStatusStyles(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  const dotSizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  if (variant === 'dot') {
    return (
      <div className="flex items-center space-x-2">
        <div className={`rounded-full ${styles.dot} ${dotSizeClasses}`} />
        <span className="text-sm font-medium text-gray-900 capitalize">
          {status}
        </span>
      </div>
    );
  }

  return (
    <span className={`
      inline-flex items-center font-medium rounded-full border
      ${styles.badge} ${sizeClasses}
    `}>
      {status}
    </span>
  );
};

export default StatusBadge;
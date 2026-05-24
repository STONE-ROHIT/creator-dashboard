import React, { useEffect } from 'react';

/**
 * Toast Notification Component
 * 
 * Displays temporary notifications
 */
export const Toast = ({ type = 'info', message, duration = 3000, onDismiss }) => {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const bgColor =
    type === 'success'
      ? 'bg-green-50 border-green-200'
      : type === 'error'
      ? 'bg-red-50 border-red-200'
      : type === 'warning'
      ? 'bg-yellow-50 border-yellow-200'
      : 'bg-blue-50 border-blue-200';

  const textColor =
    type === 'success'
      ? 'text-green-800'
      : type === 'error'
      ? 'text-red-800'
      : type === 'warning'
      ? 'text-yellow-800'
      : 'text-blue-800';

  return (
    <div className="fixed top-4 right-4 max-w-md z-50">
      <div className={`border rounded-lg p-4 ${bgColor} ${textColor} font-medium`}>
        {message}
      </div>
    </div>
  );
};
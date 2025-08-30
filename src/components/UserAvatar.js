import React from 'react';

const UserAvatar = ({ 
  name, 
  email, 
  size = 'md', 
  className = '',
  showOnlineStatus = false,
  isOnline = false 
}) => {
  // Size configurations
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl'
  };

  // Generate initials from name or email
  const getInitials = () => {
    if (name) {
      return name.split(' ')
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return '?';
  };

  // Generate consistent color based on name or email
  const getColorClass = () => {
    const colors = [
      'from-blue-500 to-purple-600',
      'from-green-500 to-teal-600',
      'from-purple-500 to-pink-600',
      'from-yellow-500 to-orange-600',
      'from-red-500 to-pink-600',
      'from-indigo-500 to-blue-600',
      'from-teal-500 to-green-600',
      'from-orange-500 to-red-600'
    ];
    
    const str = name || email || '';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials();
  const colorClass = getColorClass();
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`${sizeClass} bg-gradient-to-br ${colorClass} rounded-full flex items-center justify-center text-white font-semibold shadow-lg`}
        title={name || email}
      >
        {initials}
      </div>
      {showOnlineStatus && (
        <div className={`absolute bottom-0 right-0 ${
          size === 'xs' || size === 'sm' ? 'h-2 w-2' : 'h-3 w-3'
        } ${
          isOnline ? 'bg-green-400' : 'bg-gray-400'
        } border-2 border-white dark:border-gray-800 rounded-full`}></div>
      )}
    </div>
  );
};

export default UserAvatar;

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InfoBannerProps {
  title: string;
  description: string;
  icon: LucideIcon | React.ReactNode;
  badge?: string;
  variant: 'primary' | 'secondary' | 'light' | 'dark';
  className?: string;
  iconContainerClassName?: string;
}

const variantStyles = {
  primary: {
    container: "bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-100",
    badge: "bg-indigo-50 text-indigo-700 border border-indigo-100"
  },
  secondary: {
    container: "bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-100"
  },
  light: {
    container: "bg-white/80 backdrop-blur-sm border border-gray-200",
    badge: "bg-gray-100 text-gray-800"
  },
  dark: {
    container: "bg-white/20 backdrop-blur-sm text-white",
    badge: "bg-white/20 backdrop-blur-sm text-white border border-white/20"
  }
};

export function InfoBanner({ 
  title, 
  description, 
  icon, 
  badge, 
  variant = 'primary',
  className = '',
  iconContainerClassName = ''
}: InfoBannerProps) {
  const styles = variantStyles[variant];
  
  return (
    <div className={`p-4 rounded-xl ${styles.container} ${className}`}>
      <div className="flex items-center">
        <div className={`flex-shrink-0 mr-4 ${iconContainerClassName}`}>
          {React.isValidElement(icon) ? icon : React.createElement(icon as LucideIcon, { className: "h-6 w-6" })}
        </div>
        <div className="flex-1">
          <h4 className={`font-bold ${variant === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>{title}</h4>
          <p className={`text-sm ${variant === 'dark' ? 'text-indigo-100' : 'text-gray-700'}`}>{description}</p>
        </div>
        {badge && (
          <div className={`px-3 py-1 text-sm font-medium rounded-full ${styles.badge}`}>
            {badge}
          </div>
        )}
      </div>
    </div>
  );
} 

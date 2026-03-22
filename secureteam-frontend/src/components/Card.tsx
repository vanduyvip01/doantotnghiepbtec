import React from 'react';
import { cn } from '../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  key?: React.Key;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const Card = ({ children, className, title, description, footer, onClick }: CardProps) => {
  return (
    <div 
      onClick={onClick}
      className={cn('rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-white/60 hover:-translate-y-0.5', className)}>
      {(title || description) && (
        <div className="p-6 pb-4">
          {title && <h3 className="text-lg font-bold text-slate-900 leading-none tracking-tight">{title}</h3>}
          {description && <p className="text-sm text-slate-500 mt-2 leading-relaxed">{description}</p>}
        </div>
      )}
      <div className={cn('p-6 pt-0', !title && !description && 'pt-6')}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 bg-white/40 border-t border-white/20">
          {footer}
        </div>
      )}
    </div>
  );
};

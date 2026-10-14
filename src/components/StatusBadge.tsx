import React from 'react';
import { DocumentStatus } from '../types';
import { Clock, AlertTriangle, FileSignature, CheckCircle2 } from 'lucide-react';

interface Props {
  status: DocumentStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md', showIcon = true }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2',
  }[size];

  switch (status) {
    case 'On Going':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium ${sizeClasses}`}
        >
          {showIcon && <Clock className="w-3.5 h-3.5 text-blue-500" />}
          <span>On Going</span>
        </span>
      );
    case 'Perlu Direvisi':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium ${sizeClasses}`}
        >
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
          <span>Perlu Direvisi</span>
        </span>
      );
    case 'Perlu Ditandatangani':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium ${sizeClasses}`}
        >
          {showIcon && <FileSignature className="w-3.5 h-3.5 text-purple-500" />}
          <span>Perlu Ditandatangani</span>
        </span>
      );
    case 'Selesai':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium ${sizeClasses}`}
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          <span>Selesai</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
};

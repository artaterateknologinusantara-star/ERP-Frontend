'use client';

import React from 'react';
import ERPModal from './ERPModal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'default';
}

export default function ConfirmModal({
  isOpen, onClose, onConfirm, title, description,
  confirmLabel = 'Konfirmasi', loading, variant = 'danger',
}: ConfirmModalProps) {
  const isDanger = variant === 'danger';
  return (
    <ERPModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={loading}>Batal</button>
          <button
            className={isDanger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 border-2 rounded-full animate-spin ${isDanger ? 'border-red-300 border-t-red-600' : 'border-primary/30 border-t-white'}`} />
                Memproses...
              </span>
            ) : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDanger ? 'bg-red-50' : 'bg-primary/10'}`}>
          <AlertTriangle size={20} className={isDanger ? 'text-red-500' : 'text-primary'} />
        </div>
        <div>
          <h3 className="text-xl font-700 text-foreground mb-1">{title}</h3>
          <p className="text-base text-muted-foreground">{description}</p>
        </div>
      </div>
    </ERPModal>
  );
}
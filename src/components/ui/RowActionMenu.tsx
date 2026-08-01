'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

export interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  separator?: boolean;
  disabled?: boolean;
}

interface Props {
  items: ActionItem[];
}

const APPROX_ITEM_H = 34;
const PADDING = 8;
const DROP_W = 192;

export default function RowActionMenu({ items }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const recalc = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const dropH = items.length * APPROX_ITEM_H + PADDING * 2;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < dropH + 8 && rect.top > dropH + 8;
    setStyle(
      openUp
        ? { position: 'fixed', bottom: window.innerHeight - rect.top + 2, right: window.innerWidth - rect.right, width: DROP_W }
        : { position: 'fixed', top: rect.bottom + 2, right: window.innerWidth - rect.right, width: DROP_W }
    );
  }, [items.length]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open) recalc();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  if (items.length === 0) return null;

  const menu = (
    <div
      style={style}
      className="z-[9999] bg-card border border-border/70 rounded-xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.14)] overflow-hidden py-1"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {item.separator && <div className="mx-3 my-1 border-t border-border/60" />}
          <button
            disabled={item.disabled}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-500 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              item.danger
                ? 'text-red-600 hover:bg-red-50/80'
                : 'text-foreground hover:bg-muted/60'
            }`}
            onClick={() => { item.onClick(); setOpen(false); }}
          >
            <span className={`flex-shrink-0 ${item.danger ? 'text-red-500' : 'text-muted-foreground'}`}>
              {item.icon}
            </span>
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        title="Aksi"
        onClick={handleToggle}
        className={`p-1.5 rounded-md transition-colors ${
          open ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
        }`}
      >
        <MoreHorizontal size={15} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(menu, document.body)}
    </>
  );
}

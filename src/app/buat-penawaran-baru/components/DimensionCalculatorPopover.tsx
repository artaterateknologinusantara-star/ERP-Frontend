'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Ruler } from 'lucide-react';

interface Props {
  length?: number | null;
  width?: number | null;
  height?: number | null;
  onApply: (result: { qty: number; length: number | null; width: number | null; height: number | null }) => void;
}

const PANEL_W = 240;

export default function DimensionCalculatorPopover({ length, width, height, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState('');
  const [l, setL] = useState('');
  const [t, setT] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const recalc = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.left;
    const openLeft = spaceRight < PANEL_W + 8;
    setStyle(
      openLeft
        ? { position: 'fixed', top: rect.bottom + 4, right: window.innerWidth - rect.right, width: PANEL_W }
        : { position: 'fixed', top: rect.bottom + 4, left: rect.left, width: PANEL_W }
    );
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open) {
      // Prefill dari nilai tersimpan sebelumnya, bukan kosong.
      setP(length != null ? String(length) : '');
      setL(width != null ? String(width) : '');
      setT(height != null ? String(height) : '');
      recalc();
    }
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

  const pNum = parseFloat(p) || 0;
  const lNum = parseFloat(l) || 0;
  const tNum = t.trim() === '' ? null : parseFloat(t) || 0;
  const isVolume = tNum !== null;
  const result = isVolume ? pNum * lNum * (tNum ?? 0) : pNum * lNum;
  const canApply = pNum > 0 && lNum > 0;

  const handleApply = () => {
    if (!canApply) return;
    onApply({ qty: result, length: pNum, width: lNum, height: tNum });
    setOpen(false);
  };

  const panel = (
    <div
      style={style}
      className="z-[9999] bg-card border border-border/70 rounded-xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.14)] p-3 space-y-2.5"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="text-xs font-700 text-foreground">Hitung dari Ukuran</p>
      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <label className="tooltip-label block mb-1">Panjang</label>
          <input type="number" inputMode="decimal" min={0} value={p}
            onChange={(e) => setP(e.target.value)}
            className="erp-input text-sm font-tabular" placeholder="0" autoFocus />
        </div>
        <div>
          <label className="tooltip-label block mb-1">Lebar</label>
          <input type="number" inputMode="decimal" min={0} value={l}
            onChange={(e) => setL(e.target.value)}
            className="erp-input text-sm font-tabular" placeholder="0" />
        </div>
        <div>
          <label className="tooltip-label block mb-1">Tinggi</label>
          <input type="number" inputMode="decimal" min={0} value={t}
            onChange={(e) => setT(e.target.value)}
            className="erp-input text-sm font-tabular" placeholder="opsional" />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Mode {isVolume ? 'Volume (P×L×T)' : 'Luas (P×L)'} — Qty = <span className="font-600 text-foreground">{result || 0}</span>
      </p>
      <button
        onClick={handleApply}
        disabled={!canApply}
        className="w-full min-h-9 flex items-center justify-center text-xs font-600 text-white bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        Terapkan
      </button>
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title="Hitung dari Ukuran"
        onClick={handleToggle}
        className={`flex items-center justify-center w-5 h-5 rounded-full border shadow-sm transition-colors flex-shrink-0 ${
          open
            ? 'bg-primary text-white border-primary'
            : 'bg-card text-muted-foreground border-border hover:text-primary hover:border-primary'
        }`}
      >
        <Ruler size={11} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(panel, document.body)}
    </>
  );
}

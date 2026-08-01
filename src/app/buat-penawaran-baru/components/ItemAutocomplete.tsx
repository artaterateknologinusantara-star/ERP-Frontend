'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Package } from 'lucide-react';
import { itemMasterService } from '@/services/itemmaster.service';
import type { ItemMaster } from '@/types';
import { formatRp } from '@/lib/format';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: ItemMaster) => void;
}

export default function ItemAutocomplete({ value, onChange, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await itemMasterService.list({ search: q, perPage: 10, isActive: true });
        setItems(res.data);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, []);

  useEffect(() => {
    if (open) search(value);
  }, [value, open, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFocus = () => {
    setOpen(true);
    setActiveIndex(-1);
    search(value);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setActiveIndex(-1);
    if (!open) setOpen(true);
  };

  const handleSelect = (item: ItemMaster) => {
    onSelect(item);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(items[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className="erp-input text-base w-full"
        placeholder="Nama equipment"
        autoComplete="off"
      />

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-[380px] bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
              <span className="w-3 h-3 border-2 border-muted border-t-primary rounded-full animate-spin" />
              Mencari item...
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
              <Search size={13} /> Tidak ada item ditemukan
            </div>
          ) : (
            <ul className="max-h-56 overflow-y-auto">
              {items.map((item, idx) => (
                <li
                  key={item.id}
                  onMouseDown={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 cursor-pointer border-b border-border/50 last:border-0 transition-colors
                    ${idx === activeIndex ? 'bg-primary/10' : 'hover:bg-muted/60'}`}
                >
                  <div className="mt-0.5 shrink-0 w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                    <Package size={12} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-700 text-foreground truncate">{item.name}</span>
                      <span className="text-xs font-tabular text-primary shrink-0">{formatRp(item.sellingPrice)}</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground font-mono">{item.code}</span>
                      {item.brand && <span className="text-[10px] text-muted-foreground">• {item.brand}</span>}
                      <span className="text-[10px] text-muted-foreground">• {item.uom}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

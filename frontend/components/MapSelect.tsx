'use client';

import { useEffect, useRef, useState } from 'react';

export interface MapSelectOption {
  label: string;
  value: string;
}

export interface MapSelectProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: MapSelectOption[];
  disabled?: boolean;
  loading?: boolean;
}

const primary     = '#0d6e69';
const textColor   = '#1a2e2d';
const borderColor = 'rgba(13,110,105,0.25)';
const borderFocus = 'rgba(13,110,105,0.55)';
const bg          = 'rgba(244,247,251,0.96)';
const bgDropdown  = '#f0f4f9';
const hoverBg     = 'rgba(13,110,105,0.08)';
const activeBg    = 'rgba(13,110,105,0.14)';
const shadow      = '0 2px 8px rgba(13,110,105,0.1)';
const dropShadow  = '0 8px 24px rgba(13,110,105,0.14)';

export function MapSelect({ value, onChange, placeholder, options, disabled, loading }: MapSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative" style={{ minWidth: '108px' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 pl-3 pr-2.5 py-1.5 rounded-lg font-jakarta font-medium text-xs transition-all"
        style={{
          background: bg,
          border: `1px solid ${open ? borderFocus : borderColor}`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: selected ? primary : 'rgba(13,110,105,0.4)',
          boxShadow: shadow,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        <span>{loading ? '불러오는 중…' : (selected?.label ?? placeholder)}</span>
        <svg
          width="9" height="9" viewBox="0 0 24 24" fill="none"
          stroke={primary} strokeWidth="2.5" strokeLinecap="round"
          style={{
            opacity: disabled ? 0.3 : 0.6,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease',
            flexShrink: 0,
          }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 rounded-xl overflow-hidden z-[1100]"
          style={{
            background: bgDropdown,
            border: `1px solid ${borderFocus}`,
            boxShadow: dropShadow,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            minWidth: '100%',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 font-jakarta text-xs" style={{ color: textColor, opacity: 0.4 }}>
              항목 없음
            </div>
          ) : (
            options.map((o, idx) => {
              const isSelected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className="w-full text-left px-3 py-2 font-jakarta text-xs transition-colors"
                  style={{
                    background: isSelected ? activeBg : 'transparent',
                    color: isSelected ? primary : textColor,
                    fontWeight: isSelected ? 600 : 400,
                    borderBottom: idx < options.length - 1 ? '1px solid rgba(13,110,105,0.08)' : 'none',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {isSelected && (
                    <svg
                      className="inline mr-1.5 -mt-0.5"
                      width="9" height="9" viewBox="0 0 24 24" fill="none"
                      stroke={primary} strokeWidth="3" strokeLinecap="round"
                    >
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  )}
                  {o.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

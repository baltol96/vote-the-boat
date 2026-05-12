import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const SEP = 'rgba(100,135,165,0.4)';

type Section = 'member' | 'governor' | 'election';

interface SubItem {
  label: string;
  href: string | null;
  mode?: 'member' | 'governor';
}

interface NavSection {
  section: Section;
  label: string;
  items: SubItem[];
}

const NAV: NavSection[] = [
  {
    section: 'member',
    label: '국회의원',
    items: [
      { label: '지도보기', href: '/', mode: 'member' },
      { label: '전체보기', href: '/members' },
    ],
  },
  {
    section: 'governor',
    label: '지자체장',
    items: [
      { label: '지도보기', href: '/', mode: 'governor' },
      { label: '전체보기', href: null },
    ],
  },
  {
    section: 'election',
    label: '2026 지방선거',
    items: [
      { label: '지도보기', href: null },
      { label: '전체보기', href: null },
    ],
  },
];

interface HeaderProps {
  activeSection?: Section;
  onModeChange?: (mode: 'member' | 'governor') => void;
  children?: React.ReactNode;
}

export default function Header({ activeSection, onModeChange, children }: HeaderProps) {
  const router = useRouter();
  const [openSection, setOpenSection] = useState<Section | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = (section: Section) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpenSection(section);
  };

  const scheduleClose = () => {
    closeTimerRef.current = setTimeout(() => setOpenSection(null), 200);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const handleSubItemClick = (item: SubItem) => {
    setOpenSection(null);
    if (!item.href) return;
    if (item.mode && onModeChange) {
      onModeChange(item.mode);
      return;
    }
    router.push(item.href);
  };

  return (
    <header
      className="relative shrink-0 z-[1010]"
      style={{
        background: 'rgba(244,247,251,0.94)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${SEP}`,
      }}
    >
      {/* ── 상단 행: 로고 + children (검색바, 통계) ── */}
      <div className="flex items-center justify-center gap-3 px-4 h-12 border-b" style={{ borderColor: SEP }}>
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 select-none">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-manrope font-bold"
            style={{
              background: 'var(--color-primary-container)',
              color: 'var(--color-primary-fixed)',
              fontSize: '0.55rem',
              letterSpacing: '0.04em',
            }}
          >
            V/B
          </div>
          <div className="hidden sm:flex flex-col leading-none gap-0.5">
            <span className="font-manrope text-sm font-bold" style={{ color: 'var(--color-on-surface)' }}>
              Vote the Boat
            </span>
            <span
              className="font-jakarta font-medium"
              style={{ fontSize: '0.6rem', color: 'var(--color-primary)', letterSpacing: '0.04em' }}
            >
              22대 국회 의정활동 투명성
            </span>
          </div>
        </Link>

        {/* children (검색바, 통계 등) */}
        <div className="flex items-center gap-3">
          {children}
        </div>
      </div>

      {/* ── 하단 행: 네비게이션 메뉴 ── */}
      <nav
        className="hidden md:flex items-stretch justify-center h-10"
        onMouseLeave={scheduleClose}
        onMouseEnter={cancelClose}
      >
        {NAV.map((navItem) => {
          const isActive = activeSection === navItem.section;
          const isOpen = openSection === navItem.section;
          return (
            <button
              key={navItem.section}
              onMouseEnter={() => openMenu(navItem.section)}
              onClick={() => handleSubItemClick(navItem.items[0])}
              className="flex items-center px-6 h-full font-jakarta text-sm font-medium transition-colors duration-150"
              style={{
                color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface)',
                opacity: isActive ? 1 : isOpen ? 0.9 : 0.6,
                borderBottom: isActive || isOpen ? '2px solid var(--color-primary)' : '2px solid transparent',
              }}
            >
              {navItem.label}
            </button>
          );
        })}
      </nav>

      {/* ── 메가메뉴 드롭다운 ── */}
      {openSection !== null && (
        <div
          className="absolute left-0 right-0 top-full"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          style={{
            background: 'rgba(244,247,251,0.98)',
            borderBottom: `1px solid ${SEP}`,
            boxShadow: '0 8px 24px rgba(13,110,105,0.10)',
          }}
        >
          <div className="flex justify-center px-4">
            {NAV.map((navItem, idx) => {
              const isHighlighted = openSection === navItem.section;
              return (
                <div
                  key={navItem.section}
                  className="py-5 transition-colors duration-150"
                  style={{
                    width: '180px',
                    flexShrink: 0,
                    background: isHighlighted ? 'rgba(13,110,105,0.04)' : 'transparent',
                    borderRight: idx < NAV.length - 1 ? `1px solid ${SEP}` : 'none',
                    paddingLeft: '24px',
                    paddingRight: '24px',
                  }}
                  onMouseEnter={() => { cancelClose(); setOpenSection(navItem.section); }}
                >
                  <div className="flex flex-col gap-2">
                    {navItem.items.map((subItem) => {
                      const disabled = !subItem.href;
                      return (
                        <button
                          key={subItem.label}
                          onClick={() => !disabled && handleSubItemClick(subItem)}
                          className="flex items-center gap-1.5 text-left font-jakarta text-sm w-full"
                          style={{
                            color: 'var(--color-on-surface)',
                            opacity: disabled ? 0.28 : 0.72,
                            cursor: disabled ? 'default' : 'pointer',
                          }}
                        >
                          {subItem.label}
                          {disabled && (
                            <span
                              className="font-jakarta"
                              style={{ fontSize: '0.6rem', color: 'var(--color-primary)', opacity: 0.55 }}
                            >
                              준비 중
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}

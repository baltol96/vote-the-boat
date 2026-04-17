'use client';

import React from 'react';
import type { MemberResponse } from '@/lib/api';
import { PARTY_COLORS, PARTY_COLOR_FALLBACK } from '@/lib/constants';

function getPartyBadgeStyle(party?: string): React.CSSProperties {
  if (!party) return { backgroundColor: `${PARTY_COLOR_FALLBACK}26`, color: PARTY_COLOR_FALLBACK };
  for (const [key, color] of Object.entries(PARTY_COLORS)) {
    if (party.includes(key)) return { backgroundColor: `${color}26`, color };
  }
  return { backgroundColor: `${PARTY_COLOR_FALLBACK}26`, color: PARTY_COLOR_FALLBACK };
}

interface MemberProfileProps {
  member: MemberResponse;
}

export function MemberProfile({ member }: MemberProfileProps) {
  return (
    <div
      className="flex items-center gap-5 px-6 py-5"
      style={{ borderBottom: '1px solid rgba(100,135,165,0.25)' }}
    >
      {member.photoUrl ? (
        <img
          src={member.photoUrl}
          alt={member.name}
          className="w-14 h-18 object-cover rounded-xl"
          style={{ border: '1px solid rgba(100,135,165,0.3)' }}
        />
      ) : (
        <div className="w-14 h-18 rounded-xl flex items-center justify-center text-on-surface/30 text-xs font-jakarta bg-surface-high">
          사진없음
        </div>
      )}
      <div className="flex flex-col gap-2">
        <span className="font-manrope text-2xl font-bold text-on-surface">{member.name}</span>
        <span
          className="text-xs px-3 py-1 rounded-full w-fit font-jakarta font-medium"
          style={getPartyBadgeStyle(member.party)}
        >
          {member.party}
        </span>
        <span className="font-jakarta text-xs text-on-surface/50">
          {member.electionType !== '지역구' ? `${member.electionType} · ` : ''}{member.termCount ? `${member.termCount}선` : ''}
        </span>
      </div>
    </div>
  );
}

import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

export interface MemberResponse {
  monaCd: string;
  name: string;
  nameHan?: string;
  party: string;
  district: string;
  sggCode: string;
  sido: string;
  electionType: string;
  termCount: string;
  birthDate?: string;
  gender?: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  officeRoom?: string;
  status: string;
  // 역대국회의원현황 API 전기 정보
  bon?: string;
  posi?: string;
  hak?: string;
  hobby?: string;
  book?: string;
  sang?: string;
  dead?: string;
  heritageUrl?: string;
}

export interface HistoricalRepresentativeResponse {
  termNumber: number;
  name: string;
  nameHan?: string;
  party: string;
  district: string;
  electionType: string;
  monaCd: string;
  photoUrl?: string;
}

export interface BillResponse {
  billNo: string;
  billName: string;
  proposerName: string;
  proposeDt: string;
  status: string;
  passDt?: string;
  committee?: string;
  summary?: string;
  proposerRole?: string; // '대표발의' | '공동발의'
}

export interface VoteResponse {
  billNo: string;
  billName: string;
  voteDt: string;
  result: 'YES' | 'NO' | 'ABSTAIN' | 'ABSENT';
  billUrl?: string;
  currCommittee?: string;
}

export interface AttendanceResponse {
  monaCd: string;
  totalVotes: number;
  attendedVotes: number;
  attendanceRate: number;
  yesCount: number;
  noCount: number;
  abstainCount: number;
  absentCount: number;
}

export interface AttendanceSummaryResponse {
  plenary: {
    totalCount: number;
    presentCount: number;
    absentCount: number;
    leaveCount: number;
    officialTripCount: number;
    recentRecords: {
      sessionNo: number;
      meetingNo: number;
      meetingDt: string;
      status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'OFFICIAL_TRIP';
    }[];
  };
  committees: {
    committeeName: string;
    totalCount: number;
    presentCount: number;
    absentCount: number;
    leaveCount: number;
    officialTripCount: number;
    recentRecords: {
      sessionNo: number;
      meetingNo: number;
      meetingDt: string;
      status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'OFFICIAL_TRIP';
    }[];
  }[];
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export const districtApi = {
  getMemberBySggCode: (sggCode: string) =>
    api.get<MemberResponse>(`/districts/${sggCode}/member`).then(r => r.data),

  getHistory: (sggCode: string) =>
    api.get<HistoricalRepresentativeResponse[]>(`/districts/${sggCode}/history`).then(r => r.data),
};

export const memberApi = {
  getMember: (monaCode: string) =>
    api.get<MemberResponse>(`/members/${monaCode}`).then(r => r.data),

  getBills: (monaCode: string, page = 0, size = 20) =>
    api.get<PageResponse<BillResponse>>(`/members/${monaCode}/bills`, {
      params: { page, size },
    }).then(r => r.data),

  getVotes: (monaCode: string, page = 0, size = 20, result?: string | null) =>
    api.get<PageResponse<VoteResponse>>(`/members/${monaCode}/votes`, {
      params: { page, size, ...(result ? { result } : {}) },
    }).then(r => r.data),

  getAttendance: (monaCode: string) =>
    api.get<AttendanceResponse>(`/members/${monaCode}/attendance`).then(r => r.data),

  getAttendanceSummary: (monaCode: string) =>
    api.get<AttendanceSummaryResponse>(`/members/${monaCode}/attendance-summary`).then(r => r.data),

  search: (params: { name?: string; party?: string; sido?: string }) =>
    api.get<MemberResponse[]>('/members/search', { params }).then(r => r.data),
};

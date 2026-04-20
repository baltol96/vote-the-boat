-- MemberStatus에 RESIGNED(22대 당선 후 의원직 이탈) 추가
ALTER TABLE members DROP CONSTRAINT members_status_check;
ALTER TABLE members ADD CONSTRAINT members_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'RESIGNED'));

-- 22대 당선 후 의원직 이탈한 의원 RESIGNED 처리
-- 이재명: 대통령 당선 사퇴 (2025-06-04)
UPDATE members SET status = 'RESIGNED' WHERE mona_cd = 'IUD9392R';

-- 강훈식: 대통령비서실장 임명 사퇴 (2025-06-05)
UPDATE members SET status = 'RESIGNED' WHERE mona_cd = 'TRE2429O';

-- 위성락: 국가안보실장 임명 사퇴 (2025-06-04)
UPDATE members SET status = 'RESIGNED' WHERE mona_cd = 'T9E37304';

-- 강유정: 대통령 대변인 임명 사퇴 (2025-06-04)
UPDATE members SET status = 'RESIGNED' WHERE mona_cd = 'Q129715Y';

-- 전재수: 해양수산부 장관 → 사퇴 후 부산시장 출마 사퇴 (2026-04-30)
UPDATE members SET status = 'RESIGNED' WHERE mona_cd = '9YO73104';

-- 권성동: 의원직 상실 (2025년 하반기, 정치자금법 위반)
UPDATE members SET status = 'RESIGNED' WHERE mona_cd = 'GDG1847Z';

-- 윤종오: 의원직 사퇴 (2026-02-04)
UPDATE members SET status = 'RESIGNED' WHERE mona_cd = '3TP65086';

-- 이춘석: 더불어민주당 제명 후 의원직 상실 (2025년)
UPDATE members SET status = 'RESIGNED' WHERE mona_cd = 'V2R7430Z';

-- 강선우: 더불어민주당 제명 (2026-01-01)
UPDATE members SET status = 'RESIGNED' WHERE mona_cd = 'MNZ4401T';

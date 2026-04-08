-- V3: 의원 대수(代數) 컬럼 추가
-- 배치 실행 후 GTELT_ERACO 기반으로 정확한 값으로 갱신됨

ALTER TABLE members ADD COLUMN IF NOT EXISTS assembly_term INTEGER;
CREATE INDEX IF NOT EXISTS idx_member_assembly_term ON members (assembly_term);

-- 기존 ACTIVE 의원은 임시로 22대로 설정 (배치 재실행 전까지의 임시값)
UPDATE members SET assembly_term = 22 WHERE status = 'ACTIVE';

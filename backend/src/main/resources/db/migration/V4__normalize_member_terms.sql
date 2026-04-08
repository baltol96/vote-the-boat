-- V4: 당선 이력 정규화 — member_terms 테이블 분리
-- party / district / election_type / sgg_code / term_count / sido → member_terms

CREATE TABLE IF NOT EXISTS member_terms (
    id            BIGSERIAL PRIMARY KEY,
    member_id     BIGINT       NOT NULL REFERENCES members(id),
    term_number   INTEGER      NOT NULL,           -- 22 = 22대
    party         VARCHAR(50),
    district      VARCHAR(100),
    election_type VARCHAR(20),
    sgg_code      VARCHAR(20),
    UNIQUE (member_id, term_number)
);

CREATE INDEX IF NOT EXISTS idx_member_terms_member_id   ON member_terms (member_id);
CREATE INDEX IF NOT EXISTS idx_member_terms_sgg_code    ON member_terms (sgg_code);
CREATE INDEX IF NOT EXISTS idx_member_terms_term_number ON member_terms (term_number);

-- 기존 members.assembly_term 데이터를 member_terms로 이관
INSERT INTO member_terms (member_id, term_number, party, district, election_type, sgg_code)
SELECT id, assembly_term, party, district, election_type, sgg_code
FROM   members
WHERE  assembly_term IS NOT NULL
ON CONFLICT (member_id, term_number) DO NOTHING;

-- 이관 완료 후 members에서 정규화 대상 컬럼 제거
ALTER TABLE members DROP COLUMN IF EXISTS party;
ALTER TABLE members DROP COLUMN IF EXISTS district;
ALTER TABLE members DROP COLUMN IF EXISTS sgg_code;
ALTER TABLE members DROP COLUMN IF EXISTS election_type;
ALTER TABLE members DROP COLUMN IF EXISTS term_count;
ALTER TABLE members DROP COLUMN IF EXISTS sido;

-- V8: 발의자 관계 테이블 추가 (대표발의/공동발의 구분)
CREATE TABLE IF NOT EXISTS bill_proposers (
    id            BIGSERIAL PRIMARY KEY,
    bill_no       VARCHAR(30)  NOT NULL,
    mona_cd       VARCHAR(20)  NOT NULL,
    role          VARCHAR(10)  NOT NULL,
    proposer_name VARCHAR(100),
    created_at    TIMESTAMP,
    CONSTRAINT uk_bill_proposer UNIQUE (bill_no, mona_cd)
);

CREATE INDEX IF NOT EXISTS idx_bill_proposer_bill_no      ON bill_proposers (bill_no);
CREATE INDEX IF NOT EXISTS idx_bill_proposer_mona_cd      ON bill_proposers (mona_cd);
CREATE INDEX IF NOT EXISTS idx_bill_proposer_mona_cd_role ON bill_proposers (mona_cd, role);

-- 기존 bills 테이블의 대표발의자 데이터 백필
INSERT INTO bill_proposers (bill_no, mona_cd, role, proposer_name, created_at)
SELECT bill_no, mona_cd, 'MAIN', proposer_name, created_at
FROM bills
WHERE mona_cd IS NOT NULL
ON CONFLICT DO NOTHING;

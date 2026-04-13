-- V11: votes 테이블에 대수(AGE) 컬럼 추가
ALTER TABLE votes ADD COLUMN IF NOT EXISTS age VARCHAR(5);

CREATE INDEX IF NOT EXISTS idx_vote_age ON votes (age);

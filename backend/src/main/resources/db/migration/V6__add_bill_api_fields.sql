-- V6: bills 테이블에 API 신규 필드 추가
ALTER TABLE bills
    ADD COLUMN IF NOT EXISTS bill_id      VARCHAR(50),
    ADD COLUMN IF NOT EXISTS proc_result  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS age          VARCHAR(5),
    ADD COLUMN IF NOT EXISTS detail_link  VARCHAR(500);

-- proposer_name, committee 컬럼 크기 확장
ALTER TABLE bills
    ALTER COLUMN proposer_name TYPE VARCHAR(50),
    ALTER COLUMN committee     TYPE VARCHAR(100);

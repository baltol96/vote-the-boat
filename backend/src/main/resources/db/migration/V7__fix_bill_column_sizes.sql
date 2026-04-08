-- V7: bills 컬럼 크기 재조정 (V6에서 ALTER COLUMN이 미적용된 경우 대비)
ALTER TABLE bills ALTER COLUMN proposer_name TYPE VARCHAR(50);
ALTER TABLE bills ALTER COLUMN committee     TYPE VARCHAR(100);

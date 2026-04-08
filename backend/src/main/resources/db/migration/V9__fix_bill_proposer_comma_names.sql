-- V9: bill_proposers 콤마 데이터 정리
-- V8 백필 시 발생한 두 가지 오염 케이스 수정:
-- 1) mona_cd에 콤마 포함 ('FU53642G,JQA21112') → 배치가 이미 분리된 행을 삽입했으므로 오염 행만 삭제
-- 2) proposer_name에 콤마 포함 ('허영,한기호') → 첫 번째 이름만 유지

DELETE FROM bill_proposers
WHERE mona_cd LIKE '%,%';

UPDATE bill_proposers
SET proposer_name = TRIM(SPLIT_PART(proposer_name, ',', 1))
WHERE proposer_name LIKE '%,%';

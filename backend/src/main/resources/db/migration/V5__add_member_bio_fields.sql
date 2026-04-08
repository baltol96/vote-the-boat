-- 역대국회의원현황(nprlapfmaufmqytet) API 수집 전기 정보 컬럼 추가
ALTER TABLE members
    ADD COLUMN IF NOT EXISTS name_han    VARCHAR(60),
    ADD COLUMN IF NOT EXISTS bon         VARCHAR(60),
    ADD COLUMN IF NOT EXISTS posi        VARCHAR(60),
    ADD COLUMN IF NOT EXISTS hak         TEXT,
    ADD COLUMN IF NOT EXISTS hobby       TEXT,
    ADD COLUMN IF NOT EXISTS book        TEXT,
    ADD COLUMN IF NOT EXISTS sang        TEXT,
    ADD COLUMN IF NOT EXISTS dead        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS heritage_url VARCHAR(255);

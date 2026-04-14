-- 상임위/특위 출결현황 테이블
CREATE TABLE committee_attendances (
    id              BIGSERIAL    PRIMARY KEY,
    mona_cd         VARCHAR(20),
    member_name     VARCHAR(20)  NOT NULL,
    committee_name  VARCHAR(200) NOT NULL,
    session_no      INTEGER      NOT NULL,
    meeting_no      INTEGER      NOT NULL,
    meeting_dt      DATE         NOT NULL,
    status          VARCHAR(20)  NOT NULL,
    file_seq        BIGINT       NOT NULL,
    created_at      TIMESTAMP,
    CONSTRAINT uk_committee_att_key UNIQUE (member_name, committee_name, session_no, meeting_no)
);

CREATE INDEX idx_committee_att_mona_cd    ON committee_attendances (mona_cd);
CREATE INDEX idx_committee_att_committee  ON committee_attendances (committee_name, session_no);

-- 처리 완료된 파일 이력 (재처리 방지)
CREATE TABLE processed_committee_files (
    file_seq        BIGINT        PRIMARY KEY,
    committee_name  VARCHAR(200)  NOT NULL,
    file_name       VARCHAR(200)  NOT NULL,
    row_count       INTEGER       NOT NULL,
    processed_at    TIMESTAMP     NOT NULL
);

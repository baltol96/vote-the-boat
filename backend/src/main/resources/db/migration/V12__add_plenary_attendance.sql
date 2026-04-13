-- 본회의 출결현황 테이블
CREATE TABLE plenary_attendances (
    id           BIGSERIAL PRIMARY KEY,
    mona_cd      VARCHAR(20),
    member_name  VARCHAR(20)  NOT NULL,
    session_no   INTEGER      NOT NULL,
    meeting_no   INTEGER      NOT NULL,
    meeting_dt   DATE         NOT NULL,
    status       VARCHAR(20)  NOT NULL,
    file_seq     BIGINT       NOT NULL,
    created_at   TIMESTAMP,
    CONSTRAINT uk_plenary_att_name_session_meeting UNIQUE (member_name, session_no, meeting_no)
);

CREATE INDEX idx_plenary_att_mona_cd ON plenary_attendances (mona_cd);
CREATE INDEX idx_plenary_att_session  ON plenary_attendances (session_no, meeting_no);

-- 처리 완료된 파일 이력 테이블
CREATE TABLE processed_plenary_files (
    file_seq     BIGINT       PRIMARY KEY,
    session_no   INTEGER      NOT NULL,
    file_name    VARCHAR(100) NOT NULL,
    row_count    INTEGER      NOT NULL,
    processed_at TIMESTAMP    NOT NULL
);

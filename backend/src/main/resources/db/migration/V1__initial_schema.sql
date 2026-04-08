-- V1: 초기 스키마 생성
-- Flyway가 이 파일을 실행하기 전에 테이블이 이미 존재할 수 있으므로 IF NOT EXISTS 사용

CREATE TABLE IF NOT EXISTS members (
    id            BIGSERIAL PRIMARY KEY,
    mona_cd       VARCHAR(20)  NOT NULL,
    name          VARCHAR(20)  NOT NULL,
    party         VARCHAR(20),
    district      VARCHAR(100),
    sgg_code      VARCHAR(20),
    sido          VARCHAR(20),
    election_type VARCHAR(10),
    term_count    VARCHAR(5),
    birth_date    DATE,
    gender        VARCHAR(10),
    photo_url     VARCHAR(255),
    email         VARCHAR(255),
    phone         VARCHAR(50),
    office_room   VARCHAR(20),
    status        VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMP,
    updated_at    TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_mona_cd ON members (mona_cd);
CREATE INDEX IF NOT EXISTS idx_member_sgg_code ON members (sgg_code);


CREATE TABLE IF NOT EXISTS bills (
    id            BIGSERIAL PRIMARY KEY,
    bill_no       VARCHAR(30)  NOT NULL,
    bill_name     VARCHAR(200) NOT NULL,
    mona_cd       VARCHAR(20)  NOT NULL,
    proposer_name VARCHAR(20),
    propose_dt    DATE,
    status        VARCHAR(20)  NOT NULL DEFAULT 'PROPOSED',
    pass_dt       DATE,
    summary       TEXT,
    committee     VARCHAR(50),
    created_at    TIMESTAMP,
    updated_at    TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bill_bill_no ON bills (bill_no);
CREATE INDEX IF NOT EXISTS idx_bill_mona_cd ON bills (mona_cd);
CREATE INDEX IF NOT EXISTS idx_bill_propose_dt ON bills (propose_dt);


CREATE TABLE IF NOT EXISTS votes (
    id         BIGSERIAL PRIMARY KEY,
    mona_cd    VARCHAR(20)  NOT NULL,
    bill_no    VARCHAR(30)  NOT NULL,
    bill_name  VARCHAR(200) NOT NULL,
    vote_dt    DATE,
    result     VARCHAR(10)  NOT NULL,
    created_at TIMESTAMP,
    CONSTRAINT uk_vote_mona_cd_bill_no UNIQUE (mona_cd, bill_no)
);

CREATE INDEX IF NOT EXISTS idx_vote_mona_cd ON votes (mona_cd);
CREATE INDEX IF NOT EXISTS idx_vote_bill_no ON votes (bill_no);
CREATE INDEX IF NOT EXISTS idx_vote_mona_cd_vote_dt ON votes (mona_cd, vote_dt);


CREATE TABLE IF NOT EXISTS assets (
    id              BIGSERIAL PRIMARY KEY,
    mona_cd         VARCHAR(20)      NOT NULL,
    declare_year    INTEGER          NOT NULL,
    total_amount    NUMERIC(15, 0),
    land_amount     NUMERIC(15, 0),
    building_amount NUMERIC(15, 0),
    deposit_amount  NUMERIC(15, 0),
    stock_amount    NUMERIC(15, 0),
    debt_amount     NUMERIC(15, 0),
    raw_data        TEXT,
    created_at      TIMESTAMP,
    CONSTRAINT uk_asset_mona_cd_declare_year UNIQUE (mona_cd, declare_year)
);

CREATE INDEX IF NOT EXISTS idx_asset_mona_cd ON assets (mona_cd);
CREATE INDEX IF NOT EXISTS idx_asset_declare_year ON assets (declare_year);


CREATE TABLE IF NOT EXISTS criminals (
    id           BIGSERIAL PRIMARY KEY,
    mona_cd      VARCHAR(20)  NOT NULL,
    crime_type   VARCHAR(100) NOT NULL,
    sentence     VARCHAR(50),
    court        VARCHAR(200),
    detail       TEXT,
    election_year INTEGER     NOT NULL,
    created_at   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_criminal_mona_cd ON criminals (mona_cd);

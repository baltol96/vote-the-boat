CREATE TABLE governor_pledges (
    id           BIGSERIAL PRIMARY KEY,
    huboid       VARCHAR(20)  NOT NULL,
    pledge_order INT          NOT NULL,
    realm_name   VARCHAR(255),
    title        VARCHAR(255) NOT NULL,
    content      TEXT,
    created_at   TIMESTAMP
);

CREATE INDEX idx_governor_pledges_huboid ON governor_pledges (huboid);

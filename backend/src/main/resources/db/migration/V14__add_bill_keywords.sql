CREATE TABLE bill_keywords (
    id          BIGSERIAL PRIMARY KEY,
    bill_no     VARCHAR(30)  NOT NULL UNIQUE,
    category    VARCHAR(20),
    keywords    JSONB,
    summary     TEXT,
    status      VARCHAR(10)  NOT NULL DEFAULT 'SUCCESS',
    source_hash VARCHAR(64),
    generated_at TIMESTAMP
);

CREATE INDEX idx_bill_keywords_bill_no ON bill_keywords (bill_no);
CREATE INDEX idx_bill_keywords_category ON bill_keywords (category);

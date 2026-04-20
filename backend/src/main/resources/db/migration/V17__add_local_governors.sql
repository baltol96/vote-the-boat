CREATE TABLE local_governors (
    id          BIGSERIAL PRIMARY KEY,
    huboid      VARCHAR(20)  NOT NULL UNIQUE,
    sg_id       VARCHAR(10)  NOT NULL,
    governor_type VARCHAR(20) NOT NULL,
    sd_name     VARCHAR(50),
    sgg_name    VARCHAR(100),
    wiw_name    VARCHAR(50),
    name        VARCHAR(50)  NOT NULL,
    jd_name     VARCHAR(50),
    birthday    VARCHAR(10),
    gender      VARCHAR(5),
    addr        VARCHAR(300),
    job         VARCHAR(200),
    edu         VARCHAR(200),
    career1     VARCHAR(200),
    career2     VARCHAR(200),
    dugsu       VARCHAR(20),
    dugyul      VARCHAR(20),
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);

CREATE INDEX idx_local_governors_sd_name       ON local_governors(sd_name);
CREATE INDEX idx_local_governors_governor_type ON local_governors(governor_type);
CREATE INDEX idx_local_governors_sg_id         ON local_governors(sg_id);

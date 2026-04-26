# Oracle Cloud Free Tier 배포 계획

## 무료 리소스 현황

| 자원 | 무료 한도 | 이 프로젝트 활용 |
|---|---|---|
| **ARM A1 VM** | 4 OCPU + 24GB RAM (합산) | Spring Boot + DB + Redis |
| AMD VM | 2x (1/8 OCPU, 1GB) | 사용 안 함 (너무 작음) |
| Block Storage | 200GB | DB 볼륨 |
| Load Balancer | 1개 (10 Mbps) | HTTPS 처리 |
| Object Storage | 20GB | 로그·백업 |

---

## 목표 아키텍처

```
Vercel (Frontend / Next.js)
        │
        │ API 호출
        ▼
OCI Load Balancer  ──▶  Nginx (SSL 종료)
                              │
                        Docker Compose (A1 VM)
                        ├── Spring Boot :8080
                        ├── PostgreSQL :5432
                        └── Redis :6379
```

프론트엔드는 Vercel 유지 (이미 무료, CDN 포함). 백엔드만 OCI로 이전.

---

## 단계별 실행 계획

### 1단계 — OCI 인스턴스 생성

1. OCI 콘솔 → Compute → Instances → Create Instance
2. **Shape**: VM.Standard.A1.Flex (Ampere ARM)
   - OCPU: 4, RAM: 24GB (Free Tier 최대)
3. **OS**: Canonical Ubuntu 22.04 (ARM64)
4. SSH 키 생성·저장
5. **VCN Security List** 포트 개방: 22(SSH), 80(HTTP), 443(HTTPS)
   - 8080은 내부만 — 외부 노출 불필요

> OCI는 Security List 외에 **OS iptables도 별도 설정 필요** — 자주 놓치는 포인트

```bash
# VM 접속 후 OS 방화벽 설정
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

---

### 2단계 — VM 기본 환경 구성

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin netfilter-persistent
sudo usermod -aG docker ubuntu
```

---

### 3단계 — Dockerfile 작성 (백엔드)

`backend/Dockerfile`:

```dockerfile
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /app
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

> `eclipse-temurin:17` 이미지는 멀티아키텍처 지원 — ARM64 전용 설정 불필요

---

### 4단계 — docker-compose.yml 수정

현재 파일에 `app` 서비스 추가, DB·Redis 포트 외부 노출 제거:

```yaml
services:
  app:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/assembly
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
      ASSEMBLY_API_KEY: ${ASSEMBLY_API_KEY}
      ELECTION_API_KEY: ${ELECTION_API_KEY}
      ADMIN_API_KEY: ${ADMIN_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16
    container_name: vote-the-boat-db
    environment:
      POSTGRES_DB: assembly
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME}"]
      interval: 5s
      timeout: 5s
      retries: 5
    # 포트 외부 노출 제거 (보안)

  redis:
    image: redis:7-alpine
    container_name: vote-the-boat-redis
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
    # 포트 외부 노출 제거

volumes:
  postgres_data:
```

---

### 5단계 — Nginx + SSL 구성

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

`/etc/nginx/sites-available/api.yourdomain.com`:

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo certbot --nginx -d api.yourdomain.com
```

> 도메인 없으면 [DuckDNS](https://www.duckdns.org/) 무료 사용 가능

---

### 6단계 — DB 마이그레이션 (Railway → OCI)

```bash
# Railway에서 덤프
pg_dump -h <railway-host> -U <user> -d assembly > assembly_backup.sql

# OCI VM으로 전송
scp assembly_backup.sql ubuntu@<oci-ip>:~/

# OCI에서 복원
docker exec -i vote-the-boat-db psql -U assembly -d assembly < assembly_backup.sql
```

---

### 7단계 — GitHub Actions CI/CD

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to OCI

on:
  push:
    branches: [main]
    paths: [backend/**]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Build JAR
        run: cd backend && ./gradlew bootJar -x test

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.OCI_HOST }}
          username: ubuntu
          key: ${{ secrets.OCI_SSH_KEY }}
          script: |
            cd ~/vote-the-boat
            git pull origin main
            docker compose build app
            docker compose up -d --no-deps app
```

**GitHub Secrets 설정:**
- `OCI_HOST`: VM 공인 IP
- `OCI_SSH_KEY`: SSH 개인키 전체 내용

---

### 8단계 — 환경변수 설정

OCI VM에 `.env` 파일로 관리 (git 제외):

```bash
# ~/vote-the-boat/.env
DB_USERNAME=assembly
DB_PASSWORD=<strong-password>
ASSEMBLY_API_KEY=...
ELECTION_API_KEY=...
ADMIN_API_KEY=<strong-key>
```

---

### 9단계 — Vercel 환경변수 업데이트

Vercel 대시보드 → 프로젝트 Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 예상 리소스 사용량

| 서비스 | RAM | CPU |
|---|---|---|
| Spring Boot | ~512MB | 1 OCPU |
| PostgreSQL | ~256MB | 0.5 OCPU |
| Redis | ~128MB | 0.25 OCPU |
| **여유** | **~23GB** | **2+ OCPU** |

Spring Batch 작업 실행 시 CPU 일시 상승하지만 4 OCPU 기준 충분.

---

## 체크리스트

- [ ] OCI 계정 생성 + A1 인스턴스 생성 (4 OCPU, 24GB)
- [ ] VCN Security List 포트 개방 (22, 80, 443)
- [ ] OS iptables 방화벽 설정
- [ ] Docker + Docker Compose 설치
- [ ] `backend/Dockerfile` 작성
- [ ] `docker-compose.yml` 수정 (app 서비스 추가, DB 포트 제거)
- [ ] 도메인 연결 (DuckDNS 가능)
- [ ] Nginx 설치 + Certbot SSL 발급
- [ ] Railway DB 덤프 → OCI 복원
- [ ] GitHub Actions 배포 파이프라인 (Secrets 설정 포함)
- [ ] Vercel `NEXT_PUBLIC_API_URL` 업데이트

package com.assembly.adapter.out.batch;

import com.assembly.application.batch.port.in.BatchTriggerUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class BatchScheduler {

    private final BatchTriggerUseCase batchTriggerUseCase;

    // 매일 새벽 3시: 의원 → 법안 → 표결 순서로 실행
    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Seoul")
    public void runDailyCollection() {
        log.info("일일 배치 수집 시작: {}", LocalDateTime.now());
        try {
            batchTriggerUseCase.runAll();
            log.info("일일 배치 수집 완료");
        } catch (Exception e) {
            log.error("일일 배치 수집 실패", e);
        }
    }
}

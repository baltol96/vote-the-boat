package com.assembly.application.batch;

import com.assembly.application.batch.port.in.BatchTriggerUseCase;
import com.assembly.application.vote.port.out.VotePort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
public class BatchApplicationService implements BatchTriggerUseCase {

    private final JobLauncher asyncJobLauncher;
    private final Job collectMembersJob;
    private final Job collectBillsJob;
    private final Job collectVotesJob;
    private final Job collectHistoricalProfilesJob;
    private final Job collectPlenaryAttendanceJob;
    private final Job collectCommitteeAttendanceJob;
    private final Job collectAssetsJob;
    private final Job collectGovernorsJob;
    private final Job collectGovernorPledgesJob;
    private final VotePort votePort;

    public BatchApplicationService(@Qualifier("asyncJobLauncher") JobLauncher asyncJobLauncher,
                                   @Qualifier("collectMembersJob") Job collectMembersJob,
                                   @Qualifier("collectBillsJob") Job collectBillsJob,
                                   @Qualifier("collectVotesJob") Job collectVotesJob,
                                   @Qualifier("collectHistoricalProfilesJob") Job collectHistoricalProfilesJob,
                                   @Qualifier("collectPlenaryAttendanceJob") Job collectPlenaryAttendanceJob,
                                   @Qualifier("collectCommitteeAttendanceJob") Job collectCommitteeAttendanceJob,
                                   @Qualifier("collectAssetsJob") Job collectAssetsJob,
                                   @Qualifier("collectGovernorsJob") Job collectGovernorsJob,
                                   @Qualifier("collectGovernorPledgesJob") Job collectGovernorPledgesJob,
                                   VotePort votePort) {
        this.asyncJobLauncher = asyncJobLauncher;
        this.collectMembersJob = collectMembersJob;
        this.collectBillsJob = collectBillsJob;
        this.collectVotesJob = collectVotesJob;
        this.collectHistoricalProfilesJob = collectHistoricalProfilesJob;
        this.collectPlenaryAttendanceJob = collectPlenaryAttendanceJob;
        this.collectCommitteeAttendanceJob = collectCommitteeAttendanceJob;
        this.collectAssetsJob = collectAssetsJob;
        this.collectGovernorsJob = collectGovernorsJob;
        this.collectGovernorPledgesJob = collectGovernorPledgesJob;
        this.votePort = votePort;
    }

    @Override
    public BatchResult runMembers() {
        return run(collectMembersJob, "collectMembersJob");
    }

    @Override
    public BatchResult runBills() {
        return run(collectBillsJob, "collectBillsJob");
    }

    @Override
    public BatchResult runVotes() {
        return run(collectVotesJob, "collectVotesJob");
    }

    @Override
    public BatchResult runVotesReload() {
        log.info("votes 테이블 전체 삭제 시작");
        votePort.deleteAll();
        log.info("votes 테이블 전체 삭제 완료, 재수집 배치 시작");
        try {
            JobParameters params = new JobParametersBuilder()
                    .addLocalDateTime("runAt", LocalDateTime.now())
                    .addString("skipDuplicateCheck", "true")
                    .toJobParameters();
            JobExecution execution = asyncJobLauncher.run(collectVotesJob, params);
            log.info("collectVotesJob(reload) 시작: executionId={}, status={}", execution.getId(), execution.getStatus());
            return new BatchResult("collectVotesJob", execution.getId(), execution.getStatus().name());
        } catch (Exception e) {
            log.error("collectVotesJob(reload) 실행 실패", e);
            throw new RuntimeException("배치 실행 실패: collectVotesJob(reload) - " + e.getMessage(), e);
        }
    }

    @Override
    public BatchResult runHistoricalProfiles() {
        return run(collectHistoricalProfilesJob, "collectHistoricalProfilesJob");
    }

    @Override
    public BatchResult runPlenaryAttendance() {
        return run(collectPlenaryAttendanceJob, "collectPlenaryAttendanceJob");
    }

    @Override
    public BatchResult runCommitteeAttendance() {
        return run(collectCommitteeAttendanceJob, "collectCommitteeAttendanceJob");
    }

    @Override
    public Map<String, BatchResult> runAll() {
        JobParameters params = buildParams();
        try {
            JobExecution m = asyncJobLauncher.run(collectMembersJob, params);
            JobExecution b = asyncJobLauncher.run(collectBillsJob, params);
            JobExecution v = asyncJobLauncher.run(collectVotesJob, params);
            return Map.of(
                    "members", new BatchResult("collectMembersJob", m.getId(), m.getStatus().name()),
                    "bills",   new BatchResult("collectBillsJob",   b.getId(), b.getStatus().name()),
                    "votes",   new BatchResult("collectVotesJob",   v.getId(), v.getStatus().name())
            );
        } catch (Exception e) {
            log.error("전체 배치 실행 실패", e);
            throw new RuntimeException("전체 배치 실행 실패: " + e.getMessage(), e);
        }
    }

    @Override
    public BatchResult runAssets(String pdfPath, int declareYear) {
        try {
            JobParameters params = new JobParametersBuilder()
                    .addLocalDateTime("runAt", LocalDateTime.now())
                    .addString("pdfPath", pdfPath)
                    .addLong("declareYear", (long) declareYear)
                    .toJobParameters();
            JobExecution execution = asyncJobLauncher.run(collectAssetsJob, params);
            log.info("collectAssetsJob 시작: executionId={}, status={}", execution.getId(), execution.getStatus());
            return new BatchResult("collectAssetsJob", execution.getId(), execution.getStatus().name());
        } catch (Exception e) {
            log.error("collectAssetsJob 실행 실패", e);
            throw new RuntimeException("배치 실행 실패: collectAssetsJob - " + e.getMessage(), e);
        }
    }

    @Override
    public BatchResult runGovernors(String sgId) {
        try {
            JobParameters params = new JobParametersBuilder()
                    .addLocalDateTime("runAt", LocalDateTime.now())
                    .addString("sgId", sgId != null ? sgId : "20220601")
                    .toJobParameters();
            JobExecution execution = asyncJobLauncher.run(collectGovernorsJob, params);
            log.info("collectGovernorsJob 시작: executionId={}, status={}", execution.getId(), execution.getStatus());
            return new BatchResult("collectGovernorsJob", execution.getId(), execution.getStatus().name());
        } catch (Exception e) {
            log.error("collectGovernorsJob 실행 실패", e);
            throw new RuntimeException("배치 실행 실패: collectGovernorsJob - " + e.getMessage(), e);
        }
    }

    @Override
    public BatchResult runGovernorPledges(String sgId) {
        try {
            JobParameters params = new JobParametersBuilder()
                    .addLocalDateTime("runAt", LocalDateTime.now())
                    .addString("sgId", sgId != null ? sgId : "20220601")
                    .toJobParameters();
            JobExecution execution = asyncJobLauncher.run(collectGovernorPledgesJob, params);
            log.info("collectGovernorPledgesJob 시작: executionId={}, status={}", execution.getId(), execution.getStatus());
            return new BatchResult("collectGovernorPledgesJob", execution.getId(), execution.getStatus().name());
        } catch (Exception e) {
            log.error("collectGovernorPledgesJob 실행 실패", e);
            throw new RuntimeException("배치 실행 실패: collectGovernorPledgesJob - " + e.getMessage(), e);
        }
    }

    private BatchResult run(Job job, String jobName) {
        try {
            JobExecution execution = asyncJobLauncher.run(job, buildParams());
            log.info("{} 시작: executionId={}, status={}", jobName, execution.getId(), execution.getStatus());
            return new BatchResult(jobName, execution.getId(), execution.getStatus().name());
        } catch (Exception e) {
            log.error("{} 실행 실패", jobName, e);
            throw new RuntimeException("배치 실행 실패: " + jobName + " - " + e.getMessage(), e);
        }
    }

    private JobParameters buildParams() {
        return new JobParametersBuilder()
                .addLocalDateTime("runAt", LocalDateTime.now())
                .toJobParameters();
    }
}

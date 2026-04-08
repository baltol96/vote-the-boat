package com.assembly.adapter.in.web;

import com.assembly.application.batch.BatchResult;
import com.assembly.application.batch.port.in.BatchTriggerUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/batch")
@RequiredArgsConstructor
public class BatchController {

    private final BatchTriggerUseCase batchTriggerUseCase;

    @PostMapping("/members")
    public ResponseEntity<BatchResult> runMembersJob() {
        return ResponseEntity.ok(batchTriggerUseCase.runMembers());
    }

    @PostMapping("/bills")
    public ResponseEntity<BatchResult> runBillsJob() {
        return ResponseEntity.ok(batchTriggerUseCase.runBills());
    }

    @PostMapping("/votes")
    public ResponseEntity<BatchResult> runVotesJob() {
        return ResponseEntity.ok(batchTriggerUseCase.runVotes());
    }

    @PostMapping("/historical-profiles")
    public ResponseEntity<BatchResult> runHistoricalProfilesJob() {
        return ResponseEntity.ok(batchTriggerUseCase.runHistoricalProfiles());
    }

    @PostMapping("/all")
    public ResponseEntity<Map<String, BatchResult>> runAllJobs() {
        return ResponseEntity.ok(batchTriggerUseCase.runAll());
    }
}

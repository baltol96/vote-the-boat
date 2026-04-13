package com.assembly.application.batch.port.in;

import com.assembly.application.batch.BatchResult;

import java.util.Map;

public interface BatchTriggerUseCase {
    BatchResult runMembers();
    BatchResult runBills();
    BatchResult runVotes();
    BatchResult runVotesReload();  // votes 테이블 초기화 후 전체 재수집
    BatchResult runHistoricalProfiles();
    BatchResult runPlenaryAttendance();
    Map<String, BatchResult> runAll();
}

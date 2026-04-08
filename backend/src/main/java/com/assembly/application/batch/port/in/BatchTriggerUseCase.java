package com.assembly.application.batch.port.in;

import com.assembly.application.batch.BatchResult;

import java.util.Map;

public interface BatchTriggerUseCase {
    BatchResult runMembers();
    BatchResult runBills();
    BatchResult runVotes();
    BatchResult runHistoricalProfiles();
    Map<String, BatchResult> runAll();
}

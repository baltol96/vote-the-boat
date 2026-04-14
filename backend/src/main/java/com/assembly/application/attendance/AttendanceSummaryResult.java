package com.assembly.application.attendance;

import java.time.LocalDate;
import java.util.List;

public record AttendanceSummaryResult(
        PlenarySummary plenary,
        List<CommitteeSummary> committees
) {

    public record PlenarySummary(
            long totalCount,
            long presentCount,
            long absentCount,
            long leaveCount,
            long officialTripCount,
            List<PlenaryRecord> recentRecords
    ) {}

    public record PlenaryRecord(
            Integer sessionNo,
            Integer meetingNo,
            LocalDate meetingDt,
            String status
    ) {}

    public record CommitteeRecord(
            Integer sessionNo,
            Integer meetingNo,
            LocalDate meetingDt,
            String status
    ) {}

    public record CommitteeSummary(
            String committeeName,
            long totalCount,
            long presentCount,
            long absentCount,
            long leaveCount,
            long officialTripCount,
            List<CommitteeRecord> recentRecords
    ) {}
}

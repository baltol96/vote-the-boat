package com.assembly.application.vote;

public record AttendanceResult(
        String monaCd,
        long totalVotes,
        long attendedVotes,
        double attendanceRate,
        long yesCount,
        long noCount,
        long abstainCount,
        long absentCount
) {}

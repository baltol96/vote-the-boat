package com.assembly.application.attendance.port.in;

import com.assembly.application.attendance.AttendanceSummaryResult;

public interface GetAttendanceUseCase {
    AttendanceSummaryResult getAttendanceSummary(String monaCd);
}

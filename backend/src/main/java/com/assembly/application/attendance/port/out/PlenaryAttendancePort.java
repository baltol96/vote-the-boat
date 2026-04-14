package com.assembly.application.attendance.port.out;

import com.assembly.domain.attendance.AttendanceStatus;
import com.assembly.domain.attendance.PlenaryAttendance;

import java.util.List;

public interface PlenaryAttendancePort {
    List<PlenaryAttendance> saveAll(List<PlenaryAttendance> records);
    List<PlenaryAttendance> findByMonaCdOrderByMeetingDtDesc(String monaCd);
    long countByMonaCdAndStatus(String monaCd, AttendanceStatus status);
}

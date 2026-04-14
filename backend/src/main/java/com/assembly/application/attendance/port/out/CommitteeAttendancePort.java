package com.assembly.application.attendance.port.out;

import com.assembly.domain.attendance.AttendanceStatus;
import com.assembly.domain.attendance.CommitteeAttendance;

import java.util.List;

public interface CommitteeAttendancePort {
    List<CommitteeAttendance> saveAll(List<CommitteeAttendance> records);
    List<CommitteeAttendance> findByMonaCdOrderByMeetingDtDesc(String monaCd);
    List<String> findDistinctCommitteeNamesByMonaCd(String monaCd);
    long countByMonaCdAndCommitteeNameAndStatus(String monaCd, String committeeName, AttendanceStatus status);
    long countByMonaCdAndCommitteeName(String monaCd, String committeeName);
}

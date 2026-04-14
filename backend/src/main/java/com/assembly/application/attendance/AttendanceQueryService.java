package com.assembly.application.attendance;

import com.assembly.application.attendance.port.in.GetAttendanceUseCase;
import com.assembly.application.attendance.port.out.CommitteeAttendancePort;
import com.assembly.application.attendance.port.out.PlenaryAttendancePort;
import com.assembly.domain.attendance.AttendanceStatus;
import com.assembly.domain.attendance.CommitteeAttendance;
import com.assembly.domain.attendance.PlenaryAttendance;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AttendanceQueryService implements GetAttendanceUseCase {

    private final PlenaryAttendancePort plenaryAttendancePort;
    private final CommitteeAttendancePort committeeAttendancePort;

    @Override
    public AttendanceSummaryResult getAttendanceSummary(String monaCd) {
        AttendanceSummaryResult.PlenarySummary plenary = buildPlenarySummary(monaCd);
        List<AttendanceSummaryResult.CommitteeSummary> committees = buildCommitteeSummaries(monaCd);
        return new AttendanceSummaryResult(plenary, committees);
    }

    private AttendanceSummaryResult.PlenarySummary buildPlenarySummary(String monaCd) {
        long present     = plenaryAttendancePort.countByMonaCdAndStatus(monaCd, AttendanceStatus.PRESENT);
        long absent      = plenaryAttendancePort.countByMonaCdAndStatus(monaCd, AttendanceStatus.ABSENT);
        long leave       = plenaryAttendancePort.countByMonaCdAndStatus(monaCd, AttendanceStatus.LEAVE);
        long officialTrip = plenaryAttendancePort.countByMonaCdAndStatus(monaCd, AttendanceStatus.OFFICIAL_TRIP);
        long total = present + absent + leave + officialTrip;

        List<PlenaryAttendance> records = plenaryAttendancePort.findByMonaCdOrderByMeetingDtDesc(monaCd);
        List<AttendanceSummaryResult.PlenaryRecord> recentRecords = records.stream()
                .limit(50)
                .map(r -> new AttendanceSummaryResult.PlenaryRecord(
                        r.getSessionNo(), r.getMeetingNo(), r.getMeetingDt(), r.getStatus().name()))
                .toList();

        return new AttendanceSummaryResult.PlenarySummary(total, present, absent, leave, officialTrip, recentRecords);
    }

    private List<AttendanceSummaryResult.CommitteeSummary> buildCommitteeSummaries(String monaCd) {
        Map<String, List<CommitteeAttendance>> byCommittee =
                committeeAttendancePort.findByMonaCdOrderByMeetingDtDesc(monaCd).stream()
                        .collect(Collectors.groupingBy(CommitteeAttendance::getCommitteeName));

        return byCommittee.entrySet().stream()
                .map(entry -> {
                    String name = entry.getKey();
                    List<CommitteeAttendance> records = entry.getValue();

                    long present      = records.stream().filter(r -> r.getStatus() == AttendanceStatus.PRESENT).count();
                    long absent       = records.stream().filter(r -> r.getStatus() == AttendanceStatus.ABSENT).count();
                    long leave        = records.stream().filter(r -> r.getStatus() == AttendanceStatus.LEAVE).count();
                    long officialTrip = records.stream().filter(r -> r.getStatus() == AttendanceStatus.OFFICIAL_TRIP).count();
                    long total        = records.size();

                    List<AttendanceSummaryResult.CommitteeRecord> recentRecords = records.stream()
                            .map(r -> new AttendanceSummaryResult.CommitteeRecord(
                                    r.getSessionNo(), r.getMeetingNo(), r.getMeetingDt(), r.getStatus().name()))
                            .toList();

                    return new AttendanceSummaryResult.CommitteeSummary(
                            name, total, present, absent, leave, officialTrip, recentRecords);
                })
                .sorted((a, b) -> Long.compare(b.totalCount(), a.totalCount()))
                .toList();
    }
}

package com.assembly.adapter.out.persistence.attendance;

import com.assembly.application.attendance.port.out.CommitteeAttendancePort;
import com.assembly.application.attendance.port.out.ProcessedCommitteeFilePort;
import com.assembly.domain.attendance.AttendanceStatus;
import com.assembly.domain.attendance.CommitteeAttendance;
import com.assembly.domain.attendance.ProcessedCommitteeFile;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class CommitteeAttendancePersistenceAdapter implements CommitteeAttendancePort, ProcessedCommitteeFilePort {

    private static final String INSERT_IGNORE_SQL = """
            INSERT INTO committee_attendances
                (mona_cd, member_name, committee_name, session_no, meeting_no, meeting_dt, status, file_seq, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON CONFLICT (member_name, committee_name, session_no, meeting_no) DO NOTHING
            """;

    private final CommitteeAttendanceJpaRepository committeeAttendanceJpaRepository;
    private final ProcessedCommitteeFileRepository processedCommitteeFileRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public List<CommitteeAttendance> saveAll(List<CommitteeAttendance> records) {
        jdbcTemplate.batchUpdate(INSERT_IGNORE_SQL, records, records.size(),
                (ps, r) -> {
                    ps.setString(1, r.getMonaCd());
                    ps.setString(2, r.getMemberName());
                    ps.setString(3, r.getCommitteeName());
                    ps.setInt(4, r.getSessionNo());
                    ps.setInt(5, r.getMeetingNo());
                    ps.setObject(6, r.getMeetingDt());
                    ps.setString(7, r.getStatus().name());
                    ps.setLong(8, r.getFileSeq());
                });
        return records;
    }

    @Override
    public List<CommitteeAttendance> findByMonaCdOrderByMeetingDtDesc(String monaCd) {
        return committeeAttendanceJpaRepository.findByMonaCdOrderByMeetingDtDesc(monaCd);
    }

    @Override
    public List<String> findDistinctCommitteeNamesByMonaCd(String monaCd) {
        return committeeAttendanceJpaRepository.findDistinctCommitteeNamesByMonaCd(monaCd);
    }

    @Override
    public long countByMonaCdAndCommitteeNameAndStatus(String monaCd, String committeeName, AttendanceStatus status) {
        return committeeAttendanceJpaRepository.countByMonaCdAndCommitteeNameAndStatus(monaCd, committeeName, status);
    }

    @Override
    public long countByMonaCdAndCommitteeName(String monaCd, String committeeName) {
        return committeeAttendanceJpaRepository.countByMonaCdAndCommitteeName(monaCd, committeeName);
    }

    @Override
    public Set<Long> findAllFileSeqs() {
        return processedCommitteeFileRepository.findAllFileSeqs();
    }

    @Override
    public ProcessedCommitteeFile save(ProcessedCommitteeFile file) {
        return processedCommitteeFileRepository.save(file);
    }
}

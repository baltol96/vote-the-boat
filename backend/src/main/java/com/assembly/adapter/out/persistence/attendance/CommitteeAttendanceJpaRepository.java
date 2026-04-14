package com.assembly.adapter.out.persistence.attendance;

import com.assembly.domain.attendance.AttendanceStatus;
import com.assembly.domain.attendance.CommitteeAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommitteeAttendanceJpaRepository extends JpaRepository<CommitteeAttendance, Long> {

    List<CommitteeAttendance> findByMonaCdOrderByMeetingDtDesc(String monaCd);

    @Query("SELECT DISTINCT a.committeeName FROM CommitteeAttendance a WHERE a.monaCd = :monaCd")
    List<String> findDistinctCommitteeNamesByMonaCd(@Param("monaCd") String monaCd);

    @Query("SELECT COUNT(a) FROM CommitteeAttendance a WHERE a.monaCd = :monaCd AND a.committeeName = :committeeName AND a.status = :status")
    long countByMonaCdAndCommitteeNameAndStatus(@Param("monaCd") String monaCd, @Param("committeeName") String committeeName, @Param("status") AttendanceStatus status);

    @Query("SELECT COUNT(a) FROM CommitteeAttendance a WHERE a.monaCd = :monaCd AND a.committeeName = :committeeName")
    long countByMonaCdAndCommitteeName(@Param("monaCd") String monaCd, @Param("committeeName") String committeeName);
}

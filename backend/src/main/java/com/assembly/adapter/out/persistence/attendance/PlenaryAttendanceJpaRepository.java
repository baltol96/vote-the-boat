package com.assembly.adapter.out.persistence.attendance;

import com.assembly.domain.attendance.AttendanceStatus;
import com.assembly.domain.attendance.PlenaryAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PlenaryAttendanceJpaRepository extends JpaRepository<PlenaryAttendance, Long> {

    List<PlenaryAttendance> findByMonaCdOrderByMeetingDtDesc(String monaCd);

    @Query("SELECT COUNT(a) FROM PlenaryAttendance a WHERE a.monaCd = :monaCd AND a.status = :status")
    long countByMonaCdAndStatus(@Param("monaCd") String monaCd, @Param("status") AttendanceStatus status);
}

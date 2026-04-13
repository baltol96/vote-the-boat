package com.assembly.adapter.out.persistence.attendance;

import com.assembly.domain.attendance.PlenaryAttendance;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlenaryAttendanceJpaRepository extends JpaRepository<PlenaryAttendance, Long> {
}

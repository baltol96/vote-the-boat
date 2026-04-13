package com.assembly.application.attendance.port.out;

import com.assembly.domain.attendance.PlenaryAttendance;

import java.util.List;

public interface PlenaryAttendancePort {
    List<PlenaryAttendance> saveAll(List<PlenaryAttendance> records);
}

package com.assembly.adapter.out.persistence.attendance;

import com.assembly.application.attendance.port.out.PlenaryAttendancePort;
import com.assembly.application.attendance.port.out.ProcessedPlenaryFilePort;
import com.assembly.domain.attendance.AttendanceStatus;
import com.assembly.domain.attendance.PlenaryAttendance;
import com.assembly.domain.attendance.ProcessedPlenaryFile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class PlenaryAttendancePersistenceAdapter implements PlenaryAttendancePort, ProcessedPlenaryFilePort {

    private final PlenaryAttendanceJpaRepository plenaryAttendanceJpaRepository;
    private final ProcessedPlenaryFileRepository processedPlenaryFileRepository;

    @Override
    public List<PlenaryAttendance> saveAll(List<PlenaryAttendance> records) {
        return plenaryAttendanceJpaRepository.saveAll(records);
    }

    @Override
    public List<PlenaryAttendance> findByMonaCdOrderByMeetingDtDesc(String monaCd) {
        return plenaryAttendanceJpaRepository.findByMonaCdOrderByMeetingDtDesc(monaCd);
    }

    @Override
    public long countByMonaCdAndStatus(String monaCd, AttendanceStatus status) {
        return plenaryAttendanceJpaRepository.countByMonaCdAndStatus(monaCd, status);
    }

    @Override
    public Set<Long> findAllFileSeqs() {
        return processedPlenaryFileRepository.findAllFileSeqs();
    }

    @Override
    public ProcessedPlenaryFile save(ProcessedPlenaryFile file) {
        return processedPlenaryFileRepository.save(file);
    }
}

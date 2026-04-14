package com.assembly.application.vote.port.in;

import com.assembly.application.common.PageResult;
import com.assembly.application.vote.AttendanceResult;
import com.assembly.application.vote.VoteRecord;
import org.springframework.data.domain.Pageable;

public interface GetVoteUseCase {
    PageResult<VoteRecord> getVotes(String monaCd, String result, Pageable pageable);
    AttendanceResult getAttendance(String monaCd);
}

package com.assembly.application.vote;

import com.assembly.application.common.PageResult;
import com.assembly.application.member.port.in.GetMemberUseCase;
import com.assembly.application.vote.port.in.GetVoteUseCase;
import com.assembly.application.vote.port.out.VotePort;
import com.assembly.domain.vote.VoteResult;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VoteQueryService implements GetVoteUseCase {

    private final VotePort votePort;
    private final GetMemberUseCase getMemberUseCase;

    @Override
    public PageResult<VoteRecord> getVotes(String monaCd, String result, Pageable pageable) {
        getMemberUseCase.validateExists(monaCd);
        if (result != null) {
            VoteResult voteResult = VoteResult.valueOf(result);
            return PageResult.of(
                    votePort.findByMonaCdAndResultOrderByVoteDtDesc(monaCd, voteResult, pageable),
                    VoteRecord::from
            );
        }
        return PageResult.of(
                votePort.findByMonaCdOrderByVoteDtDesc(monaCd, pageable),
                VoteRecord::from
        );
    }

    @Override
    public AttendanceResult getAttendance(String monaCd) {
        getMemberUseCase.validateExists(monaCd);
        long total = votePort.countTotalByMonaCd(monaCd);
        long attended = votePort.countAttendedByMonaCd(monaCd);
        double rate = total > 0 ? Math.round((double) attended / total * 1000.0) / 10.0 : 0.0;
        long yesCount = votePort.countByMonaCdAndResult(monaCd, VoteResult.YES);
        long noCount = votePort.countByMonaCdAndResult(monaCd, VoteResult.NO);
        long abstainCount = votePort.countByMonaCdAndResult(monaCd, VoteResult.ABSTAIN);
        long absentCount = votePort.countByMonaCdAndResult(monaCd, VoteResult.ABSENT);
        return new AttendanceResult(monaCd, total, attended, rate, yesCount, noCount, abstainCount, absentCount);
    }
}

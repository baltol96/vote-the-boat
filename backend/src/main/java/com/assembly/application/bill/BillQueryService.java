package com.assembly.application.bill;

import com.assembly.application.bill.port.in.GetBillUseCase;
import com.assembly.application.bill.port.out.BillPort;
import com.assembly.application.common.PageResult;
import com.assembly.application.member.port.in.GetMemberUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BillQueryService implements GetBillUseCase {

    private final BillPort billPort;
    private final GetMemberUseCase getMemberUseCase;

    @Override
    public PageResult<BillResult> getBills(String monaCd, Pageable pageable) {
        getMemberUseCase.validateExists(monaCd);
        return PageResult.of(
                billPort.findByProposerMonaCd(monaCd, pageable),
                BillResult::from
        );
    }
}

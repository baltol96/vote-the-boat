package com.assembly.application.bill.port.in;

import com.assembly.application.bill.BillResult;
import com.assembly.application.common.PageResult;
import org.springframework.data.domain.Pageable;

public interface GetBillUseCase {
    PageResult<BillResult> getBills(String monaCd, Pageable pageable);
}

package com.assembly.application.billinsight.port.out;

import com.assembly.domain.billkeyword.BillKeyword;

import java.util.List;
import java.util.Optional;

public interface BillKeywordPort {
    Optional<BillKeyword> findByBillNo(String billNo);
    List<BillKeyword> findAllByBillNoIn(List<String> billNos);
    BillKeyword save(BillKeyword billKeyword);
    List<BillKeyword> saveAll(List<BillKeyword> billKeywords);
}

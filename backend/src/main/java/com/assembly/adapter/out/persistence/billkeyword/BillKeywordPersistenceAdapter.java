package com.assembly.adapter.out.persistence.billkeyword;

import com.assembly.application.billinsight.port.out.BillKeywordPort;
import com.assembly.domain.billkeyword.BillKeyword;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class BillKeywordPersistenceAdapter implements BillKeywordPort {

    private final BillKeywordJpaRepository billKeywordJpaRepository;

    @Override
    public Optional<BillKeyword> findByBillNo(String billNo) {
        return billKeywordJpaRepository.findByBillNo(billNo);
    }

    @Override
    public List<BillKeyword> findAllByBillNoIn(List<String> billNos) {
        return billKeywordJpaRepository.findAllByBillNoIn(billNos);
    }

    @Override
    public BillKeyword save(BillKeyword billKeyword) {
        return billKeywordJpaRepository.save(billKeyword);
    }

    @Override
    public List<BillKeyword> saveAll(List<BillKeyword> billKeywords) {
        return billKeywordJpaRepository.saveAll(billKeywords);
    }
}

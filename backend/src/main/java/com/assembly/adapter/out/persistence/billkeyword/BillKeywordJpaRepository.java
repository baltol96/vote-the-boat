package com.assembly.adapter.out.persistence.billkeyword;

import com.assembly.domain.billkeyword.BillKeyword;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BillKeywordJpaRepository extends JpaRepository<BillKeyword, Long> {
    Optional<BillKeyword> findByBillNo(String billNo);
    List<BillKeyword> findAllByBillNoIn(List<String> billNos);
}

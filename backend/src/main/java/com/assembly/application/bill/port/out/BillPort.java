package com.assembly.application.bill.port.out;

import com.assembly.domain.bill.Bill;
import com.assembly.domain.bill.BillWithRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface BillPort {
    Page<Bill> findByMonaCdOrderByProposeDtDesc(String monaCd, Pageable pageable);
    Page<BillWithRole> findByProposerMonaCd(String monaCd, Pageable pageable);
    Optional<Bill> findByBillNo(String billNo);
    boolean existsByBillNo(String billNo);
    List<String> findAllBillIds();
    List<String> findAllBillIdsByAge(String age);
    List<Bill> saveAll(List<Bill> bills);
    Bill save(Bill bill);
}

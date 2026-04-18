package com.assembly.adapter.out.persistence.bill;

import com.assembly.application.bill.port.out.BillPort;
import com.assembly.domain.bill.Bill;
import com.assembly.domain.bill.BillWithRole;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class BillPersistenceAdapter implements BillPort {

    private final BillJpaRepository billJpaRepository;
    private final BillProposerQueryRepository billProposerQueryRepository;

    @Override
    public Page<Bill> findByMonaCdOrderByProposeDtDesc(String monaCd, Pageable pageable) {
        return billJpaRepository.findByMonaCdOrderByProposeDtDesc(monaCd, pageable);
    }

    @Override
    public Page<BillWithRole> findByProposerMonaCd(String monaCd, Pageable pageable) {
        return billProposerQueryRepository.findBillsByMonaCd(monaCd, pageable);
    }

    @Override
    public Optional<Bill> findByBillNo(String billNo) {
        return billJpaRepository.findByBillNo(billNo);
    }

    @Override
    public boolean existsByBillNo(String billNo) {
        return billJpaRepository.existsByBillNo(billNo);
    }

    @Override
    public List<String> findAllBillIds() {
        return billJpaRepository.findAllBillIds();
    }

    @Override
    public List<String> findAllBillIdsByAge(String age) {
        return billJpaRepository.findAllBillIdsByAge(age);
    }

    @Override
    public List<Bill> findAllByMonaCd(String monaCd) {
        return billJpaRepository.findByMonaCd(monaCd);
    }

    @Override
    public List<Bill> saveAll(List<Bill> bills) {
        return billJpaRepository.saveAll(bills);
    }

    @Override
    public Bill save(Bill bill) {
        return billJpaRepository.save(bill);
    }
}

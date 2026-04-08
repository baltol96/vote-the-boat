package com.assembly.adapter.out.persistence.bill;

import com.assembly.application.bill.port.out.BillProposerPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BillProposerPersistenceAdapter implements BillProposerPort {

    private final BillProposerJpaRepository billProposerJpaRepository;

    @Override
    public void upsert(String billNo, String monaCd, String role, String proposerName) {
        billProposerJpaRepository.upsert(billNo, monaCd, role, proposerName);
    }
}

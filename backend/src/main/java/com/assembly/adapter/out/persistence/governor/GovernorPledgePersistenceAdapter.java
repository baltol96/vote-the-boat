package com.assembly.adapter.out.persistence.governor;

import com.assembly.application.governor.port.out.GovernorPledgePort;
import com.assembly.domain.governor.GovernorPledge;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class GovernorPledgePersistenceAdapter implements GovernorPledgePort {

    private final GovernorPledgeJpaRepository repository;

    @Override
    @Transactional
    public void deleteByHuboid(String huboid) {
        repository.deleteByHuboid(huboid);
    }

    @Override
    public List<GovernorPledge> saveAll(List<GovernorPledge> pledges) {
        return repository.saveAll(pledges);
    }

    @Override
    public List<GovernorPledge> findByHuboid(String huboid) {
        return repository.findByHuboidOrderByPledgeOrderAsc(huboid);
    }
}

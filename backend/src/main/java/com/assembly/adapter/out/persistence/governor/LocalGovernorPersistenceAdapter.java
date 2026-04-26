package com.assembly.adapter.out.persistence.governor;

import com.assembly.application.governor.port.out.LocalGovernorPort;
import com.assembly.domain.governor.GovernorType;
import com.assembly.domain.governor.LocalGovernor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class LocalGovernorPersistenceAdapter implements LocalGovernorPort {

    private final LocalGovernorJpaRepository repository;

    @Override
    public List<LocalGovernor> findAll() {
        return repository.findAll();
    }

    @Override
    public Optional<LocalGovernor> findByHuboid(String huboid) {
        return repository.findByHuboid(huboid);
    }

    @Override
    public List<LocalGovernor> findBySgId(String sgId) {
        return repository.findBySgId(sgId);
    }

    @Override
    public List<LocalGovernor> findByGovernorType(GovernorType governorType) {
        return repository.findByGovernorType(governorType);
    }

    @Override
    public List<LocalGovernor> findBySdNameAndGovernorType(String sdName, GovernorType governorType) {
        return repository.findBySdNameAndGovernorType(sdName, governorType);
    }

    @Override
    public LocalGovernor save(LocalGovernor governor) {
        return repository.save(governor);
    }
}

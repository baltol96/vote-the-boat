package com.assembly.adapter.out.persistence.governor;

import com.assembly.domain.governor.GovernorType;
import com.assembly.domain.governor.LocalGovernor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LocalGovernorJpaRepository extends JpaRepository<LocalGovernor, Long> {
    Optional<LocalGovernor> findByHuboid(String huboid);
    List<LocalGovernor> findBySgId(String sgId);
    List<LocalGovernor> findByGovernorType(GovernorType governorType);
    List<LocalGovernor> findBySdNameAndGovernorType(String sdName, GovernorType governorType);
}

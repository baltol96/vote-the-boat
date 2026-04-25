package com.assembly.application.governor.port.out;

import com.assembly.domain.governor.GovernorType;
import com.assembly.domain.governor.LocalGovernor;

import java.util.List;
import java.util.Optional;

public interface LocalGovernorPort {
    Optional<LocalGovernor> findByHuboid(String huboid);
    List<LocalGovernor> findBySgId(String sgId);
    List<LocalGovernor> findByGovernorType(GovernorType governorType);
    List<LocalGovernor> findBySdNameAndGovernorType(String sdName, GovernorType governorType);
    LocalGovernor save(LocalGovernor governor);
}

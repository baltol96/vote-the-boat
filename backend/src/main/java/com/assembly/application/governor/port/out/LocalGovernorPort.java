package com.assembly.application.governor.port.out;

import com.assembly.domain.governor.LocalGovernor;

import java.util.List;
import java.util.Optional;

public interface LocalGovernorPort {
    Optional<LocalGovernor> findByHuboid(String huboid);
    List<LocalGovernor> findBySgId(String sgId);
    LocalGovernor save(LocalGovernor governor);
}

package com.assembly.application.governor.port.out;

import com.assembly.domain.governor.GovernorPledge;

import java.util.List;

public interface GovernorPledgePort {
    void deleteByHuboid(String huboid);
    List<GovernorPledge> saveAll(List<GovernorPledge> pledges);
}

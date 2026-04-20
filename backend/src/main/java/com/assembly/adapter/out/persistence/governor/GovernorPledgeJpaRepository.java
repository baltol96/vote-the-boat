package com.assembly.adapter.out.persistence.governor;

import com.assembly.domain.governor.GovernorPledge;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GovernorPledgeJpaRepository extends JpaRepository<GovernorPledge, Long> {
    void deleteByHuboid(String huboid);
}

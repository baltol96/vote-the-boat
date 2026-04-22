package com.assembly.application.governor;

import com.assembly.application.governor.port.in.GetGovernorUseCase;
import com.assembly.application.governor.port.out.GovernorPledgePort;
import com.assembly.application.governor.port.out.LocalGovernorPort;
import com.assembly.domain.governor.GovernorType;
import com.assembly.domain.governor.LocalGovernor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class GovernorApplicationService implements GetGovernorUseCase {

    private final LocalGovernorPort localGovernorPort;
    private final GovernorPledgePort governorPledgePort;

    @Override
    public List<GovernorResult> getMetroMayors() {
        return localGovernorPort.findByGovernorType(GovernorType.METRO_MAYOR)
                .stream()
                .map(GovernorResult::from)
                .toList();
    }

    @Override
    public GovernorDetailResult getGovernorDetail(String huboid) {
        LocalGovernor governor = localGovernorPort.findByHuboid(huboid)
                .orElseThrow(() -> new NoSuchElementException("지자체장을 찾을 수 없습니다: " + huboid));
        return GovernorDetailResult.from(governor, governorPledgePort.findByHuboid(huboid));
    }
}

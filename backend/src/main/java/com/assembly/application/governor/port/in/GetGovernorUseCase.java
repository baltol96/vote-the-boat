package com.assembly.application.governor.port.in;

import com.assembly.application.governor.GovernorDetailResult;
import com.assembly.application.governor.GovernorResult;

import java.util.List;

public interface GetGovernorUseCase {
    List<GovernorResult> getMetroMayors();
    List<GovernorResult> getDistrictGovernorsBySido(String sdName);
    GovernorDetailResult getGovernorDetail(String huboid);
}

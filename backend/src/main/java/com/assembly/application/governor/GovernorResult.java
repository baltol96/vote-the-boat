package com.assembly.application.governor;

import com.assembly.domain.governor.LocalGovernor;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record GovernorResult(
        String huboid,
        String name,
        String party,
        String governorType,
        String sdName,
        String sggName,
        String birthday,
        String gender,
        String edu,
        String career1,
        String career2
) {
    public static GovernorResult from(LocalGovernor g) {
        return new GovernorResult(
                g.getHuboid(),
                g.getName(),
                g.getJdName(),
                g.getGovernorType().name(),
                g.getSdName(),
                g.getSggName(),
                g.getBirthday(),
                g.getGender(),
                g.getEdu(),
                g.getCareer1(),
                g.getCareer2()
        );
    }
}

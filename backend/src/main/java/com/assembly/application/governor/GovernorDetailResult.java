package com.assembly.application.governor;

import com.assembly.domain.governor.GovernorPledge;
import com.assembly.domain.governor.LocalGovernor;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record GovernorDetailResult(
        String huboid,
        String name,
        String party,
        String governorType,
        String sdName,
        String sggName,
        String birthday,
        String gender,
        String addr,
        String job,
        String edu,
        String career1,
        String career2,
        List<PledgeResult> pledges
) {
    public record PledgeResult(int order, String realmName, String title, String content) {
        public static PledgeResult from(GovernorPledge p) {
            return new PledgeResult(p.getPledgeOrder(), p.getRealmName(), p.getTitle(), p.getContent());
        }
    }

    public static GovernorDetailResult from(LocalGovernor g, List<GovernorPledge> pledges) {
        return new GovernorDetailResult(
                g.getHuboid(),
                g.getName(),
                g.getJdName(),
                g.getGovernorType().name(),
                g.getSdName(),
                g.getSggName(),
                g.getBirthday(),
                g.getGender(),
                g.getAddr(),
                g.getJob(),
                g.getEdu(),
                g.getCareer1(),
                g.getCareer2(),
                pledges.stream().map(PledgeResult::from).toList()
        );
    }
}

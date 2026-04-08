package com.assembly.application.member.port.in;

import com.assembly.application.member.MemberResult;

import java.util.List;

public interface SearchMemberUseCase {
    List<MemberResult> search(String name, String party);
}

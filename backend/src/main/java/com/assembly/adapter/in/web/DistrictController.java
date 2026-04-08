package com.assembly.adapter.in.web;

import com.assembly.application.member.HistoricalRepresentativeResult;
import com.assembly.application.member.MemberResult;
import com.assembly.application.member.port.in.GetMemberUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/districts")
@RequiredArgsConstructor
public class DistrictController {

    private final GetMemberUseCase getMemberUseCase;

    @GetMapping("/{sggCode}/member")
    public ResponseEntity<MemberResult> getMemberByDistrict(@PathVariable String sggCode) {
        return ResponseEntity.ok(getMemberUseCase.getMemberBySggCode(sggCode));
    }

    @GetMapping("/{sggCode}/history")
    public ResponseEntity<List<HistoricalRepresentativeResult>> getDistrictHistory(@PathVariable String sggCode) {
        return ResponseEntity.ok(getMemberUseCase.getDistrictHistory(sggCode));
    }
}

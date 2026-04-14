package com.assembly.adapter.in.web;

import com.assembly.application.attendance.AttendanceSummaryResult;
import com.assembly.application.attendance.port.in.GetAttendanceUseCase;
import com.assembly.application.bill.BillResult;
import com.assembly.application.bill.port.in.GetBillUseCase;
import com.assembly.application.common.PageResult;
import com.assembly.application.member.MemberResult;
import com.assembly.application.member.port.in.GetMemberUseCase;
import com.assembly.application.member.port.in.SearchMemberUseCase;
import com.assembly.application.vote.AttendanceResult;
import com.assembly.application.vote.VoteRecord;
import com.assembly.application.vote.port.in.GetVoteUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/members")
@RequiredArgsConstructor
public class MemberController {

    private final GetMemberUseCase getMemberUseCase;
    private final SearchMemberUseCase searchMemberUseCase;
    private final GetBillUseCase getBillUseCase;
    private final GetVoteUseCase getVoteUseCase;
    private final GetAttendanceUseCase getAttendanceUseCase;

    @GetMapping("/{monaCode}")
    public ResponseEntity<MemberResult> getMember(@PathVariable String monaCode) {
        return ResponseEntity.ok(getMemberUseCase.getMember(monaCode));
    }

    @GetMapping("/{monaCode}/bills")
    public ResponseEntity<PageResult<BillResult>> getBills(
            @PathVariable String monaCode,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(getBillUseCase.getBills(monaCode, pageable));
    }

    @GetMapping("/{monaCode}/votes")
    public ResponseEntity<PageResult<VoteRecord>> getVotes(
            @PathVariable String monaCode,
            @RequestParam(required = false) String result,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(getVoteUseCase.getVotes(monaCode, result, pageable));
    }

    @GetMapping("/{monaCode}/attendance")
    public ResponseEntity<AttendanceResult> getAttendance(@PathVariable String monaCode) {
        return ResponseEntity.ok(getVoteUseCase.getAttendance(monaCode));
    }

    @GetMapping("/{monaCode}/attendance-summary")
    public ResponseEntity<AttendanceSummaryResult> getAttendanceSummary(@PathVariable String monaCode) {
        return ResponseEntity.ok(getAttendanceUseCase.getAttendanceSummary(monaCode));
    }

    @GetMapping("/search")
    public ResponseEntity<List<MemberResult>> search(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String party) {
        return ResponseEntity.ok(searchMemberUseCase.search(name, party));
    }
}

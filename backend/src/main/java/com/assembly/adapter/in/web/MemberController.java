package com.assembly.adapter.in.web;

import com.assembly.application.asset.AssetResult;
import com.assembly.application.asset.port.in.GetAssetUseCase;
import com.assembly.application.attendance.AttendanceSummaryResult;
import com.assembly.application.attendance.port.in.GetAttendanceUseCase;
import com.assembly.application.bill.BillResult;
import com.assembly.application.bill.port.in.GetBillUseCase;
import com.assembly.application.billinsight.BillSummaryResult;
import com.assembly.application.billinsight.VoteSummaryResult;
import com.assembly.application.billinsight.port.in.GetBillInsightUseCase;
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
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/members")
@RequiredArgsConstructor
public class MemberController {

    private final GetMemberUseCase getMemberUseCase;
    private final SearchMemberUseCase searchMemberUseCase;
    private final GetBillUseCase getBillUseCase;
    private final GetVoteUseCase getVoteUseCase;
    private final GetAttendanceUseCase getAttendanceUseCase;
    private final GetBillInsightUseCase getBillInsightUseCase;
    private final GetAssetUseCase getAssetUseCase;

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

    @GetMapping("/{monaCode}/bill-summary")
    public ResponseEntity<BillSummaryResult> getBillSummary(@PathVariable String monaCode) {
        return ResponseEntity.ok(getBillInsightUseCase.getBillSummary(monaCode));
    }

    @GetMapping("/{monaCode}/vote-highlights")
    public ResponseEntity<VoteSummaryResult> getVoteHighlights(@PathVariable String monaCode) {
        return ResponseEntity.ok(getBillInsightUseCase.getVoteHighlights(monaCode));
    }

    @GetMapping("/{monaCode}/assets")
    public ResponseEntity<AssetResult> getAssets(@PathVariable String monaCode) {
        Optional<AssetResult> result = getAssetUseCase.getLatestAsset(monaCode);
        return result.map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/search")
    public ResponseEntity<List<MemberResult>> search(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String party) {
        return ResponseEntity.ok(searchMemberUseCase.search(name, party));
    }
}

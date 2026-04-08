package com.assembly.application.bill;

import com.assembly.domain.bill.BillWithRole;
import com.assembly.domain.bill.ProposerRole;

import java.time.LocalDate;

public record BillResult(
        String billNo,
        String billName,
        String proposerName,
        LocalDate proposeDt,
        String status,
        LocalDate passDt,
        String committee,
        String summary,
        String proposerRole
) {
    public static BillResult from(BillWithRole billWithRole) {
        var bill = billWithRole.bill();
        String roleLabel = billWithRole.role() == ProposerRole.MAIN ? "대표발의" : "공동발의";
        return new BillResult(
                bill.getBillNo(),
                bill.getBillName(),
                bill.getProposerName(),
                bill.getProposeDt(),
                bill.getStatus().name(),
                bill.getPassDt(),
                bill.getCommittee(),
                bill.getSummary(),
                roleLabel
        );
    }
}

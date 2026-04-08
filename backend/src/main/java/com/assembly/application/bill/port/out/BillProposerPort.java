package com.assembly.application.bill.port.out;

public interface BillProposerPort {
    void upsert(String billNo, String monaCd, String role, String proposerName);
}

package com.assembly.domain.bill;

public enum BillStatus {
    PROPOSED,   // 발의
    COMMITTEE,  // 위원회 심사
    PASSED,     // 가결
    REJECTED,   // 부결
    WITHDRAWN,  // 철회
    EXPIRED     // 임기만료
}

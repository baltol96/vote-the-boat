package com.assembly.domain.attendance;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "committee_attendances",
        indexes = {
                @Index(name = "idx_committee_att_mona_cd",   columnList = "monaCd"),
                @Index(name = "idx_committee_att_committee", columnList = "committeeName, sessionNo")
        },
        uniqueConstraints = @UniqueConstraint(
                name = "uk_committee_att_key",
                columnNames = {"memberName", "committeeName", "sessionNo", "meetingNo"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommitteeAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 의원 고유 코드 (MONA_CD). 이름 매핑 실패 시 null. */
    @Column(length = 20)
    private String monaCd;

    /** PDF 원본 이름 — 매핑 실패 보관 및 unique key 역할 */
    @Column(nullable = false, length = 20)
    private String memberName;

    /** 위원회명 (예: "행정안전위원회", "대법관(...) 임명동의에 관한 인사청문특별위원회") */
    @Column(nullable = false, length = 200)
    private String committeeName;

    /** 회기번호 (예: 415) */
    @Column(nullable = false)
    private Integer sessionNo;

    /** 차수 (1, 2, 3 ...) */
    @Column(nullable = false)
    private Integer meetingNo;

    /** 회의 날짜 */
    @Column(nullable = false)
    private LocalDate meetingDt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceStatus status;

    /** 원본 파일 식별자 (열린국회정보 fileSeq) */
    @Column(nullable = false)
    private Long fileSeq;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @Builder
    public CommitteeAttendance(String monaCd, String memberName, String committeeName,
                               Integer sessionNo, Integer meetingNo,
                               LocalDate meetingDt, AttendanceStatus status,
                               Long fileSeq) {
        this.monaCd = monaCd;
        this.memberName = memberName;
        this.committeeName = committeeName;
        this.sessionNo = sessionNo;
        this.meetingNo = meetingNo;
        this.meetingDt = meetingDt;
        this.status = status;
        this.fileSeq = fileSeq;
    }

    public void assignMonaCd(String monaCd) {
        this.monaCd = monaCd;
    }
}

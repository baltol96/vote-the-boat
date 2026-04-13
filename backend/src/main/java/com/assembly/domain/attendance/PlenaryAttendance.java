package com.assembly.domain.attendance;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "plenary_attendances",
        indexes = {
                @Index(name = "idx_plenary_att_mona_cd", columnList = "monaCd"),
                @Index(name = "idx_plenary_att_session", columnList = "sessionNo, meetingNo")
        },
        uniqueConstraints = @UniqueConstraint(
                name = "uk_plenary_att_name_session_meeting",
                columnNames = {"memberName", "sessionNo", "meetingNo"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlenaryAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 의원 고유 코드 (MONA_CD). 이름 매핑 실패 시 null. */
    @Column(length = 20)
    private String monaCd;

    /** Excel 원본 이름 — 매핑 실패 보관 및 unique key 역할 */
    @Column(nullable = false, length = 20)
    private String memberName;

    /** 회기번호 (예: 433) */
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
    public PlenaryAttendance(String monaCd, String memberName,
                             Integer sessionNo, Integer meetingNo,
                             LocalDate meetingDt, AttendanceStatus status,
                             Long fileSeq) {
        this.monaCd = monaCd;
        this.memberName = memberName;
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

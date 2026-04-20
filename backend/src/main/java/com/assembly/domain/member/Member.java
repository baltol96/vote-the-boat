package com.assembly.domain.member;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Entity
@Table(name = "members", indexes = {
        @Index(name = "idx_member_mona_cd", columnList = "monaCd", unique = true)
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String monaCd; // 열린국회정보 고유 ID

    @Column(nullable = false, length = 20)
    private String name;

    private LocalDate birthDate;

    @Column(length = 10)
    private String gender;

    @Column(length = 255)
    private String photoUrl;

    @Column(length = 255)
    private String email;

    @Column(length = 50)
    private String phone;

    @Column(length = 20)
    private String officeRoom;

    @Column
    private Integer assemblyTerm; // 현재 재직 대수 (22 = 22대 국회)

    // 역대국회의원현황(nprlapfmaufmqytet) API 수집 필드
    @Column(length = 60)
    private String nameHan; // 이름(한자)

    @Column(length = 60)
    private String bon; // 본관

    @Column(length = 60)
    private String posi; // 출생지

    @Column(columnDefinition = "TEXT")
    private String hak; // 학력 및 경력

    @Column(columnDefinition = "TEXT")
    private String hobby; // 종교 및 취미

    @Column(columnDefinition = "TEXT")
    private String book; // 저서

    @Column(columnDefinition = "TEXT")
    private String sang; // 상훈

    @Column(length = 100)
    private String dead; // 기타정보(사망일)

    @Column(length = 255)
    private String heritageUrl; // 헌정회 홈페이지 URL

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MemberStatus status = MemberStatus.ACTIVE;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "member", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MemberTerm> terms = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Builder
    public Member(String monaCd, String name, LocalDate birthDate, String gender,
                  String photoUrl, String email, String phone, String officeRoom,
                  Integer assemblyTerm, MemberStatus status) {
        this.monaCd = monaCd;
        this.name = name;
        this.birthDate = birthDate;
        this.gender = gender;
        this.photoUrl = photoUrl;
        this.email = email;
        this.phone = phone;
        this.officeRoom = officeRoom;
        this.assemblyTerm = assemblyTerm;
        this.status = status != null ? status : MemberStatus.ACTIVE;
    }

    public void update(String name, String photoUrl, String email, String phone,
                       String officeRoom, MemberStatus status, Integer assemblyTerm) {
        this.name = name;
        this.photoUrl = photoUrl;
        this.email = email;
        this.phone = phone;
        this.officeRoom = officeRoom;
        // RESIGNED는 수동 관리 — 배치가 덮어쓰지 않음
        if (this.status != MemberStatus.RESIGNED) {
            this.status = status;
        }
        this.assemblyTerm = assemblyTerm;
    }

    /** 역대국회의원현황 API에서 수집한 전기 정보 업데이트 (non-null 값만 덮어쓰기) */
    public void updateBio(String nameHan, String bon, String posi, String hak,
                          String hobby, String book, String sang, String dead, String heritageUrl) {
        if (nameHan != null)    this.nameHan    = nameHan;
        if (bon != null)        this.bon        = bon;
        if (posi != null)       this.posi       = posi;
        if (hak != null)        this.hak        = hak;
        if (hobby != null)      this.hobby      = hobby;
        if (book != null)       this.book       = book;
        if (sang != null)       this.sang       = sang;
        if (dead != null)       this.dead       = dead;
        if (heritageUrl != null) this.heritageUrl = heritageUrl;
    }

    /** 가장 최신 대수의 당선 이력을 반환. 없으면 null. */
    public MemberTerm currentTerm() {
        return terms.stream()
                .max(Comparator.comparingInt(MemberTerm::getTermNumber))
                .orElse(null);
    }
}

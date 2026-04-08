package com.assembly.domain.member;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "member_terms", uniqueConstraints = {
        @UniqueConstraint(name = "uk_member_terms_member_term", columnNames = {"member_id", "term_number"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberTerm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false)
    private Integer termNumber; // 22 = 22대

    @Column(length = 50)
    private String party;

    @Column(length = 100)
    private String district;

    @Column(length = 20)
    private String electionType;

    @Column(length = 20)
    private String sggCode;

    @Builder
    public MemberTerm(Member member, Integer termNumber,
                      String party, String district, String electionType, String sggCode) {
        this.member = member;
        this.termNumber = termNumber;
        this.party = party;
        this.district = district;
        this.electionType = electionType;
        this.sggCode = sggCode;
    }

    public void update(String party, String district, String electionType, String sggCode) {
        this.party = party;
        this.district = district;
        this.electionType = electionType;
        this.sggCode = sggCode;
    }
}

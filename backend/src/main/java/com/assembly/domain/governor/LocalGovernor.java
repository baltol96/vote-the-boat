package com.assembly.domain.governor;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "local_governors", indexes = {
        @Index(name = "idx_local_governors_sd_name",       columnList = "sdName"),
        @Index(name = "idx_local_governors_governor_type", columnList = "governorType"),
        @Index(name = "idx_local_governors_sg_id",         columnList = "sgId")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LocalGovernor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String huboid;

    @Column(nullable = false, length = 10)
    private String sgId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GovernorType governorType;

    @Column(length = 50)
    private String sdName;

    @Column(length = 100)
    private String sggName;

    @Column(length = 50)
    private String wiwName;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(length = 50)
    private String jdName;

    @Column(length = 10)
    private String birthday;

    @Column(length = 5)
    private String gender;

    @Column(length = 300)
    private String addr;

    @Column(length = 200)
    private String job;

    @Column(length = 200)
    private String edu;

    @Column(length = 200)
    private String career1;

    @Column(length = 200)
    private String career2;

    @Column(length = 20)
    private String dugsu;

    @Column(length = 20)
    private String dugyul;

    @Column(length = 500)
    private String photoUrl;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

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
    public LocalGovernor(String huboid, String sgId, GovernorType governorType,
                         String sdName, String sggName, String wiwName,
                         String name, String jdName, String birthday, String gender,
                         String addr, String job, String edu,
                         String career1, String career2,
                         String dugsu, String dugyul) {
        this.huboid = huboid;
        this.sgId = sgId;
        this.governorType = governorType;
        this.sdName = sdName;
        this.sggName = sggName;
        this.wiwName = wiwName;
        this.name = name;
        this.jdName = jdName;
        this.birthday = birthday;
        this.gender = gender;
        this.addr = addr;
        this.job = job;
        this.edu = edu;
        this.career1 = career1;
        this.career2 = career2;
        this.dugsu = dugsu;
        this.dugyul = dugyul;
    }

    public void updatePhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }

    public void update(String name, String jdName, String addr, String job,
                       String edu, String career1, String career2) {
        if (name    != null) this.name    = name;
        if (jdName  != null) this.jdName  = jdName;
        if (addr    != null) this.addr    = addr;
        if (job     != null) this.job     = job;
        if (edu     != null) this.edu     = edu;
        if (career1 != null) this.career1 = career1;
        if (career2 != null) this.career2 = career2;
    }
}

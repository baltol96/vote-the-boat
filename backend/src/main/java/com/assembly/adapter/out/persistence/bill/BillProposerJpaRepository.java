package com.assembly.adapter.out.persistence.bill;

import com.assembly.domain.bill.BillProposer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BillProposerJpaRepository extends JpaRepository<BillProposer, Long> {

    @Modifying
    @Query(value = """
            INSERT INTO bill_proposers (bill_no, mona_cd, role, proposer_name, created_at)
            VALUES (:billNo, :monaCd, :role, :proposerName, NOW())
            ON CONFLICT (bill_no, mona_cd)
            DO UPDATE SET proposer_name = EXCLUDED.proposer_name
            """, nativeQuery = true)
    void upsert(@Param("billNo") String billNo,
                @Param("monaCd") String monaCd,
                @Param("role") String role,
                @Param("proposerName") String proposerName);
}

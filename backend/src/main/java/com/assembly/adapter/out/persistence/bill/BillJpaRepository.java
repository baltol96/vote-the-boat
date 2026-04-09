package com.assembly.adapter.out.persistence.bill;

import com.assembly.domain.bill.Bill;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BillJpaRepository extends JpaRepository<Bill, Long> {

    Optional<Bill> findByBillNo(String billNo);

    Page<Bill> findByMonaCdOrderByProposeDtDesc(String monaCd, Pageable pageable);

    boolean existsByBillNo(String billNo);

    @Query("SELECT b.billId FROM Bill b WHERE b.billId IS NOT NULL AND b.billId <> ''")
    List<String> findAllBillIds();

    @Query("SELECT b.billId FROM Bill b WHERE b.billId IS NOT NULL AND b.billId <> '' AND b.age = :age")
    List<String> findAllBillIdsByAge(@Param("age") String age);
}

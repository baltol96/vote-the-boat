package com.assembly.adapter.out.persistence.bill;

import com.assembly.domain.bill.BillWithRole;
import com.assembly.domain.bill.QBill;
import com.assembly.domain.bill.QBillProposer;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class BillProposerQueryRepository {

    private final JPAQueryFactory queryFactory;

    public Page<BillWithRole> findBillsByMonaCd(String monaCd, Pageable pageable) {
        QBillProposer bp = QBillProposer.billProposer;
        QBill b = QBill.bill;

        List<BillWithRole> content = queryFactory
                .select(Projections.constructor(BillWithRole.class, b, bp.role))
                .from(bp)
                .join(b).on(b.billNo.eq(bp.billNo))
                .where(bp.monaCd.eq(monaCd))
                .orderBy(b.proposeDt.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(bp.count())
                .from(bp)
                .where(bp.monaCd.eq(monaCd))
                .fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }
}

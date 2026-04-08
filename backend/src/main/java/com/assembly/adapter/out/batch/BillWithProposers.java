package com.assembly.adapter.out.batch;

import com.assembly.domain.bill.Bill;
import com.assembly.domain.bill.BillProposer;

import java.util.List;

record BillWithProposers(Bill bill, List<BillProposer> proposers) {}

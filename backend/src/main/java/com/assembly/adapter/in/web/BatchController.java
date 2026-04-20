package com.assembly.adapter.in.web;

import com.assembly.adapter.out.batch.AssetPdfParser;
import com.assembly.application.batch.BatchResult;
import com.assembly.application.batch.port.in.BatchTriggerUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/batch")
@RequiredArgsConstructor
public class BatchController {

    private final BatchTriggerUseCase batchTriggerUseCase;

    @PostMapping("/members")
    public ResponseEntity<BatchResult> runMembersJob() {
        return ResponseEntity.ok(batchTriggerUseCase.runMembers());
    }

    @PostMapping("/bills")
    public ResponseEntity<BatchResult> runBillsJob() {
        return ResponseEntity.ok(batchTriggerUseCase.runBills());
    }

    @PostMapping("/votes")
    public ResponseEntity<BatchResult> runVotesJob() {
        return ResponseEntity.ok(batchTriggerUseCase.runVotes());
    }

    @PostMapping("/votes/reload")
    public ResponseEntity<BatchResult> reloadVotesJob() {
        return ResponseEntity.ok(batchTriggerUseCase.runVotesReload());
    }

    @PostMapping("/historical-profiles")
    public ResponseEntity<BatchResult> runHistoricalProfilesJob() {
        return ResponseEntity.ok(batchTriggerUseCase.runHistoricalProfiles());
    }

    @PostMapping("/plenary-attendance")
    public ResponseEntity<BatchResult> runPlenaryAttendanceJob() {
        return ResponseEntity.ok(batchTriggerUseCase.runPlenaryAttendance());
    }

    @PostMapping("/committee-attendance")
    public ResponseEntity<BatchResult> runCommitteeAttendanceJob() {
        return ResponseEntity.ok(batchTriggerUseCase.runCommitteeAttendance());
    }

    @PostMapping("/all")
    public ResponseEntity<Map<String, BatchResult>> runAllJobs() {
        return ResponseEntity.ok(batchTriggerUseCase.runAll());
    }

    @PostMapping("/assets")
    public ResponseEntity<BatchResult> runAssetsJob(
            @RequestParam String pdfPath,
            @RequestParam(defaultValue = "2025") int declareYear) {
        return ResponseEntity.ok(batchTriggerUseCase.runAssets(pdfPath, declareYear));
    }

    /** PDF 구조 진단: 파서 결과 + 원본 텍스트(3~5페이지) 반환 */
    @GetMapping("/assets/diagnose")
    public ResponseEntity<Map<String, Object>> diagnoseAssets(@RequestParam String pdfPath) throws Exception {
        // 1. 파서 실행
        List<AssetPdfParser.MemberAssetData> parsed = AssetPdfParser.parse(pdfPath);

        // 2. 원본 텍스트 추출 (3~5페이지)
        byte[] bytes = Files.readAllBytes(Path.of(pdfPath));
        String rawText;
        try (PDDocument doc = Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(3);
            stripper.setEndPage(5);
            rawText = stripper.getText(doc);
        }

        List<String> foundNames = parsed.stream()
                .limit(20)
                .map(d -> d.name() + " (총" + d.totalCheonwon() + "천원, " + d.categories().size() + "개 카테고리)")
                .toList();

        return ResponseEntity.ok(Map.of(
                "parsedCount", parsed.size(),
                "first20", foundNames,
                "rawTextPage3to5", rawText.length() > 3000 ? rawText.substring(0, 3000) : rawText
        ));
    }
}

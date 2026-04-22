package com.assembly.adapter.in.web;

import com.assembly.application.governor.GovernorDetailResult;
import com.assembly.application.governor.GovernorResult;
import com.assembly.application.governor.port.in.GetGovernorUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/v1/governors")
@RequiredArgsConstructor
public class GovernorController {

    private final GetGovernorUseCase getGovernorUseCase;

    @GetMapping
    public ResponseEntity<List<GovernorResult>> getMetroMayors() {
        return ResponseEntity.ok(getGovernorUseCase.getMetroMayors());
    }

    @GetMapping("/{huboid}")
    public ResponseEntity<GovernorDetailResult> getGovernorDetail(@PathVariable String huboid) {
        try {
            return ResponseEntity.ok(getGovernorUseCase.getGovernorDetail(huboid));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }
}

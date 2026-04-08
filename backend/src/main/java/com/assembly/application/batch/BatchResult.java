package com.assembly.application.batch;

public record BatchResult(String jobName, Long executionId, String status) {}

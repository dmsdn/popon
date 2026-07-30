package popupteam.popupbackend.domain.report;

public enum ReportStatus {
    PENDING,   // 미처리
    REJECTED,  // 반려 - 신고가 부적절하다고 판단, 후기는 그대로 둠
    HIDDEN     // 후기 가리기 처리완료 - 후기 내용을 마스킹함 (별점·존재는 유지)
}
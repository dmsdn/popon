package popupteam.popupbackend.domain.popup;

public enum ContractStage {
    CONTRACTED,       // 계약완료 (계약금 등록 시 자동)
    IN_CONSTRUCTION,  // 시공중
    OPERATING,        // 운영중 (시공 완료 후 ~ 철거 전)
    SETTLED           // 정산완료
}
package popupteam.popupbackend.domain.popup;

public enum ContractStage {
    CONTRACTED,       // 계약완료 (계약금 등록 시 자동)
    IN_CONSTRUCTION,  // 시공중
    SETTLED           // 정산완료
}
package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.business.Business;
import popupteam.popupbackend.domain.business.BusinessRepository;
import popupteam.popupbackend.domain.popup.dto.ContractResponse;
import popupteam.popupbackend.domain.popup.dto.ContractSetRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PopupContractService {

    private final PopupContractRepository popupContractRepository;
    private final PopupRepository popupRepository;
    private final BusinessRepository businessRepository;

    // 관리자: 계약금 등록/수정
    public ContractResponse setContract(Long popupId, ContractSetRequest request, String adminEmail) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        PopupContract contract = popupContractRepository.findByPopupId(popupId)
                .orElseGet(() -> {
                    PopupContract c = new PopupContract();
                    c.setPopup(popup);
                    return c;
                });

        contract.setContractAmount(request.getContractAmount());
        contract.setMemo(request.getMemo());
        contract.setRegisteredBy(adminEmail);
        contract.setUpdatedAt(LocalDateTime.now());

        return ContractResponse.from(popupContractRepository.save(contract));
    }

    // 조회: 관리자는 전체, 주최자는 본인 팝업만
    public ContractResponse getContract(Long popupId, String requesterEmail, boolean isAdmin) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        if (!isAdmin) {
            Business business = businessRepository.findByEmail(requesterEmail)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));
            if (!popup.getBusiness().getId().equals(business.getId())) {
                throw new ForbiddenException("본인이 등록한 팝업의 계약금만 조회할 수 있습니다.");
            }
        }

        PopupContract contract = popupContractRepository.findByPopupId(popupId)
                .orElseThrow(() -> new IllegalArgumentException("등록된 계약금 정보가 없습니다."));

        return ContractResponse.from(contract);
    }
}
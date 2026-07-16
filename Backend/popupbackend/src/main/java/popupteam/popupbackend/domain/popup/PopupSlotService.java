package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.popup.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PopupSlotService {

    private final PopupSlotRepository popupSlotRepository;
    private final PopupRepository popupRepository;

    public PopupSlotResponse create(Long popupId, Long businessId, PopupSlotCreateRequest request) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        if (!popup.getBusiness().getId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업에만 시간대를 추가할 수 있습니다.");
        }

        PopupSlot slot = new PopupSlot();
        slot.setPopup(popup);
        slot.setSlotDate(request.getSlotDate());
        slot.setStartTime(request.getStartTime());
        slot.setEndTime(request.getEndTime());
        slot.setCapacity(request.getCapacity());

        PopupSlot saved = popupSlotRepository.save(slot);
        return PopupSlotResponse.from(saved, 0);
    }

    public List<PopupSlotResponse> findByPopup(Long popupId) {
        return popupSlotRepository.findByPopupId(popupId).stream()
                .map(slot -> PopupSlotResponse.from(slot, 0))
                .collect(Collectors.toList());
    }
}
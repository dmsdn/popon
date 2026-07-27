package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.popup.dto.PopupLiveStatusResponse;
import popupteam.popupbackend.domain.reservation.ReservationRepository;
import popupteam.popupbackend.domain.waiting.WaitingQueueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PopupLiveStatusService {

    private final PopupRepository popupRepository;
    private final ReservationRepository reservationRepository;
    private final WaitingQueueRepository waitingQueueRepository;

    public PopupLiveStatusResponse getLiveStatus(Long popupId) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        // 체크인/입장했지만 아직 퇴장하지 않은 실제 "인원수" (팀 수가 아니라 partySize 합계여야 정확함)
        int currentOccupancy = reservationRepository.findCurrentlyInsideByPopupId(popupId).stream()
                .mapToInt(popupteam.popupbackend.domain.reservation.Reservation::getPartySize)
                .sum()
                + waitingQueueRepository.findCurrentlyInsideByPopupId(popupId).stream()
                .mapToInt(popupteam.popupbackend.domain.waiting.WaitingQueue::getPartySize)
                .sum();

        int capacity = (popup.getCapacity() != null) ? popup.getCapacity() : 1;
        double congestionRate = (double) currentOccupancy / capacity;

        String label;
        if (congestionRate < 0.5) {
            label = "여유";
        } else if (congestionRate < 0.8) {
            label = "보통";
        } else {
            label = "혼잡";
        }

        return PopupLiveStatusResponse.builder()
                .popupId(popupId)
                .capacity(capacity)
                .currentOccupancy(currentOccupancy)
                .congestionRate(congestionRate)
                .congestionLabel(label)
                .build();
    }
}
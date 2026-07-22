package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.popup.dto.PopupLiveStatusResponse;
import popupteam.popupbackend.domain.reservation.ReservationRepository;
import popupteam.popupbackend.domain.waiting.WaitingQueueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PopupLiveStatusService {

    private final PopupRepository popupRepository;
    private final ReservationRepository reservationRepository;
    private final WaitingQueueRepository waitingQueueRepository;

    public PopupLiveStatusResponse getLiveStatus(Long popupId) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        int experienceMinutes = (popup.getAvgExperienceMinutes() != null) ? popup.getAvgExperienceMinutes() : 15;
        LocalDateTime since = LocalDateTime.now().minusMinutes(experienceMinutes);

        long fromReservations = reservationRepository.countRecentlyCheckedIn(popupId, since);
        long fromWaiting = waitingQueueRepository.countRecentlyEntered(popupId, since);
        int currentOccupancy = (int) (fromReservations + fromWaiting);

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
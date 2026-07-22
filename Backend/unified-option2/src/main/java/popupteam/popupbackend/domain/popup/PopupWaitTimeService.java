package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.popup.dto.*;
import popupteam.popupbackend.domain.reservation.Reservation;
import popupteam.popupbackend.domain.reservation.ReservationRepository;
import popupteam.popupbackend.domain.reservation.ReservationStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PopupWaitTimeService {

    private final PopupRepository popupRepository;
    private final PopupSlotRepository popupSlotRepository;
    private final ReservationRepository reservationRepository;

    public WaitTimeResponse calculate(Long popupId, LocalDate date) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        if (popup.getReservationMode() == ReservationMode.SLOT) {
            List<PopupSlot> slots = (date != null)
                    ? popupSlotRepository.findByPopupIdAndSlotDate(popupId, date)
                    : popupSlotRepository.findByPopupId(popupId); // 아래 참고: 없으면 추가 필요

            List<SlotWaitTimeResponse> slotResults = slots.stream()
                    .map(slot -> buildSlotResult(slot, popup.getAvgExperienceMinutes()))
                    .collect(Collectors.toList());

            return WaitTimeResponse.builder()
                    .popupId(popupId)
                    .reservationMode("SLOT")
                    .slots(slotResults)
                    .build();

        } else { // FREE
            if (date == null) {
                throw new IllegalArgumentException("FREE 모드 팝업은 date 파라미터가 필요합니다.");
            }

            int reserved = reservationRepository
                    .findByPopupIdAndReservationDateAndStatus(popupId, date, ReservationStatus.CONFIRMED)
                    .stream()
                    .mapToInt(Reservation::getPartySize)
                    .sum();

            double waitMinutes = calculateWaitMinutes(reserved, popup.getCapacity(), popup.getAvgExperienceMinutes());

            PopupWaitTimeResponse freeResult = PopupWaitTimeResponse.builder()
                    .popupId(popupId)
                    .date(date)
                    .reservedCount(reserved)
                    .capacity(popup.getCapacity())
                    .estimatedWaitMinutes(waitMinutes)
                    .build();

            return WaitTimeResponse.builder()
                    .popupId(popupId)
                    .reservationMode("FREE")
                    .freeModeResult(freeResult)
                    .build();
        }
    }

    private SlotWaitTimeResponse buildSlotResult(PopupSlot slot, Integer avgExperienceMinutes) {
        int reserved = reservationRepository.findBySlotIdAndStatus(slot.getId(), ReservationStatus.CONFIRMED)
                .stream()
                .mapToInt(Reservation::getPartySize)
                .sum();

        double waitMinutes = calculateWaitMinutes(reserved, slot.getCapacity(), avgExperienceMinutes);

        return SlotWaitTimeResponse.builder()
                .slotId(slot.getId())
                .slotDate(slot.getSlotDate())
                .startTime(slot.getStartTime())
                .endTime(slot.getEndTime())
                .reservedCount(reserved)
                .capacity(slot.getCapacity())
                .estimatedWaitMinutes(waitMinutes)
                .build();
    }

    // 대기시간(분) = 체험시간 × (⌈예약인원/정원⌉ - 1) / 2
    private double calculateWaitMinutes(int reserved, int capacity, int avgExperienceMinutes) {
        if (reserved <= capacity) return 0.0;
        int batches = (int) Math.ceil((double) reserved / capacity);
        return avgExperienceMinutes * (batches - 1) / 2.0;
    }
}
package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.popup.dto.*;
import popupteam.popupbackend.domain.reservation.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PopupSlotService {

    private final PopupSlotRepository popupSlotRepository;
    private final PopupRepository popupRepository;
    private final ReservationRepository reservationRepository;

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
                .map(slot -> {
                    int reserved = reservationRepository.findBySlotId(slot.getId()).stream()
                            .mapToInt(r -> r.getPartySize())
                            .sum();
                    return PopupSlotResponse.from(slot, reserved);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public SlotGenerateResponse generate(Long popupId, Long businessId, SlotGenerateRequest request) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        if (!popup.getBusiness().getId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업만 슬롯을 생성할 수 있습니다.");
        }
        if (popup.getStartDate() == null || popup.getEndDate() == null) {
            throw new IllegalArgumentException("팝업의 운영 시작일/종료일이 설정되어 있어야 합니다.");
        }
        if (popup.getAvgExperienceMinutes() == null || popup.getAvgExperienceMinutes() <= 0) {
            throw new IllegalArgumentException("체험 소요시간이 설정되어 있어야 합니다.");
        }

        List<PopupSlot> existingSlots = popupSlotRepository.findByPopupId(popupId);

        int fallbackCapacity;
        if (request != null && request.getPerSlotCapacity() != null) {
            fallbackCapacity = request.getPerSlotCapacity();
        } else if (!existingSlots.isEmpty()) {
            fallbackCapacity = existingSlots.get(0).getCapacity();
        } else if (popup.getCapacity() != null) {
            fallbackCapacity = popup.getCapacity();
        } else {
            fallbackCapacity = 10;
        }

        LocalDate startDate = popup.getStartDate().toLocalDate();
        LocalDate endDate = popup.getEndDate().toLocalDate();
        LocalTime dailyStart = popup.getStartDate().toLocalTime();
        LocalTime dailyEnd = popup.getEndDate().toLocalTime();
        int slotMinutes = popup.getAvgExperienceMinutes();

        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("시작일이 종료일보다 늦을 수 없습니다.");
        }
        if (!dailyStart.isBefore(dailyEnd)) {
            throw new IllegalArgumentException("일일 운영 시작시간이 종료시간보다 빨라야 합니다.");
        }

        record ExpectedSlot(LocalDate date, LocalTime start, LocalTime end) {}
        List<ExpectedSlot> expected = new ArrayList<>();

        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            LocalTime cursor = dailyStart;
            while (true) {
                LocalTime slotEnd = cursor.plusMinutes(slotMinutes);
                if (slotEnd.isAfter(dailyEnd)) break;
                expected.add(new ExpectedSlot(date, cursor, slotEnd));
                cursor = slotEnd;
                if (cursor.equals(dailyEnd)) break;
            }
        }

        if (expected.size() > 1000) {
            throw new IllegalArgumentException("생성 가능한 슬롯 수(1000개)를 초과했습니다. 운영기간이나 체험시간을 확인해주세요.");
        }

        Map<String, PopupSlot> existingByKey = existingSlots.stream()
                .collect(Collectors.toMap(s -> s.getSlotDate() + "|" + s.getStartTime(), s -> s));

        Set<String> expectedKeys = expected.stream()
                .map(e -> e.date() + "|" + e.start())
                .collect(Collectors.toSet());

        List<PopupSlot> toCreate = new ArrayList<>();
        for (ExpectedSlot e : expected) {
            String key = e.date() + "|" + e.start();
            if (!existingByKey.containsKey(key)) {
                PopupSlot slot = new PopupSlot();
                slot.setPopup(popup);
                slot.setSlotDate(e.date());
                slot.setStartTime(e.start());
                slot.setEndTime(e.end());
                slot.setCapacity(fallbackCapacity);
                toCreate.add(slot);
            }
        }
        if (!toCreate.isEmpty()) {
            popupSlotRepository.saveAll(toCreate);
        }

        int deletedStale = 0;
        int keptStale = 0;
        for (PopupSlot slot : existingSlots) {
            String key = slot.getSlotDate() + "|" + slot.getStartTime();
            if (!expectedKeys.contains(key)) {
                boolean hasReservations = !reservationRepository.findBySlotId(slot.getId()).isEmpty();
                if (hasReservations) {
                    keptStale++;
                } else {
                    popupSlotRepository.delete(slot);
                    deletedStale++;
                }
            }
        }

        return SlotGenerateResponse.builder()
                .created(toCreate.size())
                .deletedStale(deletedStale)
                .keptStale(keptStale)
                .slots(findByPopup(popupId))
                .build();
    }
}
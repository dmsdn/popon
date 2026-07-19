package popupteam.popupbackend.domain.reservation;

import popupteam.popupbackend.domain.customer.Customer;
import popupteam.popupbackend.domain.customer.CustomerRepository;
import popupteam.popupbackend.domain.popup.PopupSlot;
import popupteam.popupbackend.domain.popup.PopupSlotRepository;
import popupteam.popupbackend.domain.reservation.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final PopupSlotRepository popupSlotRepository;
    private final CustomerRepository customerRepository;

    public ReservationResponse create(Long customerId, ReservationCreateRequest request) {
        PopupSlot slot = popupSlotRepository.findById(request.getSlotId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 시간대입니다."));

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 소비자입니다."));

        int reserved = reservationRepository.findBySlotId(slot.getId()).stream()
                .mapToInt(r -> r.getPartySize())
                .sum();

        if (reserved + request.getPartySize() > slot.getCapacity()) {
            throw new IllegalArgumentException("정원이 초과되어 예약할 수 없습니다. 남은 자리: " + (slot.getCapacity() - reserved));
        }

        Reservation reservation = new Reservation();
        reservation.setSlot(slot);
        reservation.setCustomer(customer);
        reservation.setPartySize(request.getPartySize());

        return ReservationResponse.from(reservationRepository.save(reservation));
    }

    public List<ReservationResponse> findByCustomer(Long customerId) {
        return reservationRepository.findByCustomerId(customerId).stream()
                .map(ReservationResponse::from)
                .collect(Collectors.toList());
    }

    public List<ReservationDetailResponse> getByPopup(Long popupId) {
        return reservationRepository.findByPopupId(popupId).stream()
                .map(ReservationDetailResponse::from)
                .collect(Collectors.toList());
    }
}
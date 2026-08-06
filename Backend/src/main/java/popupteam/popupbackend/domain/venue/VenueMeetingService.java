package popupteam.popupbackend.domain.venue;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.business.Business;
import popupteam.popupbackend.domain.business.BusinessRepository;
import popupteam.popupbackend.domain.venue.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

// [기능 탈락] 파트너 공간 탐색,대관 미팅 프론트 기획 단계에서 빠져서, 이 도메인 전체가 호출부 없이 남아있음 (백엔드 로직은 완성)

@Service
@RequiredArgsConstructor
public class VenueMeetingService {

    private final VenueMeetingRequestRepository venueMeetingRequestRepository;
    private final VenueRepository venueRepository;
    private final BusinessRepository businessRepository;

    // 주최자: 미팅 신청
    public VenueMeetingResponse create(Long venueId, String businessEmail, VenueMeetingCreateRequest request) {
        Venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 공간입니다."));
        Business business = businessRepository.findByEmail(businessEmail)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));

        VenueMeetingRequest meeting = new VenueMeetingRequest();
        meeting.setVenue(venue);
        meeting.setBusiness(business);
        meeting.setMessage(request.getMessage());

        return VenueMeetingResponse.from(venueMeetingRequestRepository.save(meeting));
    }

    // 주최자: 본인 신청 목록
    public List<VenueMeetingResponse> getMyRequests(String businessEmail) {
        Business business = businessRepository.findByEmail(businessEmail)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));

        return venueMeetingRequestRepository.findByBusinessIdOrderByCreatedAtDesc(business.getId()).stream()
                .map(VenueMeetingResponse::from)
                .collect(Collectors.toList());
    }

    // 관리자: 전체 목록 (필터 옵션)
    public List<VenueMeetingResponse> getAll(VenueMeetingStatus status) {
        List<VenueMeetingRequest> list = (status != null)
                ? venueMeetingRequestRepository.findByStatusOrderByCreatedAtAsc(status)
                : venueMeetingRequestRepository.findAllByOrderByCreatedAtDesc();

        return list.stream().map(VenueMeetingResponse::from).collect(Collectors.toList());
    }

    // 관리자: 상태 변경 (미팅 진행/계약완료/취소)
    public VenueMeetingResponse updateStatus(Long id, VenueMeetingStatusUpdateRequest request) {
        VenueMeetingRequest meeting = venueMeetingRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 신청입니다."));

        meeting.setStatus(VenueMeetingStatus.valueOf(request.getStatus()));
        if (request.getAdminNote() != null) meeting.setAdminNote(request.getAdminNote());
        meeting.setUpdatedAt(LocalDateTime.now());

        return VenueMeetingResponse.from(venueMeetingRequestRepository.save(meeting));
    }
}
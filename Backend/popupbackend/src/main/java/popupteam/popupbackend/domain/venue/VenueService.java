package popupteam.popupbackend.domain.venue;

import popupteam.popupbackend.domain.venue.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VenueService {

    private final VenueRepository venueRepository;

    // 관리자: 등록
    public VenueResponse create(VenueCreateRequest request) {
        Venue venue = new Venue();
        venue.setName(request.getName());
        venue.setAddress(request.getAddress());
        venue.setAreaSqm(request.getAreaSqm());
        venue.setRentalFee(request.getRentalFee());
        venue.setDescription(request.getDescription());
        venue.setImageUrl(request.getImageUrl());

        return VenueResponse.from(venueRepository.save(venue));
    }

    // 관리자: 수정
    public VenueResponse update(Long id, VenueUpdateRequest request) {
        Venue venue = venueRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 공간입니다."));

        if (request.getName() != null) venue.setName(request.getName());
        if (request.getAddress() != null) venue.setAddress(request.getAddress());
        if (request.getAreaSqm() != null) venue.setAreaSqm(request.getAreaSqm());
        if (request.getRentalFee() != null) venue.setRentalFee(request.getRentalFee());
        if (request.getDescription() != null) venue.setDescription(request.getDescription());
        if (request.getImageUrl() != null) venue.setImageUrl(request.getImageUrl());
        if (request.getStatus() != null) venue.setStatus(VenueStatus.valueOf(request.getStatus()));
        venue.setUpdatedAt(LocalDateTime.now());

        return VenueResponse.from(venueRepository.save(venue));
    }

    // 관리자: 삭제
    public void delete(Long id) {
        if (!venueRepository.existsById(id)) {
            throw new IllegalArgumentException("존재하지 않는 공간입니다.");
        }
        venueRepository.deleteById(id);
    }

    // 전체 공개: 목록 조회 (status 필터 옵션)
    public List<VenueResponse> getAll(VenueStatus status) {
        List<Venue> venues = (status != null)
                ? venueRepository.findByStatusOrderByCreatedAtDesc(status)
                : venueRepository.findAllByOrderByCreatedAtDesc();

        return venues.stream().map(VenueResponse::from).collect(Collectors.toList());
    }

    // 전체 공개: 상세 조회
    public VenueResponse getById(Long id) {
        Venue venue = venueRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 공간입니다."));
        return VenueResponse.from(venue);
    }
}
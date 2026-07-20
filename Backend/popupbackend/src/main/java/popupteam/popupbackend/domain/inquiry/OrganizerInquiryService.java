package popupteam.popupbackend.domain.inquiry;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.business.Business;
import popupteam.popupbackend.domain.business.BusinessRepository;
import popupteam.popupbackend.domain.inquiry.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrganizerInquiryService {

    private final OrganizerInquiryRepository organizerInquiryRepository;
    private final BusinessRepository businessRepository;

    // 주최자: 문의 작성
    public InquiryResponse create(String businessEmail, InquiryCreateRequest request) {
        Business business = businessRepository.findByEmail(businessEmail)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));

        OrganizerInquiry inquiry = new OrganizerInquiry();
        inquiry.setBusiness(business);
        inquiry.setTitle(request.getTitle());
        inquiry.setContent(request.getContent());

        return InquiryResponse.from(organizerInquiryRepository.save(inquiry));
    }

    // 주최자: 본인 문의 목록
    public List<InquiryResponse> getMyInquiries(String businessEmail) {
        Business business = businessRepository.findByEmail(businessEmail)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));

        return organizerInquiryRepository.findByBusinessIdOrderByCreatedAtDesc(business.getId()).stream()
                .map(InquiryResponse::from)
                .collect(Collectors.toList());
    }

    // 관리자: 전체 문의 목록 (필터 옵션)
    public List<InquiryResponse> getAllInquiries(InquiryStatus status) {
        List<OrganizerInquiry> inquiries = (status != null)
                ? organizerInquiryRepository.findByStatusOrderByCreatedAtAsc(status)
                : organizerInquiryRepository.findAllByOrderByCreatedAtDesc();

        return inquiries.stream()
                .map(InquiryResponse::from)
                .collect(Collectors.toList());
    }

    // 관리자: 답변 등록 (자동으로 ANSWERED 처리)
    public InquiryResponse answer(Long inquiryId, String adminEmail, InquiryAnswerRequest request) {
        OrganizerInquiry inquiry = organizerInquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 문의입니다."));

        inquiry.setAnswerContent(request.getAnswerContent());
        inquiry.setAnsweredBy(adminEmail);
        inquiry.setAnsweredAt(LocalDateTime.now());
        inquiry.setStatus(InquiryStatus.ANSWERED);

        return InquiryResponse.from(organizerInquiryRepository.save(inquiry));
    }

    // 관리자 대시보드용: 미처리 건수
    public long countPending() {
        return organizerInquiryRepository.countByStatus(InquiryStatus.PENDING);
    }
}
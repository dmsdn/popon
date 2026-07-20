package popupteam.popupbackend.domain.cs;

import popupteam.popupbackend.domain.cs.dto.*;
import popupteam.popupbackend.domain.customer.Customer;
import popupteam.popupbackend.domain.customer.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CsRequestService {

    private final CsRequestRepository csRequestRepository;
    private final CustomerRepository customerRepository;

    // 참가자: CS 작성
    public CsResponse create(Long customerId, CsCreateRequest request) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 소비자입니다."));

        CsRequest cs = new CsRequest();
        cs.setCustomer(customer);
        cs.setTitle(request.getTitle());
        cs.setContent(request.getContent());

        return CsResponse.from(csRequestRepository.save(cs));
    }

    // 참가자: 본인 CS 목록
    public List<CsResponse> getMyRequests(Long customerId) {
        return csRequestRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(CsResponse::from)
                .collect(Collectors.toList());
    }

    // 관리자: 전체 CS 목록 (필터 옵션)
    public List<CsResponse> getAllRequests(CsStatus status) {
        List<CsRequest> requests = (status != null)
                ? csRequestRepository.findByStatusOrderByCreatedAtAsc(status)
                : csRequestRepository.findAllByOrderByCreatedAtDesc();

        return requests.stream()
                .map(CsResponse::from)
                .collect(Collectors.toList());
    }

    // 관리자: 답변 등록
    public CsResponse answer(Long csId, String adminEmail, CsAnswerRequest request) {
        CsRequest cs = csRequestRepository.findById(csId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 CS 요청입니다."));

        cs.setAnswerContent(request.getAnswerContent());
        cs.setAnsweredBy(adminEmail);
        cs.setAnsweredAt(LocalDateTime.now());
        cs.setStatus(CsStatus.ANSWERED);

        return CsResponse.from(csRequestRepository.save(cs));
    }

    // 관리자 대시보드용: 미처리 건수
    public long countPending() {
        return csRequestRepository.countByStatus(CsStatus.PENDING);
    }
}
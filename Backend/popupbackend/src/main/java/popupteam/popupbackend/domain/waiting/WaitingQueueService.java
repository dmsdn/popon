package popupteam.popupbackend.domain.waiting;

import popupteam.popupbackend.domain.popup.Popup;
import popupteam.popupbackend.domain.popup.PopupRepository;
import popupteam.popupbackend.domain.waiting.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WaitingQueueService {

    private final WaitingQueueRepository waitingQueueRepository;
    private final PopupRepository popupRepository;

    // 키오스크/패드: 대기 등록
    public WaitingResponse register(Long popupId, WaitingCreateRequest request) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        int nextTeamNumber = waitingQueueRepository.findMaxTeamNumberToday(popupId, startOfDay) + 1;

        WaitingQueue waiting = new WaitingQueue();
        waiting.setPopup(popup);
        waiting.setPhoneNumber(request.getPhoneNumber());
        waiting.setPartySize(request.getPartySize());
        waiting.setTeamNumber(nextTeamNumber);

        WaitingQueue saved = waitingQueueRepository.save(waiting);
        long teamsAhead = waitingQueueRepository.countAheadOf(popupId, saved.getId());

        return WaitingResponse.from(saved, teamsAhead);
    }

    // 패드 현황판: 대기중인 팀 전체 목록 (폴링으로 몇 초마다 조회)
    public WaitingBoardResponse getBoard(Long popupId) {
        List<WaitingQueue> waitingList = waitingQueueRepository
                .findByPopupIdAndStatusOrderByRegisteredAtAsc(popupId, WaitingStatus.WAITING);

        List<WaitingResponse> responses = waitingList.stream()
                .map(w -> {
                    long ahead = waitingQueueRepository.countAheadOf(popupId, w.getId());
                    return WaitingResponse.from(w, ahead);
                })
                .collect(Collectors.toList());

        return WaitingBoardResponse.builder()
                .popupId(popupId)
                .totalWaitingTeams(responses.size())
                .waitingList(responses)
                .build();
    }

    // 개별 조회 (내 대기번호로 순번 확인)
    public WaitingResponse getMyStatus(Long waitingId) {
        WaitingQueue w = waitingQueueRepository.findById(waitingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 대기입니다."));
        long ahead = w.getStatus() == WaitingStatus.WAITING
                ? waitingQueueRepository.countAheadOf(w.getPopup().getId(), w.getId())
                : 0;
        return WaitingResponse.from(w, ahead);
    }

    // 주최자/관리자: 호출 (15분 타이머 시작)
    public WaitingResponse call(Long waitingId) {
        WaitingQueue w = waitingQueueRepository.findById(waitingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 대기입니다."));

        if (w.getStatus() != WaitingStatus.WAITING) {
            throw new IllegalArgumentException("대기중인 팀만 호출할 수 있습니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        w.setStatus(WaitingStatus.CALLED);
        w.setCalledAt(now);
        w.setCallExpiresAt(now.plusMinutes(15));
        waitingQueueRepository.save(w);

        // === 카카오톡 알림 연동 지점 ===
        // TODO: 카카오 비즈니스 알림톡 API 키 발급 후, 아래에 실제 발송 코드 추가
        // kakaoAlimtalkClient.send(w.getPhoneNumber(), "입장 순서가 되었습니다. 15분 이내 입장해주세요.");
        log.info("[카카오 알림 발송 대상] phone={}, teamNumber={}", w.getPhoneNumber(), w.getTeamNumber());

        return WaitingResponse.from(w, 0L);
    }

    // 주최자/관리자: 입장 확인
    public WaitingResponse enter(Long waitingId) {
        WaitingQueue w = waitingQueueRepository.findById(waitingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 대기입니다."));

        if (w.getStatus() != WaitingStatus.CALLED) {
            throw new IllegalArgumentException("호출된 팀만 입장 처리할 수 있습니다.");
        }

        w.setStatus(WaitingStatus.ENTERED);
        w.setEnteredAt(LocalDateTime.now());
        waitingQueueRepository.save(w);

        return WaitingResponse.from(w, 0L);
    }

    // 주최자/관리자: 수동 취소
    public WaitingResponse cancel(Long waitingId) {
        WaitingQueue w = waitingQueueRepository.findById(waitingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 대기입니다."));

        w.setStatus(WaitingStatus.CANCELLED);
        waitingQueueRepository.save(w);

        return WaitingResponse.from(w, 0L);
    }
}
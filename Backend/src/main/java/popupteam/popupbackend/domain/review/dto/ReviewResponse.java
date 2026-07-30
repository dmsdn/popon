package popupteam.popupbackend.domain.review.dto;

import popupteam.popupbackend.domain.review.Review;
import lombok.Getter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
public class ReviewResponse {
    private final Long id;
    private final Long popupId;
    private final BigDecimal rating;
    private final String content;
    private final List<String> imageUrls;
    private final String nickname;
    private final long likeCount;
    private final boolean likedByMe;
    private final LocalDate visitDate;
    private final boolean hidden;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    // 7/30 머지 — jsw의 신고 숨김(maskIfHidden)과 jmy의 작성자 닉네임이 같은 생성자에서 만났다.
    // 둘을 다 살리되, 기존 호출부가 깨지지 않게 오버로드 3개로 계단을 만들어 둔다.

    // 작성자 본인이 보는 경우(내가 쓴 리뷰 목록, 작성/수정 직후 응답)는 실제 내용 그대로 보여줌
    public ReviewResponse(Review review, List<String> imageUrls, long likeCount, boolean likedByMe) {
        this(review, imageUrls, likeCount, likedByMe, false, null);
    }

    // 닉네임만 필요한 경우 (마스킹 없음)
    public ReviewResponse(Review review, List<String> imageUrls, long likeCount, boolean likedByMe, String nickname) {
        this(review, imageUrls, likeCount, likedByMe, false, nickname);
    }

    // maskIfHidden=true면 신고로 숨김 처리된 후기는 내용을 안내 문구로 대체 (다른 사람이 보는 목록/상세용)
    public ReviewResponse(Review review, List<String> imageUrls, long likeCount, boolean likedByMe, boolean maskIfHidden) {
        this(review, imageUrls, likeCount, likedByMe, maskIfHidden, null);
    }

    public ReviewResponse(Review review, List<String> imageUrls, long likeCount, boolean likedByMe,
                          boolean maskIfHidden, String nickname) {
        this.id = review.getId();
        this.popupId = review.getPopupId();
        this.rating = review.getRating();
        boolean shouldMask = maskIfHidden && review.isHidden();
        this.content = shouldMask ? "신고처리된 후기입니다." : review.getContent();
        this.imageUrls = shouldMask ? List.of() : imageUrls;
        this.likeCount = likeCount;
        this.likedByMe = likedByMe;
        this.visitDate = review.getVisitDate();
        this.hidden = review.isHidden();
        this.nickname = nickname;
        this.createdAt = review.getCreatedAt();
        this.updatedAt = review.getUpdatedAt();
    }
}
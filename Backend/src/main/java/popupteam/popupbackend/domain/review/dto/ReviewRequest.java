package popupteam.popupbackend.domain.review.dto;

import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class ReviewRequest {
    private Long popupId;
    private BigDecimal rating;
    private String content;
    private List<String> imageUrls;
    private LocalDate visitDate; // 프론트가 실제 체크인/입장 기록에서 계산해서 보냄 (선택입력)
}
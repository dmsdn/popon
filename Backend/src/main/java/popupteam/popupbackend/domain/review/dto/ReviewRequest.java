package popupteam.popupbackend.domain.review.dto;

import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
public class ReviewRequest {
    private Long popupId;
    private BigDecimal rating;
    private String content;
    private List<String> imageUrls;
}
package popupteam.popupbackend.domain.terms;

// [프론트 폐지, 8/3] 원래는 관리자가 이 API로 약관 본문(제목/내용)을 DB에서 수정하고,
// 소비자/주최자 앱이 GET /api/terms로 그 내용을 불러와 보여주는 구조였음.
// 그런데 관리자 쪽 "약관 관리" 화면이 8/3에 통째로 빠지면서, 약관 텍스트를
// 각 프론트엔드(TermsModal.tsx)에 직접 하드코딩하는 방식으로 대체됨.
// 그 결과 이 컨트롤러(GET/PUT 둘 다)는 코드는 살아있지만 실제로 호출하는 곳이 없음.

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "terms")
@Getter @Setter
@NoArgsConstructor
public class Terms {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
}
package popupteam.popupbackend.domain.consumer;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "keyword")
@Getter
@Setter
@NoArgsConstructor
public class Keyword {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    // 카테고리 아이콘 이미지 URL. 기존 8개 카테고리처럼 아이콘이 없으면 null - 프론트에서 폴백 아이콘 사용.
    @Column(name = "icon_url")
    private String iconUrl;

    public Keyword(String name) {
        this.name = name;
    }
}
package popupteam.popupbackend.domain.consumer;

import popupteam.popupbackend.domain.consumer.Keyword;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KeywordRepository extends JpaRepository<Keyword, Long> {
    boolean existsByName(String name);
}
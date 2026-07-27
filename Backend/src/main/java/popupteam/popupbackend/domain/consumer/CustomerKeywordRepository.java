package popupteam.popupbackend.domain.consumer;

import popupteam.popupbackend.domain.consumer.CustomerKeyword;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerKeywordRepository extends JpaRepository<CustomerKeyword, CustomerKeyword.PK> {
   List<CustomerKeyword> findByCustomerId(Long customerId);

   void deleteByCustomerId(Long customerId);

   long countByKeywordId(Long keywordId);

   void deleteByKeywordId(Long keywordId);
}
package popupteam.popupbackend.domain.consumer;

import popupteam.popupbackend.domain.consumer.Customer;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// [통합 수정] popupbackend의 CustomerRepository와 빈 이름 충돌 회피를 위해 개명
public interface CustomerAccountRepository extends JpaRepository<Customer, Long> {
   Optional<Customer> findByProviderAndProviderId(Customer.Provider provider, String providerId);

   // 활성 계정만 매칭 (탈퇴한 계정은 재로그인으로 되살아나지 않고, 새 계정으로 재가입됨)
   Optional<Customer> findByProviderAndSocialIdAndWithdrawnFalse(Customer.Provider provider, String socialId);

   // socialId 컬럼 도입 이전 가입자를 위한 레거시 호환 조회
   Optional<Customer> findByProviderAndProviderIdAndWithdrawnFalse(Customer.Provider provider, String providerId);

   // 같은 socialId로 지금까지 몇 번 가입했는지 (탈퇴 이력 포함) -> id_2, id_3 채번용
   long countByProviderAndSocialId(Customer.Provider provider, String socialId);

   // [신규 8/5] 관리자 일반 공지를 전체 회원에게 뿌릴 때 쓰는 수신자 id 목록.
   // 탈퇴 계정은 빼고, 엔티티 전체 대신 id만 받는다 — 수신자 행을 만드는 데
   // 필요한 건 id뿐이고 회원 수만큼 엔티티를 메모리에 올릴 이유가 없다.
   @org.springframework.data.jpa.repository.Query("SELECT c.id FROM Customer c WHERE c.withdrawn = false")
   java.util.List<Long> findAllActiveIds();
}
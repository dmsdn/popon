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
}
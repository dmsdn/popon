package com.popupplatform.backend.repository;

import com.popupplatform.backend.entity.Customer;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// [통합 수정] popupbackend의 CustomerRepository와 빈 이름 충돌 회피를 위해 개명
public interface CustomerAccountRepository extends JpaRepository<Customer, Long> {
   Optional<Customer> findByProviderAndProviderId(Customer.Provider provider, String providerId);
}

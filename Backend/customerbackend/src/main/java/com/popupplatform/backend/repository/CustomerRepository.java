package com.popupplatform.backend.repository;

import com.popupplatform.backend.entity.Customer;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
   Optional<Customer> findByProviderAndProviderId(Customer.Provider provider, String providerId);
}

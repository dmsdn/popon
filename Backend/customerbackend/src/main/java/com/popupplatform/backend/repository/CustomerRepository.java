package com.popupplatform.backend.repository;

import com.popupplatform.backend.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByProviderAndProviderId(Customer.Provider provider, String providerId);
}
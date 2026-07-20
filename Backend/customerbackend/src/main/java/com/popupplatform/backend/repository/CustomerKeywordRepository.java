package com.popupplatform.backend.repository;

import com.popupplatform.backend.entity.CustomerKeyword;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerKeywordRepository extends JpaRepository<CustomerKeyword, CustomerKeyword.PK> {
   List<CustomerKeyword> findByCustomerId(Long customerId);

   void deleteByCustomerId(Long customerId);
}

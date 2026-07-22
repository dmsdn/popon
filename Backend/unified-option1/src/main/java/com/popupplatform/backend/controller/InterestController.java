// Source code is decompiled from a .class file using FernFlower decompiler (from Intellij IDEA).
package com.popupplatform.backend.controller;

import com.popupplatform.backend.entity.CustomerKeyword;
import com.popupplatform.backend.repository.CustomerKeywordRepository;
import com.popupplatform.backend.util.JwtUtil;
import java.util.List;
import java.util.Map;
import lombok.Generated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/customer"})
public class InterestController {
   private final CustomerKeywordRepository customerKeywordRepository;
   private final JwtUtil jwtUtil;

   @PostMapping({"/interests"})
   public Map<String, Object> saveInterests(@RequestHeader("Authorization") String authHeader, @RequestBody Map<String, List<Long>> body) {
      String token = authHeader.replace("Bearer ", "");
      Long customerId = this.jwtUtil.getCustomerIdFromToken(token);
      List<Long> keywordIds = (List)body.get("keywordIds");
      this.customerKeywordRepository.deleteByCustomerId(customerId);

      for(Long keywordId : keywordIds) {
         CustomerKeyword ck = new CustomerKeyword();
         ck.setCustomerId(customerId);
         ck.setKeywordId(keywordId);
         this.customerKeywordRepository.save(ck);
      }

      return Map.of("success", true, "count", keywordIds.size());
   }

   @Generated
   public InterestController(final CustomerKeywordRepository customerKeywordRepository, final JwtUtil jwtUtil) {
      this.customerKeywordRepository = customerKeywordRepository;
      this.jwtUtil = jwtUtil;
   }
}

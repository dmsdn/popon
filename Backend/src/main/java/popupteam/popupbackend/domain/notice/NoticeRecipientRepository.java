package popupteam.popupbackend.domain.notice;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface NoticeRecipientRepository extends JpaRepository<NoticeRecipient, Long> {

    @Query("SELECT nr FROM NoticeRecipient nr JOIN FETCH nr.notice n " +
            "WHERE nr.recipientId = :recipientId AND n.recipientType = :recipientType " +
            "ORDER BY n.sentAt DESC")
    List<NoticeRecipient> findAllForRecipient(@Param("recipientId") Long recipientId,
                                              @Param("recipientType") NoticeRecipientType recipientType);

    @Query("SELECT nr FROM NoticeRecipient nr JOIN FETCH nr.notice n " +
            "WHERE nr.recipientId = :recipientId AND n.recipientType = :recipientType AND n.category = :category " +
            "ORDER BY n.sentAt DESC")
    List<NoticeRecipient> findAllForRecipientByCategory(@Param("recipientId") Long recipientId,
                                                        @Param("recipientType") NoticeRecipientType recipientType,
                                                        @Param("category") NoticeCategory category);

    @Query("SELECT COUNT(nr) FROM NoticeRecipient nr JOIN nr.notice n " +
            "WHERE nr.recipientId = :recipientId AND n.recipientType = :recipientType AND nr.readAt IS NULL")
    long countUnread(@Param("recipientId") Long recipientId, @Param("recipientType") NoticeRecipientType recipientType);

    Optional<NoticeRecipient> findByIdAndRecipientId(Long id, Long recipientId);
}
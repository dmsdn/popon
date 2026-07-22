-- ── 팝업온 DB 초기화 스크립트 (선택 실행) ──
-- 대상: 새로 만든 popupdb, 또는 관리자 계정·키워드 시드가 없는 로컬 DB
-- 실행 순서: ① 백엔드를 한 번 기동해 테이블 자동 생성(ddl-auto: update) → ② 이 스크립트 실행
--   mysql -u root -p popupdb < db-init.sql
-- INSERT IGNORE라 여러 번 실행해도 안전(멱등).

-- 1) 관리자 팀 공용 계정 (로그인: admin@popupon.kr / admin1234)
--    관리자 가입 API는 없으므로 DB 직접 삽입이 유일한 방법
INSERT IGNORE INTO admin (email, password, name)
VALUES ('admin@popupon.kr', '$2b$12$gH1NZJeVbIdxLzx9CNxGru/sDnMuEvOlfS5zRuedb2.VXeaK5QUxW', '플랫폼관리자');

-- 2) 관심 키워드 마스터 8종 (소비자 관심 카테고리 설문용)
INSERT IGNORE INTO keyword (id, name) VALUES
  (1, '패션'), (2, '뷰티'), (3, 'F&B'), (4, '캐릭터'),
  (5, '라이프스타일'), (6, '아트'), (7, '테크'), (8, '엔터테인먼트');

-- 3) 구 customerbackend의 예약 테이블 정리 (통합으로 popup_reservation 단일화 — 팀 결정 7/22)
--    ddl-auto는 테이블을 지워주지 않으므로 수동 정리. 없으면 그냥 넘어감.
DROP TABLE IF EXISTS reservation;

-- 참고: 주최자 테스트 계정은 프론트(/signup)에서 가입하면 즉시 활성됨 (별도 시드 불필요)

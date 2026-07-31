package popupteam.popupbackend.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.dao.DataIntegrityViolationException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(e.getMessage()));
    }

    // 외부 의존 서비스를 지금 쓸 수 없어 처리를 못 한 경우 (7/31 신설).
    // 사용자 입력이 잘못된 게 아니므로 400이 아니라 503이어야 한다 — 클라이언트가
    // "다시 시도하면 될 수도 있다"를 상태 코드만으로 구분할 수 있게 한다.
    // 첫 사례: 국세청 사업자등록 상태조회가 503으로 죽었을 때의 회원가입 차단.
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleServiceUnavailable(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getDefaultMessage())
                .orElse("입력값이 올바르지 않습니다.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(message));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponse> handleForbidden(ForbiddenException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(e.getMessage()));
    }

    // 토큰 만료 (로그인 세션 만료). JwtException의 하위타입이라 아래 핸들러보다 먼저 매칭됨.
    @ExceptionHandler(io.jsonwebtoken.ExpiredJwtException.class)
    public ResponseEntity<ErrorResponse> handleExpiredJwt(io.jsonwebtoken.ExpiredJwtException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse("로그인이 만료되었습니다. 다시 로그인해주세요."));
    }

    // 그 외 JWT 파싱 오류 (위변조된 토큰, 형식이 깨진 토큰 등)
    @ExceptionHandler(io.jsonwebtoken.JwtException.class)
    public ResponseEntity<ErrorResponse> handleInvalidJwt(io.jsonwebtoken.JwtException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse("유효하지 않은 인증 정보입니다. 다시 로그인해주세요."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("연관된 데이터가 있어 처리할 수 없습니다. (예약, 이미지 등 참조 데이터를 먼저 확인해주세요.)"));
    }
}
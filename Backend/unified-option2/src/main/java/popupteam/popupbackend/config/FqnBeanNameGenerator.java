package popupteam.popupbackend.config;

import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.AnnotationBeanNameGenerator;

/**
 * [통합 셸] 빈 이름을 패키지 전체 경로로 생성 —
 * 두 트리에 동명 클래스(SecurityConfig, JwtUtil 등)가 있어도 충돌하지 않게 한다.
 */
public class FqnBeanNameGenerator extends AnnotationBeanNameGenerator {
    @Override
    protected String buildDefaultBeanName(BeanDefinition definition) {
        return definition.getBeanClassName();
    }
}

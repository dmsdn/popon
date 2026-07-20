package popupteam.popupbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling   // === 추가 ===
public class PopupbackendApplication {
	public static void main(String[] args) {
		SpringApplication.run(PopupbackendApplication.class, args);
	}
}
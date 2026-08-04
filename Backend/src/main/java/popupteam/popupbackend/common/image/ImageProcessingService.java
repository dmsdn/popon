package popupteam.popupbackend.common.image;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.List;

@Slf4j
@Service
public class ImageProcessingService {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final List<String> ALLOWED_CONTENT_TYPES = List.of(
            "image/jpeg", "image/png", "image/gif", "image/bmp"
    );

    public byte[] resizeToJpeg(MultipartFile file, int targetWidth, int targetHeight, float quality) {
        validate(file);

        try {
            BufferedImage original = ImageIO.read(file.getInputStream());
            if (original == null) {
                throw new IllegalArgumentException("올바른 이미지 파일이 아닙니다.");
            }

            BufferedImage resized = coverFitResize(original, targetWidth, targetHeight);
            return toJpegBytes(resized, quality);

        } catch (IOException e) {
            throw new IllegalArgumentException("이미지 처리 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("업로드할 이미지가 없습니다.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("이미지는 10MB 이하만 업로드 가능합니다.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("JPG, PNG, GIF, BMP 형식의 이미지만 업로드 가능합니다.");
        }
    }

    /**
     * 아이콘용 처리 (8/4 신설). 카테고리 아이콘처럼 <b>투명 배경을 살려야 하는</b> 이미지를 다룬다.
     *
     * <p>기존 resizeToJpeg는 두 가지 이유로 아이콘에 못 쓴다.
     * <ul>
     *   <li>JPEG은 알파 채널이 없다 — 투명 배경이 흰색으로 채워진다.
     *       소비자 앱은 다크모드가 기본이라 카테고리 자리마다 흰 네모가 생긴다.</li>
     *   <li>coverFitResize가 TYPE_INT_RGB로 그린다 — 원본이 PNG여도 그 단계에서 투명도가 날아간다.</li>
     * </ul>
     *
     * <p>그래서 이 메서드는 <b>PNG로 저장하고, 비율을 유지한 채 여백을 투명으로 남긴다</b>(contain).
     * 아이콘은 잘라내면(cover) 모양이 깨지므로 꽉 채우지 않는다.
     *
     * <p>SVG는 여기로 오지 않는다 — ImageIO가 못 읽으므로 호출부에서 원본 그대로 저장한다.
     *
     * @return PNG 바이트
     */
    public byte[] resizeToPng(MultipartFile file, int targetWidth, int targetHeight) {
        validate(file);
        try {
            BufferedImage original = ImageIO.read(file.getInputStream());
            if (original == null) {
                throw new IllegalArgumentException("올바른 이미지 파일이 아닙니다.");
            }
            return toPngBytes(containFitResize(original, targetWidth, targetHeight));
        } catch (IOException e) {
            throw new RuntimeException("이미지 처리 실패: " + e.getMessage(), e);
        }
    }

    /** 비율 유지 축소 + 가운데 정렬. 남는 여백은 투명 (아이콘용) */
    private BufferedImage containFitResize(BufferedImage src, int targetWidth, int targetHeight) {
        double scale = Math.min((double) targetWidth / src.getWidth(), (double) targetHeight / src.getHeight());
        int w = Math.max(1, (int) Math.round(src.getWidth() * scale));
        int h = Math.max(1, (int) Math.round(src.getHeight() * scale));

        BufferedImage result = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = result.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.drawImage(src.getScaledInstance(w, h, Image.SCALE_SMOOTH),
                (targetWidth - w) / 2, (targetHeight - h) / 2, null);
        g.dispose();
        return result;
    }

    private byte[] toPngBytes(BufferedImage image) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "png", baos); // PNG는 품질 파라미터가 없다(무손실)
        return baos.toByteArray();
    }

    private BufferedImage coverFitResize(BufferedImage src, int targetWidth, int targetHeight) {
        double srcRatio = (double) src.getWidth() / src.getHeight();
        double targetRatio = (double) targetWidth / targetHeight;

        int scaledWidth, scaledHeight;
        if (srcRatio > targetRatio) {
            scaledHeight = targetHeight;
            scaledWidth = (int) Math.round(targetHeight * srcRatio);
        } else {
            scaledWidth = targetWidth;
            scaledHeight = (int) Math.round(targetWidth / srcRatio);
        }

        Image scaledImg = src.getScaledInstance(scaledWidth, scaledHeight, Image.SCALE_SMOOTH);
        BufferedImage scaledBuffered = new BufferedImage(scaledWidth, scaledHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g1 = scaledBuffered.createGraphics();
        g1.drawImage(scaledImg, 0, 0, null);
        g1.dispose();

        int x = (scaledWidth - targetWidth) / 2;
        int y = (scaledHeight - targetHeight) / 2;

        BufferedImage result = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2 = result.createGraphics();
        g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2.drawImage(scaledBuffered, -x, -y, null);
        g2.dispose();

        return result;
    }

    private byte[] toJpegBytes(BufferedImage image, float quality) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        ImageWriter writer = writers.next();
        ImageWriteParam param = writer.getDefaultWriteParam();
        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        param.setCompressionQuality(quality);

        try (ImageOutputStream ios = ImageIO.createImageOutputStream(baos)) {
            writer.setOutput(ios);
            writer.write(null, new IIOImage(image, null, null), param);
        }
        writer.dispose();

        return baos.toByteArray();
    }
}
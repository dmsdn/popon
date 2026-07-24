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
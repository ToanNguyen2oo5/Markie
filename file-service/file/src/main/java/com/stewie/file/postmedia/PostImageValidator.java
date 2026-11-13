package com.stewie.file.postmedia;

import com.stewie.file.exception.AppException;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.zip.CRC32;

import static com.stewie.file.exception.ErrorCode.*;

/** I03 validator mirrored locally to avoid a service dependency. Keep parser and contract tests in sync. */
@Component
public class PostImageValidator {
    public static final int MAX_BYTES = 5_242_880;
    public static final int MAX_DIMENSION = 6_000;
    public static final long MAX_PIXELS = 16_000_000L;
    private static final byte[] PNG_SIGNATURE = {(byte) 137, 80, 78, 71, 13, 10, 26, 10};

    /** Pass the entire list, never request.getFile("image"). See PostImageMultipart for raw parts. */
    public ValidatedImage validate(List<MultipartFile> images) {
        if (images != null && images.size() > 1) throw new AppException(POST_IMAGE_COUNT_EXCEEDED);
        if (images == null || images.isEmpty() || images.getFirst() == null) {
            throw new AppException(POST_IMAGE_REQUIRED);
        }
        MultipartFile file = images.getFirst();
        if (file.getSize() > MAX_BYTES) throw new AppException(POST_IMAGE_TOO_LARGE);
        if (file.isEmpty()) throw new AppException(POST_IMAGE_REQUIRED);
        try (var input = file.getInputStream()) {
            // Bounded even if a MultipartFile implementation misreports its length.
            byte[] bytes = input.readNBytes(MAX_BYTES + 1);
            if (bytes.length > MAX_BYTES) throw new AppException(POST_IMAGE_TOO_LARGE);
            if (bytes.length == 0) throw new AppException(POST_IMAGE_REQUIRED);
            if (bytes.length != file.getSize()) throw new AppException(POST_IMAGE_INVALID);
            return inspect(bytes);
        } catch (IOException e) {
            throw new AppException(POST_IMAGE_INVALID);
        }
    }

    private ValidatedImage inspect(byte[] bytes) {
        String format;
        if (bytes.length >= 8 && Arrays.equals(PNG_SIGNATURE, Arrays.copyOf(bytes, 8))) {
            format = "png";
            checkPng(bytes);
        } else if (bytes.length >= 4 && (bytes[0] & 255) == 255 && (bytes[1] & 255) == 216
                && (bytes[2] & 255) == 255) {
            format = "jpeg";
            checkJpeg(bytes);
        } else {
            throw new AppException(POST_IMAGE_INVALID);
        }
        try (var stream = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            ImageReader reader = createReader(stream);
            try {
                reader.setInput(stream, false, false);
                AtomicBoolean warning = new AtomicBoolean();
                reader.addIIOReadWarningListener((source, message) -> warning.set(true));
                if (!reader.getFormatName().equalsIgnoreCase(format)) throw new AppException(POST_IMAGE_INVALID);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                checkDimensions(width, height);
                if (reader.getNumImages(true) != 1) throw new AppException(POST_IMAGE_INVALID);
                var decoded = reader.read(0);
                if (decoded == null || decoded.getWidth() != width || decoded.getHeight() != height || warning.get()) {
                    throw new AppException(POST_IMAGE_INVALID);
                }
                decoded.flush();
                return new ValidatedImage(bytes, "image/" + format, width, height);
            } finally {
                reader.dispose();
            }
        } catch (IOException | IllegalArgumentException | IndexOutOfBoundsException e) {
            throw new AppException(POST_IMAGE_INVALID);
        }
    }

    // Package seam permits metadata/decode ordering tests without allocating large rasters.
    ImageReader createReader(ImageInputStream stream) {
        var readers = ImageIO.getImageReaders(stream);
        if (!readers.hasNext()) throw new AppException(POST_IMAGE_INVALID);
        return readers.next();
    }

    static void checkDimensions(int width, int height) {
        if (width <= 0 || height <= 0) throw new AppException(POST_IMAGE_INVALID);
        if (width > MAX_DIMENSION || height > MAX_DIMENSION || (long) width * height > MAX_PIXELS) {
            throw new AppException(POST_IMAGE_DIMENSIONS_EXCEEDED);
        }
    }

    private static void checkPng(byte[] bytes) {
        int offset = 8;
        boolean header = false, palette = false, data = false, dataEnded = false;
        while (offset <= bytes.length - 12) {
            long length = Integer.toUnsignedLong(ByteBuffer.wrap(bytes, offset, 4).getInt());
            if (length > bytes.length - offset - 12L) throw new AppException(POST_IMAGE_INVALID);
            int size = (int) length;
            for (int i = offset + 4; i < offset + 8; i++) {
                int value = bytes[i] & 255;
                if (!(value >= 'A' && value <= 'Z') && !(value >= 'a' && value <= 'z')) {
                    throw new AppException(POST_IMAGE_INVALID);
                }
            }
            if ((bytes[offset + 6] & 32) != 0) throw new AppException(POST_IMAGE_INVALID);
            String type = new String(bytes, offset + 4, 4, StandardCharsets.US_ASCII);
            CRC32 crc = new CRC32();
            crc.update(bytes, offset + 4, size + 4);
            long expected = Integer.toUnsignedLong(ByteBuffer.wrap(bytes, offset + 8 + size, 4).getInt());
            if (crc.getValue() != expected || (!header && !type.equals("IHDR"))) {
                throw new AppException(POST_IMAGE_INVALID);
            }
            if (type.equals("acTL") || type.equals("fcTL") || type.equals("fdAT")) {
                throw new AppException(POST_IMAGE_INVALID);
            }
            if (type.equals("IHDR")) {
                if (header || size != 13) throw new AppException(POST_IMAGE_INVALID);
                header = true;
            } else if (type.equals("PLTE")) {
                if (palette || data || size == 0 || size > 768 || size % 3 != 0) {
                    throw new AppException(POST_IMAGE_INVALID);
                }
                palette = true;
            } else if (type.equals("IDAT")) {
                if (dataEnded) throw new AppException(POST_IMAGE_INVALID);
                data = true;
            } else if (data) {
                dataEnded = true;
            }
            // Unknown critical chunks cannot safely be ignored by a decoder.
            if (!type.equals("IHDR") && !type.equals("PLTE") && !type.equals("IDAT") && !type.equals("IEND")
                    && (bytes[offset + 4] & 32) == 0) throw new AppException(POST_IMAGE_INVALID);
            offset += size + 12;
            if (type.equals("IEND")) {
                if (size != 0 || !data || offset != bytes.length) throw new AppException(POST_IMAGE_INVALID);
                return;
            }
        }
        throw new AppException(POST_IMAGE_INVALID);
    }

    /** Walk marker boundaries, including entropy stuffing/restarts, to reject truncation and appended frames. */
    private static void checkJpeg(byte[] bytes) {
        int offset = 2;
        boolean scan = false, sawScan = false;
        while (offset < bytes.length) {
            if (scan && (bytes[offset] & 255) != 255) { offset++; continue; }
            if ((bytes[offset++] & 255) != 255) throw new AppException(POST_IMAGE_INVALID);
            while (offset < bytes.length && (bytes[offset] & 255) == 255) offset++;
            if (offset == bytes.length) break;
            int marker = bytes[offset++] & 255;
            if (scan && (marker == 0 || (marker >= 208 && marker <= 215))) continue;
            scan = false;
            if (marker == 217) {
                if (sawScan && offset == bytes.length) return;
                throw new AppException(POST_IMAGE_INVALID);
            }
            if (marker == 0 || marker == 216 || marker == 1 || (marker >= 208 && marker <= 215)
                    || offset > bytes.length - 2) throw new AppException(POST_IMAGE_INVALID);
            int length = ((bytes[offset] & 255) << 8) | (bytes[offset + 1] & 255);
            if (length < 2 || length > bytes.length - offset) throw new AppException(POST_IMAGE_INVALID);
            offset += length;
            if (marker == 218) { scan = true; sawScan = true; }
        }
        throw new AppException(POST_IMAGE_INVALID);
    }

    /** Only the enclosing validator can construct this value. Bytes are never included in toString. */
    public static final class ValidatedImage {
        private final byte[] bytes;
        private final String contentType;
        private final int width;
        private final int height;

        private ValidatedImage(byte[] bytes, String contentType, int width, int height) {
            this.bytes = bytes.clone();
            this.contentType = contentType;
            this.width = width;
            this.height = height;
        }

        public byte[] bytes() { return bytes.clone(); }
        public String contentType() { return contentType; }
        public long size() { return bytes.length; }
        public int width() { return width; }
        public int height() { return height; }

        @Override
        public String toString() {
            return "ValidatedImage[contentType=" + contentType + ", size=" + size()
                    + ", width=" + width + ", height=" + height + "]";
        }
    }
}

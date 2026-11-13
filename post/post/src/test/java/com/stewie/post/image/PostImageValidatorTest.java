package com.stewie.post.image;

import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageReader;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;

import static com.stewie.post.exception.ErrorCode.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class PostImageValidatorTest {
    private final PostImageValidator validator = new PostImageValidator();

    private static MockMultipartFile file(byte[] bytes) {
        return new MockMultipartFile("image", "untrusted.svg", "text/html", bytes);
    }

    private void rejects(byte[] bytes, ErrorCode code) {
        assertThatThrownBy(() -> validator.validate(List.of(file(bytes))))
                .isInstanceOfSatisfying(AppException.class, e -> assertThat(e.getErrorCode()).isEqualTo(code));
    }

    @Test
    void acceptsProgressiveJpeg() throws Exception {
        assertThat(validator.validate(List.of(file(ImageFixtures.progressiveJpeg()))).contentType()).isEqualTo("image/jpeg");
    }

    @Test
    void rejectsValidPngStructureAndCrcWhenPixelsCannotDecode() throws Exception {
        rejects(ImageFixtures.brokenPngData(), POST_IMAGE_INVALID);
    }

    @Test
    void rejectsJpegWithMissingEntropyDespiteIntactHeaderAndEndMarker() throws Exception {
        byte[] jpeg = ImageFixtures.image("jpeg");
        for (int offset = 2; offset < jpeg.length - 4; offset++) {
            if ((jpeg[offset] & 255) == 255 && (jpeg[offset + 1] & 255) == 218) {
                int length = ((jpeg[offset + 2] & 255) << 8) | (jpeg[offset + 3] & 255);
                byte[] broken = Arrays.copyOf(jpeg, offset + 2 + length + 2);
                broken[broken.length - 2] = (byte) 255;
                broken[broken.length - 1] = (byte) 217;
                rejects(broken, POST_IMAGE_INVALID);
                return;
            }
        }
        fail("Synthetic JPEG must have SOS");
    }

    @Test
    void rejectsMultiframeReaderBeforeDecode() throws Exception {
        ImageReader reader = mock(ImageReader.class);
        when(reader.getFormatName()).thenReturn("png");
        when(reader.getWidth(0)).thenReturn(3);
        when(reader.getHeight(0)).thenReturn(2);
        when(reader.getNumImages(true)).thenReturn(2);
        PostImageValidator validator = new PostImageValidator() {
            @Override ImageReader createReader(javax.imageio.stream.ImageInputStream stream) { return reader; }
        };
        assertThatThrownBy(() -> validator.validate(List.of(file(ImageFixtures.image("png")))))
                .isInstanceOfSatisfying(AppException.class, e -> assertThat(e.getErrorCode()).isEqualTo(POST_IMAGE_INVALID));
        verify(reader, never()).read(anyInt());
        verify(reader).dispose();
    }

    @ParameterizedTest
    @ValueSource(strings = {"png", "jpeg"})
    void acceptsRealFormatDespiteIncorrectClientMetadataAndProtectsBytes(String format) throws Exception {
        byte[] original = ImageFixtures.image(format);
        byte[] expected = original.clone();
        var image = validator.validate(List.of(file(original)));
        Arrays.fill(original, (byte) 0);
        byte[] returned = image.bytes();
        Arrays.fill(returned, (byte) 0);
        assertThat(image.bytes()).isEqualTo(expected);
        assertThat(image.contentType()).isEqualTo("image/" + format);
        assertThat(image.size()).isEqualTo(expected.length);
        assertThat(image.width()).isEqualTo(3);
        assertThat(image.height()).isEqualTo(2);
        assertThat(image.toString()).isEqualTo("ValidatedImage[contentType=image/" + format
                + ", size=" + expected.length + ", width=3, height=2]");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "application/octet-stream", "image/png"})
    void acceptsMissingGenericOrMismatchedMime(String mime) throws Exception {
        var image = validator.validate(List.of(new MockMultipartFile("image", "", mime, ImageFixtures.image("jpeg"))));
        assertThat(image.contentType()).isEqualTo("image/jpeg");
    }

    @Test
    void missingAndEmptyAreRequired() {
        for (List<MultipartFile> input : Arrays.<List<MultipartFile>>asList(null, List.of(), List.of(file(new byte[0])))) {
            assertThatThrownBy(() -> validator.validate(input)).isInstanceOfSatisfying(AppException.class,
                    e -> assertThat(e.getErrorCode()).isEqualTo(POST_IMAGE_REQUIRED));
        }
    }

    @Test
    void rejectsMultipleBeforeOpeningAnyFile() {
        MultipartFile first = mock(MultipartFile.class), second = mock(MultipartFile.class);
        assertThatThrownBy(() -> validator.validate(List.of(first, second))).isInstanceOfSatisfying(AppException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(POST_IMAGE_COUNT_EXCEEDED));
        verifyNoInteractions(first, second);
    }

    @Test
    void sizeLimitPrecedesOpeningStream() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getSize()).thenReturn(5_242_881L);
        assertThatThrownBy(() -> validator.validate(List.of(file))).isInstanceOfSatisfying(AppException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(POST_IMAGE_TOO_LARGE));
        verify(file).getSize();
        verifyNoMoreInteractions(file);
    }

    @Test
    void boundsReadEvenIfReportedSizeIsFalse() throws Exception {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getSize()).thenReturn(1L);
        when(file.getInputStream()).thenReturn(new ByteArrayInputStream(new byte[5_242_881]));
        assertThatThrownBy(() -> validator.validate(List.of(file))).isInstanceOfSatisfying(AppException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(POST_IMAGE_TOO_LARGE));
    }

    @Test
    void exactByteLimitUsesValidSmallPngWithAncillaryPadding() throws Exception {
        byte[] bytes = ImageFixtures.paddedPng(5_242_880);
        assertThat(validator.validate(List.of(file(bytes))).bytes()).isEqualTo(bytes);
        rejects(ImageFixtures.paddedPng(5_242_881), POST_IMAGE_TOO_LARGE);
    }

    @ParameterizedTest
    @ValueSource(strings = {"png", "jpeg"})
    void rejectsTruncatedAppendedAndCorruptedImages(String format) throws Exception {
        byte[] bytes = ImageFixtures.image(format);
        rejects(Arrays.copyOf(bytes, bytes.length - 12), POST_IMAGE_INVALID);
        rejects(Arrays.copyOf(bytes, bytes.length + 1), POST_IMAGE_INVALID);
        byte[] broken = bytes.clone();
        Arrays.fill(broken, 20, Math.min(55, broken.length), (byte) 255);
        rejects(broken, POST_IMAGE_INVALID);
    }

    @ParameterizedTest
    @ValueSource(strings = {"<html>not an image</html>", "GIF89a", "RIFF0000WEBP", "<svg/>", "random"})
    void rejectsUnsupportedAndFakePng(String value) {
        rejects(value.getBytes(java.nio.charset.StandardCharsets.UTF_8), POST_IMAGE_INVALID);
    }

    @ParameterizedTest
    @ValueSource(strings = {"acTL", "fcTL", "fdAT"})
    void rejectsAnimationChunksEvenWhenFirstFrameIsValid(String type) throws Exception {
        rejects(ImageFixtures.insert(ImageFixtures.image("png"), ImageFixtures.chunk(type, new byte[8])), POST_IMAGE_INVALID);
    }

    @Test
    void rejectsPngBadCrcAndJpegConcatenatedFrames() throws Exception {
        byte[] png = ImageFixtures.image("png");
        png[png.length - 1] ^= 1;
        rejects(png, POST_IMAGE_INVALID);
        byte[] jpeg = ImageFixtures.image("jpeg");
        byte[] joined = Arrays.copyOf(jpeg, jpeg.length * 2);
        System.arraycopy(jpeg, 0, joined, jpeg.length, jpeg.length);
        rejects(joined, POST_IMAGE_INVALID);
    }

    @ParameterizedTest
    @CsvSource({"6000,1", "1,6000", "4000,4000"})
    void acceptsDimensionBoundariesWithReaderDouble(int width, int height) throws Exception {
        ImageReader reader = mock(ImageReader.class);
        when(reader.getFormatName()).thenReturn("png");
        when(reader.getWidth(0)).thenReturn(width);
        when(reader.getHeight(0)).thenReturn(height);
        when(reader.getNumImages(true)).thenReturn(1);
        BufferedImage raster = mock(BufferedImage.class);
        when(raster.getWidth()).thenReturn(width);
        when(raster.getHeight()).thenReturn(height);
        when(reader.read(0)).thenReturn(raster);
        PostImageValidator validator = new PostImageValidator() {
            @Override ImageReader createReader(javax.imageio.stream.ImageInputStream stream) { return reader; }
        };
        assertThat(validator.validate(List.of(file(ImageFixtures.image("png")))).width()).isEqualTo(width);
        var order = inOrder(reader);
        order.verify(reader).getWidth(0);
        order.verify(reader).getHeight(0);
        order.verify(reader).read(0);
        verify(reader).dispose();
    }

    @ParameterizedTest
    @CsvSource({"6001,1", "1,6001", "4001,4000", "2147483647,2147483647"})
    void realHeaderRejectsHugeDimensionsBeforeDecode(int width, int height) throws Exception {
        PostImageValidator validator = spy(new PostImageValidator());
        ImageReader reader = mock(ImageReader.class);
        when(reader.getFormatName()).thenReturn("png");
        when(reader.getWidth(0)).thenReturn(width);
        when(reader.getHeight(0)).thenReturn(height);
        doReturn(reader).when(validator).createReader(any());
        byte[] header = ImageFixtures.dimensions(width, height);
        rejects(header, POST_IMAGE_DIMENSIONS_EXCEEDED); // real ImageIO metadata
        assertThatThrownBy(() -> validator.validate(List.of(file(header)))).isInstanceOfSatisfying(AppException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(POST_IMAGE_DIMENSIONS_EXCEEDED));
        verify(reader, never()).read(anyInt());
        verify(reader).dispose();
    }

    @ParameterizedTest
    @CsvSource({"0,1", "1,0", "-1,1", "1,-1"})
    void rejectsInvalidDimensions(int width, int height) {
        assertThatThrownBy(() -> PostImageValidator.checkDimensions(width, height)).isInstanceOfSatisfying(AppException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(POST_IMAGE_INVALID));
    }

    @Test
    void rejectsStreamFailureWithSafeError() throws Exception {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getSize()).thenReturn(1L);
        when(file.getInputStream()).thenThrow(new IOException("private path and bytes"));
        assertThatThrownBy(() -> validator.validate(List.of(file))).isInstanceOfSatisfying(AppException.class, e -> {
            assertThat(e.getErrorCode()).isEqualTo(POST_IMAGE_INVALID);
            assertThat(e.getCause()).isNull();
        });
    }
}

package com.stewie.post.image;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.zip.CRC32;

final class ImageFixtures {
    static byte[] image(String format) throws Exception {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(3, 2, BufferedImage.TYPE_INT_RGB), format, output);
        return output.toByteArray();
    }

    static byte[] progressiveJpeg() throws Exception {
        var output = new ByteArrayOutputStream();
        var writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (var stream = ImageIO.createImageOutputStream(output)) {
            writer.setOutput(stream);
            var parameters = writer.getDefaultWriteParam();
            parameters.setProgressiveMode(javax.imageio.ImageWriteParam.MODE_DEFAULT);
            writer.write(null, new javax.imageio.IIOImage(new BufferedImage(3, 2, BufferedImage.TYPE_INT_RGB), null, null), parameters);
        } finally {
            writer.dispose();
        }
        return output.toByteArray();
    }

    static byte[] brokenPngData() throws Exception {
        byte[] png = image("png");
        var output = new ByteArrayOutputStream();
        output.write(png, 0, 8);
        for (int offset = 8; offset < png.length;) {
            int length = java.nio.ByteBuffer.wrap(png, offset, 4).getInt();
            String type = new String(png, offset + 4, 4, StandardCharsets.US_ASCII);
            if (type.equals("IDAT")) output.write(chunk(type, new byte[]{0}));
            else output.write(png, offset, length + 12);
            offset += length + 12;
        }
        return output.toByteArray();
    }

    static byte[] chunk(String type, byte[] data) throws Exception {
        var output = new ByteArrayOutputStream();
        var stream = new DataOutputStream(output);
        stream.writeInt(data.length);
        byte[] name = type.getBytes(StandardCharsets.US_ASCII);
        stream.write(name);
        stream.write(data);
        CRC32 crc = new CRC32();
        crc.update(name);
        crc.update(data);
        stream.writeInt((int) crc.getValue());
        return output.toByteArray();
    }

    static byte[] insert(byte[] png, byte[] chunk) throws Exception {
        var output = new ByteArrayOutputStream();
        output.write(png, 0, 33); // immediately after IHDR
        output.write(chunk);
        output.write(png, 33, png.length - 33);
        return output.toByteArray();
    }

    static byte[] paddedPng(int length) throws Exception {
        byte[] png = image("png");
        return insert(png, chunk("npAD", new byte[length - png.length - 12]));
    }

    static byte[] dimensions(int width, int height) throws Exception {
        byte[] png = image("png");
        byte[] header = Arrays.copyOfRange(png, 16, 29);
        java.nio.ByteBuffer.wrap(header).putInt(width).putInt(height);
        byte[] chunk = chunk("IHDR", header);
        System.arraycopy(chunk, 0, png, 8, chunk.length);
        return png;
    }
}

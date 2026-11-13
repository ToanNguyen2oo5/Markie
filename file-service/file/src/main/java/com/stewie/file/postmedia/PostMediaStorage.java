package com.stewie.file.postmedia;

import org.springframework.stereotype.Component;
import java.io.IOException;
import java.nio.channels.Channels;
import java.nio.file.*;
import java.util.UUID;

/** Flat, server-named namespace. No metadata or caller supplied filesystem paths. */
@Component
public class PostMediaStorage {
    private final Path root;
    public PostMediaStorage(PostMediaSettings settings) { this.root = settings.root; }

    public static boolean validId(String id) {
        return id != null && id.matches("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}");
    }

    private Path path(String id) throws IOException {
        if (!validId(id)) throw new IOException("Invalid media ID");
        Files.createDirectories(root);
        // Resolve existing roots to prevent aliases into the generic namespace.
        if (!root.toRealPath().equals(root)) throw new IOException("Aliased media root");
        Path result = root.resolve(id).normalize();
        if (!result.getParent().equals(root) || Files.isSymbolicLink(result)) throw new IOException("Invalid media path");
        return result;
    }

    public String create(byte[] bytes) throws IOException {
        String id = nextId();
        Path target = path(id);
        // CREATE_NEW atomically rejects existing files; never clean up a collision.
        var channel = Files.newByteChannel(target, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE, LinkOption.NOFOLLOW_LINKS);
        try (var output = Channels.newOutputStream(channel)) {
            output.write(bytes);
        } catch (IOException e) {
            Files.deleteIfExists(target);
            throw e;
        }
        return id;
    }
    String nextId() { return UUID.randomUUID().toString(); }

    public byte[] read(String id) throws IOException {
        try (var channel = Files.newByteChannel(path(id), StandardOpenOption.READ, LinkOption.NOFOLLOW_LINKS);
             var input = Channels.newInputStream(channel)) {
            byte[] bytes = input.readNBytes(PostImageValidator.MAX_BYTES + 1);
            if (bytes.length > PostImageValidator.MAX_BYTES) throw new IOException("Invalid stored size");
            return bytes;
        }
    }
    public void delete(String id) throws IOException { Files.deleteIfExists(path(id)); }
}

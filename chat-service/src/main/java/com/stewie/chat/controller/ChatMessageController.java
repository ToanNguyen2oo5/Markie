package com.stewie.chat.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import com.stewie.chat.dto.ApiResponse;
import com.stewie.chat.dto.request.ChatMessageRequest;
import com.stewie.chat.dto.response.ChatMessageResponse;
import com.stewie.chat.service.ChatMessageService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequiredArgsConstructor
@RequestMapping("/messages")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChatMessageController {
    ChatMessageService chatMessageService;

    @PostMapping("/create")
    public ApiResponse<ChatMessageResponse> create(@RequestBody @Valid ChatMessageRequest request) {
        return ApiResponse.<ChatMessageResponse>builder()
                .result(chatMessageService.create(request))
                .build();
    }

    @GetMapping
    public ApiResponse<List<ChatMessageResponse>> getMessages(@RequestParam("conversationId") String conversationId) {
        return ApiResponse.<List<ChatMessageResponse>>builder()
                .result(chatMessageService.getMessages(conversationId))
                .build();
    }
}

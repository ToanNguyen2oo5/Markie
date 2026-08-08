package com.stewie.file.mapper;


import com.stewie.file.dto.FileInfo;
import com.stewie.file.entity.FileMgmt;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface FileMgmtMapper {

    @Mapping(source = "name", target = "id")
    FileMgmt toFileMgmt(FileInfo fileInfo);
}

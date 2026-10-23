export interface PostFile {
  fileId: string;
  url: string;
  originalName: string;
  contentType: string;
  size: number;
}

export interface PostData {
  id: string;
  userId: string;
  username: string | null;
  content: string;
  status?: string;
  files?: PostFile[];
  createdDate: string;
  modifiedDate: string;
}

export interface CreatePostRequest {
  content?: string;
  fileIds?: string[];
  clientRequestId?: string;
}

export interface CreateStatusResponse {
  status: string;
  postId: string;
  result: PostData;
}

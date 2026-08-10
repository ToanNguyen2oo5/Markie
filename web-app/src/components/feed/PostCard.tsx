import { useState } from 'react';
import { DotsThree, GlobeHemisphereWest, ThumbsUp, ChatCircle, ShareFat } from '@phosphor-icons/react';
import type { PostData } from '../../pages/NewsFeedPage';
import { CommentModal } from './CommentModal';
import { useProfile } from '../../context/ProfileContext';

interface PostCardProps {
  post: PostData;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút`;
  if (diffHours < 24) return `${diffHours} giờ`;
  if (diffDays < 7) return `${diffDays} ngày`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getAvatarUrl(userId: string): string {
  // stable avatar based on userId hash
  const num = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 70 + 1;
  return `https://i.pravatar.cc/150?img=${num}`;
}

export function PostCard({ post }: PostCardProps) {
  const { profile, avatarUrl: myAvatarUrl } = useProfile();
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  
  const isMyPost = profile?.userId === post.userId;
  const postAvatarUrl = isMyPost ? myAvatarUrl : getAvatarUrl(post.userId);
  const displayName = post.username ?? 'Người dùng';
  const timeAgo = formatTime(post.createdDate);

  return (
    <div className="w-full bg-[#242526] rounded-xl shadow-sm border border-[#393A3B]/30 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-4">
        <div className="flex items-center gap-2.5">
          <img
            src={postAvatarUrl}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
          <div className="flex flex-col leading-tight">
            <h4 className="text-[#E4E6EB] font-semibold text-[15px] cursor-pointer hover:underline">
              {displayName}
            </h4>
            <div className="flex items-center gap-1 text-[#B0B3B8] text-[13px] mt-0.5">
              <span className="hover:underline cursor-pointer">{timeAgo}</span>
              <span>·</span>
              <GlobeHemisphereWest className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <button className="w-9 h-9 rounded-full hover:bg-[#3A3B3C] flex items-center justify-center text-[#B0B3B8] transition-colors cursor-pointer">
          <DotsThree className="w-6 h-6" weight="bold" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        <p className="text-[#E4E6EB] text-[15px] whitespace-pre-wrap leading-relaxed">
          {post.content}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-[#3E4042] mx-4" />

      {/* Action Buttons */}
      <div className="p-1 px-4 flex items-center justify-between gap-1">
        <ActionButton icon={<ThumbsUp className="w-5 h-5" />} text="Thích" />
        <ActionButton 
          icon={<ChatCircle className="w-5 h-5" />} 
          text="Bình luận" 
          onClick={() => setIsCommentModalOpen(true)}
        />
        <ActionButton icon={<ShareFat className="w-5 h-5" />} text="Chia sẻ" />
      </div>

      {/* Comment Modal */}
      {isCommentModalOpen && (
        <CommentModal 
          postId={post.id} 
          onClose={() => setIsCommentModalOpen(false)} 
        />
      )}
    </div>
  );
}

function ActionButton({ icon, text, onClick }: { icon: React.ReactNode; text: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-[#3A3B3C] rounded-lg transition-colors cursor-pointer text-[#B0B3B8] group hover:text-[#E4E6EB]"
    >
      {icon}
      <span className="font-medium text-[15px]">{text}</span>
    </button>
  );
}

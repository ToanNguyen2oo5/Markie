import React from 'react';
import { 
  Users,
  Image,
  Heart,
  ChatCircle,
  ShareNetwork,
  Sparkle,
  Globe
} from '@phosphor-icons/react';

export const BentoShowcase: React.FC = () => {
  return (
    <div className="flex flex-col justify-between space-y-8 py-4 lg:py-8 pr-0 lg:pr-6">
      
      {/* Asymmetric Header */}
      <div className="space-y-4 max-w-xl">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono">
          <Sparkle weight="fill" className="w-3.5 h-3.5 text-blue-400" />
          <span>Markie Social Network</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08]">
          Kết nối đam mê,<br />
          chia sẻ <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">khoảnh khắc</span>
        </h1>
        
        <p className="text-base text-zinc-400 leading-relaxed font-normal">
          Tham gia cộng đồng Markie ngay hôm nay để kết nối với những người bạn mới, 
          chia sẻ những câu chuyện thú vị và khám phá thế giới xung quanh bạn.
        </p>
      </div>

      {/* Bento Grid Architecture Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Bento 1 */}
        <div className="liquid-glass rounded-2xl p-5 relative overflow-hidden group border border-zinc-800/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Image weight="bold" className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Chia sẻ nội dung</h3>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <div className="w-full h-24 rounded bg-zinc-800/50 mb-2 animate-pulse"></div>
              <div className="flex space-x-3 text-zinc-500">
                <Heart className="w-4 h-4" />
                <ChatCircle className="w-4 h-4" />
                <ShareNetwork className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Bento 2 */}
        <div className="liquid-glass rounded-2xl p-5 relative overflow-hidden border border-zinc-800/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Users weight="bold" className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Cộng đồng sôi động</h3>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-2 rounded-lg bg-zinc-900/50">
              <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse"></div>
              <div className="flex-1 space-y-1">
                <div className="w-20 h-2 bg-zinc-700 rounded"></div>
                <div className="w-12 h-2 bg-zinc-800 rounded"></div>
              </div>
              <button className="px-3 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px] font-medium">Theo dõi</button>
            </div>
            <div className="flex items-center space-x-3 p-2 rounded-lg bg-zinc-900/50">
              <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse"></div>
              <div className="flex-1 space-y-1">
                <div className="w-24 h-2 bg-zinc-700 rounded"></div>
                <div className="w-16 h-2 bg-zinc-800 rounded"></div>
              </div>
              <button className="px-3 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px] font-medium">Theo dõi</button>
            </div>
          </div>
        </div>

      </div>

      {/* Feature Pills */}
      <div className="flex flex-wrap gap-2 pt-2">
        <div className="px-3 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 flex items-center space-x-2">
          <Globe weight="bold" className="w-3.5 h-3.5 text-zinc-400" />
          <span>Kết nối toàn cầu</span>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 flex items-center space-x-2">
          <Heart weight="bold" className="w-3.5 h-3.5 text-zinc-400" />
          <span>Tương tác tích cực</span>
        </div>
      </div>

    </div>
  );
};

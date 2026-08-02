import { Users, ClockCounterClockwise, BookmarkSimple, MonitorPlay, CalendarBlank, CaretDown, CirclesFour } from '@phosphor-icons/react';

export function SidebarLeft() {
  return (
    <div className="w-full flex flex-col pt-4">
      {/* User Profile Shortcut */}
      <SidebarItem 
        icon={<img src="https://i.pravatar.cc/150?img=11" alt="Profile" className="w-9 h-9 rounded-full object-cover" />}
        text="Nguyễn Toàn"
      />
      
      {/* Menu Items */}
      <SidebarItem icon={<CirclesFour className="w-7 h-7 text-[#0866FF]" weight="fill" />} text="Meta AI" />
      <SidebarItem icon={<Users className="w-7 h-7 text-[#00A4FF]" weight="fill" />} text="Bạn bè" />
      <SidebarItem icon={<CirclesFour className="w-7 h-7 text-[#0866FF]" weight="fill" />} text="Bảng điều khiển" />
      <SidebarItem icon={<Users className="w-7 h-7 text-[#0866FF]" weight="fill" />} text="Nhóm" />
      <SidebarItem icon={<ClockCounterClockwise className="w-7 h-7 text-[#00A4FF]" weight="fill" />} text="Kỷ niệm" />
      <SidebarItem icon={<BookmarkSimple className="w-7 h-7 text-[#E1439F]" weight="fill" />} text="Đã lưu" />
      <SidebarItem icon={<MonitorPlay className="w-7 h-7 text-[#0866FF]" weight="fill" />} text="Thước phim" />
      
      {/* See More */}
      <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-[#3A3B3C] transition-colors cursor-pointer text-[#E4E6EB] font-medium text-sm mt-1">
        <div className="w-9 h-9 rounded-full bg-[#3A3B3C] flex items-center justify-center">
          <CaretDown className="w-5 h-5 text-[#E4E6EB]" />
        </div>
        <span>Xem thêm</span>
      </button>

      {/* Divider */}
      <div className="border-b border-[#3E4042] my-4 mx-2"></div>

      {/* Shortcuts */}
      <div className="flex items-center justify-between px-2 mb-2">
        <h3 className="text-[17px] font-semibold text-[#B0B3B8]">Lối tắt của bạn</h3>
        <button className="text-sm text-[#0866FF] hover:bg-[#3A3B3C] px-2 py-1 rounded-md hidden group-hover:block transition-all">
          Chỉnh sửa
        </button>
      </div>

      <SidebarItem 
        icon={<img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=150&auto=format&fit=crop" className="w-9 h-9 rounded-lg object-cover" />}
        text="Bộ Tộc MixiGaming." 
      />
      <SidebarItem 
        icon={<img src="https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=150&auto=format&fit=crop" className="w-9 h-9 rounded-lg object-cover" />}
        text="VOZ.VN - Công nghệ & Kỹ thuật" 
      />
    </div>
  );
}

function SidebarItem({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-[#3A3B3C] transition-colors cursor-pointer group">
      <div className="flex-shrink-0">
        {icon}
      </div>
      <span className="text-[#E4E6EB] font-medium text-[15px] truncate text-left w-full">
        {text}
      </span>
    </button>
  );
}

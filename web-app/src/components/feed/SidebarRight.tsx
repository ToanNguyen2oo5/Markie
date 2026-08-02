import { MagnifyingGlass, DotsThree, Gift } from '@phosphor-icons/react';

export function SidebarRight() {
  return (
    <div className="w-full flex flex-col pt-4">
      {/* Sponsored */}
      <div>
        <h3 className="text-[17px] font-semibold text-[#B0B3B8] mb-2 px-2">Được tài trợ</h3>
        
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#3A3B3C] transition-colors cursor-pointer group">
          <img 
            src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=150&auto=format&fit=crop" 
            alt="Ad 1" 
            className="w-32 h-32 rounded-lg object-cover"
          />
          <div className="flex flex-col">
            <span className="text-[#E4E6EB] font-medium text-[15px]">Try Suno Today</span>
            <span className="text-[#B0B3B8] text-[13px]">suno.com</span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#3A3B3C] transition-colors cursor-pointer group mt-2">
          <img 
            src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=150&auto=format&fit=crop" 
            alt="Ad 2" 
            className="w-32 h-32 rounded-lg object-cover"
          />
          <div className="flex flex-col">
            <span className="text-[#E4E6EB] font-medium text-[15px]">Tai nghe chống ồn</span>
            <span className="text-[#B0B3B8] text-[13px]">lazada.vn</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b border-[#3E4042] my-4 mx-2"></div>

      {/* Birthdays */}
      <div>
        <h3 className="text-[17px] font-semibold text-[#B0B3B8] mb-2 px-2">Sinh nhật</h3>
        <button className="flex items-start gap-3 w-full p-2 rounded-lg hover:bg-[#3A3B3C] transition-colors cursor-pointer group">
          <Gift className="w-8 h-8 text-[#0866FF] flex-shrink-0" weight="fill" />
          <p className="text-[#E4E6EB] text-[15px] text-left leading-tight mt-1">
            <span className="font-semibold">Hôm nay là sinh nhật của </span>
            <span className="font-semibold text-[#0866FF]">Trần Trung Hiếu</span>
          </p>
        </button>
      </div>

      {/* Divider */}
      <div className="border-b border-[#3E4042] my-4 mx-2"></div>

      {/* Contacts */}
      <div>
        <div className="flex items-center justify-between px-2 mb-2">
          <h3 className="text-[17px] font-semibold text-[#B0B3B8]">Người liên hệ</h3>
          <div className="flex gap-2 text-[#B0B3B8]">
            <button className="p-1.5 rounded-full hover:bg-[#3A3B3C] transition-colors">
              <MagnifyingGlass className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-full hover:bg-[#3A3B3C] transition-colors">
              <DotsThree className="w-4 h-4" weight="bold" />
            </button>
          </div>
        </div>

        <ContactItem name="Lê Anh Tuấn" img="https://i.pravatar.cc/150?img=12" />
        <ContactItem name="Nguyễn Thị Mai" img="https://i.pravatar.cc/150?img=5" />
        <ContactItem name="Hoàng Minh" img="https://i.pravatar.cc/150?img=33" />
        <ContactItem name="Phạm Đức" img="https://i.pravatar.cc/150?img=51" />
        <ContactItem name="Vũ Hương Giang" img="https://i.pravatar.cc/150?img=47" />
        <ContactItem name="Bùi Văn Khánh" img="https://i.pravatar.cc/150?img=14" />
      </div>

    </div>
  );
}

function ContactItem({ name, img }: { name: string, img: string }) {
  return (
    <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-[#3A3B3C] transition-colors cursor-pointer group relative">
      <div className="relative">
        <img src={img} alt={name} className="w-9 h-9 rounded-full object-cover" />
        {/* Online Indicator */}
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#31A24C] border-2 border-[#18191A] rounded-full"></div>
      </div>
      <span className="text-[#E4E6EB] font-medium text-[15px] truncate text-left">
        {name}
      </span>
    </button>
  );
}

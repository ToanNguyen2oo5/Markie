import { MagnifyingGlass, House, Users, MonitorPlay, Storefront, UsersThree, List, MessengerLogo, Bell } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[#242526] border-b border-[#393A3B] z-50 flex items-center px-4 justify-between shadow-sm">
      
      {/* Left Section: Logo & Search */}
      <div className="flex items-center gap-2 w-[320px]">
        <Link to="/feed" className="flex items-center gap-2 group">
          <img
            src="/favicon.svg"
            alt="Markie logo"
            className="w-8 h-8 flex-shrink-0 group-hover:scale-110 transition-transform duration-200"
          />
          <span className="font-bold text-[17px] text-white tracking-tight hidden sm:block">
            Markie
          </span>
        </Link>
        <div className="relative hidden md:flex items-center">
          <MagnifyingGlass className="absolute left-3 text-[#A8AB81] w-5 h-5" />
          <input 
            type="text" 
            placeholder="Tìm kiếm trên Facebook" 
            className="bg-[#3A3B3C] text-[#E4E6EB] placeholder-[#A8AB81] h-10 w-[240px] rounded-full pl-10 pr-4 outline-none focus:w-[280px] transition-all duration-300"
          />
        </div>
      </div>

      {/* Center Section: Navigation Tabs */}
      <div className="hidden md:flex items-center justify-center h-full flex-1 max-w-[600px] gap-2">
        <NavTab icon={<House weight="fill" />} active />
        <NavTab icon={<Users />} />
        <NavTab icon={<MonitorPlay />} />
        <NavTab icon={<Storefront />} />
        <NavTab icon={<UsersThree />} />
      </div>

      {/* Right Section: Actions & Profile */}
      <div className="flex items-center justify-end gap-2 w-[320px]">
        <div className="hidden md:flex items-center gap-2">
           <IconButton icon={<List />} />
           <IconButton icon={<MessengerLogo weight="fill" />} />
           <IconButton icon={<Bell weight="fill" />} badge={3} />
        </div>
        <Link
          to="/profile"
          className="w-10 h-10 rounded-full overflow-hidden ml-2 hover:opacity-90 hover:ring-2 hover:ring-[#0866FF]/60 transition-all"
          title="Xem hồ sơ"
        >
          <img src="https://i.pravatar.cc/150?img=11" alt="Profile" className="w-full h-full object-cover" />
        </Link>
      </div>

    </header>
  );
}

function NavTab({ icon, active }: { icon: React.ReactNode, active?: boolean }) {
  return (
    <div className={`relative h-full w-[110px] flex items-center justify-center cursor-pointer group ${active ? 'text-[#0866FF]' : 'text-[#B0B3B8] hover:bg-[#3A3B3C] hover:rounded-lg my-1 transition-colors'}`}>
      <div className="w-7 h-7">
        {icon}
      </div>
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0866FF] rounded-t-md" />
      )}
    </div>
  );
}

function IconButton({ icon, badge }: { icon: React.ReactNode, badge?: number }) {
  return (
    <button className="w-10 h-10 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] flex items-center justify-center text-[#E4E6EB] transition-colors relative cursor-pointer">
      <div className="w-5 h-5">
        {icon}
      </div>
      {badge && (
        <span className="absolute -top-1 -right-1 bg-[#E41E3F] text-white text-[11px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

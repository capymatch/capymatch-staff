import { Search, Bell, LayoutDashboard, Users, Calendar, Megaphone, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Header({ selectedGradYear, setSelectedGradYear }) {
  const modes = [
    { id: "mission-control", label: "Mission Control", icon: LayoutDashboard, active: true },
    { id: "support-pods", label: "Support Pods", icon: Users, active: false },
    { id: "events", label: "Events", icon: Calendar, active: false },
    { id: "advocacy", label: "Advocacy", icon: Megaphone, active: false },
    { id: "program", label: "Program", icon: BarChart3, active: false },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm" data-testid="header">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo and Mode Navigation */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CM</span>
              </div>
              <span className="font-bold text-lg hidden sm:inline-block" style={{fontFamily: 'Manrope'}}>CapyMatch</span>
            </div>

            {/* Mode Navigation - Desktop */}
            <nav className="hidden lg:flex items-center space-x-1" data-testid="mode-navigation">
              {modes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    data-testid={`mode-${mode.id}`}
                    className={`
                      flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                      ${mode.active 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Search, Filters, Notifications, Profile */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search - Desktop */}
            <div className="hidden md:flex items-center relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3" />
              <input
                type="text"
                placeholder="Search athletes, schools..."
                data-testid="global-search"
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-64"
              />
            </div>

            {/* Grad Year Filter */}
            <Select value={selectedGradYear} onValueChange={setSelectedGradYear}>
              <SelectTrigger className="w-28 text-sm" data-testid="grad-year-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative" data-testid="notifications-button">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
            </Button>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-2 hover:opacity-80 transition-opacity" data-testid="user-profile-button">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="https://images.unsplash.com/photo-1724984430472-2b79b1c0dd13?w=100" />
                    <AvatarFallback>CM</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline-block">Coach Martinez</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;

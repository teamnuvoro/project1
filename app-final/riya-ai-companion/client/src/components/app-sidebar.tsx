import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  MessageSquare,
  PhoneCall,
  TrendingUp,
  BarChart3,
  Settings,
  Heart,
  Image,
  History,
  LogOut,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const mainItems = [
  { title: "Chat", url: "/chat", icon: MessageSquare, gradient: "from-pink-500 to-rose-500" },
  { title: "Voice Call", url: "/call", icon: PhoneCall, gradient: "from-purple-500 to-indigo-500" },
  { title: "Summary", url: "/summary", icon: TrendingUp, gradient: "from-violet-500 to-purple-500" },
  { title: "My Profile", url: "/tracker", icon: UserCircle, gradient: "from-blue-500 to-cyan-500" },
];

const secondaryItems = [
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Memories", url: "/memories", icon: Heart },
  { title: "Gallery", url: "/gallery", icon: Image },
  { title: "History", url: "/history", icon: History },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();

  const isActive = (url: string) => location === url;

  return (
    <Sidebar className="border-r-0 bg-gradient-to-b from-pink-50 via-purple-50/50 to-white dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-950">
      <SidebarContent className="px-2 py-4">
        {/* Brand Header */}
        <div className="px-3 mb-6">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 shadow-lg shadow-purple-300/40 dark:shadow-purple-900/40">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-bounce" style={{ animationDuration: '2s' }} />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg tracking-tight">Riya</h2>
              <p className="text-[10px] text-white/80 font-medium">Your AI Companion</p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-purple-600/70 dark:text-purple-400/70 uppercase tracking-wider px-3 mb-2">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems.map((item, index) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className={`group relative overflow-visible rounded-xl transition-all duration-300 ${
                      isActive(item.url) 
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg shadow-purple-300/30 dark:shadow-purple-900/30` 
                        : 'hover:bg-purple-100/60 dark:hover:bg-purple-900/30'
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Link href={item.url} className="flex items-center gap-3 px-3 py-2.5">
                      <div className={`relative transition-transform duration-300 group-hover:scale-110 ${isActive(item.url) ? 'scale-110' : ''}`}>
                        <item.icon className={`h-5 w-5 transition-all duration-300 ${
                          isActive(item.url) ? 'text-white' : 'text-purple-600 dark:text-purple-400'
                        }`} />
                        {isActive(item.url) && (
                          <div className="absolute inset-0 blur-lg opacity-60">
                            <item.icon className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>
                      <span className={`font-medium transition-all duration-300 ${
                        isActive(item.url) ? 'text-white translate-x-0.5' : 'text-gray-700 dark:text-gray-200 group-hover:translate-x-0.5'
                      }`}>
                        {item.title}
                      </span>
                      {isActive(item.url) && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-white/80 animate-pulse" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Divider */}
        <div className="my-4 mx-3">
          <div className="h-px bg-gradient-to-r from-transparent via-purple-200 dark:via-purple-800 to-transparent" />
        </div>

        {/* Secondary Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-purple-600/70 dark:text-purple-400/70 uppercase tracking-wider px-3 mb-2">
            More
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {secondaryItems.map((item, index) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className={`group rounded-xl transition-all duration-300 ${
                      isActive(item.url) 
                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' 
                        : 'hover:bg-purple-50/80 dark:hover:bg-purple-900/20'
                    }`}
                    style={{ animationDelay: `${(index + 3) * 80}ms` }}
                  >
                    <Link href={item.url} className="flex items-center gap-3 px-3 py-2">
                      <item.icon className={`h-4 w-4 transition-all duration-300 group-hover:scale-110 ${
                        isActive(item.url) 
                          ? 'text-purple-600 dark:text-purple-400' 
                          : 'text-gray-500 dark:text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400'
                      }`} />
                      <span className={`text-sm transition-all duration-300 ${
                        isActive(item.url) 
                          ? 'font-medium text-purple-700 dark:text-purple-300' 
                          : 'text-gray-600 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-0.5'
                      }`}>
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Button */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={logout}
                  className="group cursor-pointer rounded-xl mx-2 px-3 py-2.5 transition-all duration-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 text-red-400 group-hover:text-red-500 transition-all duration-300 group-hover:scale-110 group-hover:-translate-x-0.5" />
                  <span className="text-sm text-red-400 group-hover:text-red-500 transition-colors duration-300">Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

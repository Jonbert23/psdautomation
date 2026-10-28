import type { CSSProperties } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Bell, CircleHelp, Home, Play, Scissors, Settings } from "lucide-react";
import { AccountMenu } from "../components/AccountMenu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

const WORK = [
  { to: "/", label: "Home", icon: Home },
  { to: "/profiles", label: "Layouts", icon: Scissors },
  { to: "/orders", label: "Automation", icon: Play },
  { to: "/jobs", label: "Notification", icon: Bell },
  { to: "/support", label: "Support", icon: CircleHelp },
];

const ACCOUNT = [{ to: "/settings", label: "Settings", icon: Settings }];

function onPath(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NavItems({ items }: { items: typeof WORK }) {
  const { pathname } = useLocation();
  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => (
        <SidebarMenuItem key={item.to}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton asChild isActive={onPath(pathname, item.to)} className="mx-auto size-11 justify-center gap-0 rounded-lg p-0">
                <NavLink to={item.to} end={item.to === "/"} aria-label={item.label}>
                  <item.icon className="!size-[22px]" strokeWidth={1.75} />
                </NavLink>
              </SidebarMenuButton>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="border-0 bg-sidebar px-3 py-2 text-[15px] font-medium leading-none text-white shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
              {item.label}
            </TooltipContent>
          </Tooltip>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function AppShell() {
  const location = useLocation();

  return (
    <SidebarProvider className="h-svh overflow-hidden" style={{ "--sidebar-width": "76px" } as CSSProperties}>
      <Sidebar collapsible="none" className="h-full shadow-[8px_0_20px_rgba(0,0,0,0.06)]">
        <SidebarHeader className="px-3 pb-2 pt-5">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mx-auto flex size-11 cursor-default items-center justify-center rounded-lg">
                <div className="flex size-9 items-center justify-center rounded-lg bg-white text-base font-semibold leading-none text-black">S</div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="border-0 bg-sidebar px-3 py-2 text-[15px] font-medium leading-none text-white shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
              SHUZEE
            </TooltipContent>
          </Tooltip>
        </SidebarHeader>
        <SidebarContent className="justify-center">
          <SidebarGroup className="px-3 py-1">
            <SidebarGroupContent>
              <NavItems items={WORK} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="mt-auto px-3 pb-4 pt-2">
          <NavItems items={ACCOUNT} />
          <SidebarMenu className="gap-1">
            <AccountMenu active={onPath(location.pathname, "/profile")} />
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="main min-h-0 min-w-0">
        <div className="content">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

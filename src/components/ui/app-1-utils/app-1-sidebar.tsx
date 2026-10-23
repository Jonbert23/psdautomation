import { ArrowLeft, BarChart3, FolderKanban, LayoutDashboard, ListTodo, Users } from "lucide-react"
import { Link } from "react-router-dom"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/app-1-utils/sidebar"

import { app1User } from "@/components/ui/app-1-utils/app-1-data"

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Projects", icon: FolderKanban, active: false },
  { label: "Tasks", icon: ListTodo, active: false },
  { label: "Team", icon: Users, active: false },
  { label: "Reports", icon: BarChart3, active: false },
]

export function App1Sidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                A1
              </span>
              <span className="grid text-left leading-tight">
                <span className="truncate font-semibold">Studio</span>
                <span className="truncate text-xs text-muted-foreground">Workspace</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton isActive={item.active} tooltip={item.label}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Garment app">
              <Link to="/">
                <ArrowLeft />
                <span>Garment app</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <Avatar className="size-8">
                <AvatarImage
                  src={app1User.avatar}
                  alt={app1User.name}
                  className="object-[50%_15%]"
                />
                <AvatarFallback>{app1User.initials}</AvatarFallback>
              </Avatar>
              <span className="grid text-left leading-tight">
                <span className="truncate font-medium">{app1User.name}</span>
                <span className="truncate text-xs text-muted-foreground">Signed in</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

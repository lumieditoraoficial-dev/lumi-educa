import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { Bell, BookOpen, LayoutDashboard, Library, LogOut, MessageCircle, PanelLeft, Settings, UserRound, Users } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import BrandLogo from "./BrandLogo";
import { Button } from "./ui/button";

const dashboardByRole: Record<string, string> = {
  student: "/dashboard/student",
  educator: "/dashboard/educator",
  coordinator: "/dashboard/coordinator",
  editor: "/dashboard/editor",
  admin: "/dashboard/admin",
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Acesse com uma conta ou use a senha mestra para continuar.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = "/login";
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const heartbeatMutation = trpc.users.heartbeat.useMutation();
  const switchMasterRoleMutation = trpc.auth.switchMasterRole.useMutation();
  const utils = trpc.useUtils();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const lastHeartbeatRef = useRef(0);
  const isMobile = useIsMobile();
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: dashboardByRole[user?.role ?? "student"] ?? "/dashboard/student" },
    ...(user?.role === "student"
      ? [{ icon: BookOpen, label: "Meus livros", path: "/dashboard/student" }]
      : []),
    ...(["educator", "coordinator", "editor", "admin"].includes(user?.role ?? "")
      ? [{ icon: Users, label: "Produções", path: dashboardByRole[user?.role ?? "educator"] ?? "/dashboard/educator" }]
      : []),
    { icon: MessageCircle, label: "Conversas", path: "/messages" },
    { icon: Bell, label: "Notificações", path: "/notifications" },
    { icon: UserRound, label: "Meu perfil", path: "/profile" },
    { icon: Library, label: "Biblioteca", path: "/library" },
    ...(user?.role === "admin"
      ? [{ icon: Settings, label: "Administração", path: "/dashboard/admin" }]
      : []),
  ];
  const activeMenuItem = menuItems.find(item => item.path === location);
  const masterRoles = [
    { role: "student", label: "Aluno" },
    { role: "educator", label: "Educador" },
    { role: "coordinator", label: "Coordenador" },
    { role: "editor", label: "Editor" },
    { role: "admin", label: "Administrador" },
  ];

  const switchMasterRole = async (role: string) => {
    const result = await switchMasterRoleMutation.mutateAsync({ role: role as any });
    utils.auth.me.setData(undefined, result.user as any);
    await utils.auth.me.invalidate();
    setLocation(dashboardByRole[role] ?? "/dashboard/student");
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = (force = false) => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (!force && now - lastHeartbeatRef.current < 15_000) return;
      lastHeartbeatRef.current = now;
      heartbeatMutation.mutate(undefined, {
        onError: () => {
          lastHeartbeatRef.current = 0;
        },
      });
    };

    sendHeartbeat(true);

    const interval = window.setInterval(() => sendHeartbeat(), 20_000);
    const activityEvents = ["focus", "pointermove", "pointerdown", "keydown", "touchstart"];
    const handleActivity = () => {
      if (document.visibilityState === "hidden") return;
      sendHeartbeat();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") sendHeartbeat(true);
    };

    activityEvents.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user?.id]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 bg-[#0F3D2E] text-[#F7F3E9]"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-20 justify-center border-b border-white/10">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-white/10 bg-white/8 text-[#F7F3E9] transition-colors hover:bg-[#F4C430]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C430] shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              {!isCollapsed ? (
                <div className="flex min-w-0 items-center gap-2">
                  <BrandLogo compact markClassName="h-8 w-8" textClassName="text-lg" />
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 bg-[#0F3D2E]">
            {!isCollapsed ? (
              <div className="mx-3 mb-2 rounded-lg border border-[#F4C430]/25 bg-[#123C8C]/25 px-3 py-3 text-[#F7F3E9]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#F4C430]">Copa da Escrita</p>
                <p className="mt-1 text-sm leading-5 text-white/78">Cada página é um lance novo na jornada do aluno.</p>
              </div>
            ) : null}
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-11 rounded-lg font-medium text-[#F7F3E9]/82 transition-all hover:bg-white/10 hover:text-white ${
                        isActive ? "bg-[#F4C430] text-[#0F3D2E] shadow-sm hover:bg-[#F4C430] hover:text-[#0F3D2E]" : ""
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-[#0F3D2E]" : "text-[#F7F3E9]/76"}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-white/10 bg-[#0A2C23] p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 text-[#F7F3E9] transition-colors w-full text-left hover:bg-white/10 group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C430]">
                  <Avatar className="h-9 w-9 border border-[#F4C430]/35 shrink-0">
                    <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.name ?? "Usuario"} />
                    <AvatarFallback className="bg-[#F4C430] text-xs font-bold text-[#0F3D2E]">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-[#F7F3E9]/62 truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user?.id < 0
                  ? masterRoles.map((item) => (
                      <DropdownMenuItem
                        key={item.role}
                        onClick={() => switchMasterRole(item.role)}
                        className="cursor-pointer"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    ))
                  : null}
                <DropdownMenuItem
                  onClick={() => setLocation("/profile")}
                  className="cursor-pointer"
                >
                  <UserRound className="mr-2 h-4 w-4" />
                  <span>Meu perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="lumi-cup-dashboard">
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-white/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}

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
import { getSchoolLabel, normalizeSchoolId } from "@/lib/schools";
import { useSelectedSchoolFilter } from "@/lib/selectedSchool";
import { Bell, BookOpen, Building2, GraduationCap, LayoutDashboard, Library, LogOut, MessageCircle, PanelLeft, Repeat2, Server, Settings, ShieldCheck, Trophy, UserRound, Users } from "lucide-react";
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
  const { schoolFilter } = useSelectedSchoolFilter();
  const showSchoolSwitcher = Boolean(user && user.id < 0);
  const { data: schools = [] } = trpc.schools.listSchools.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const selectedSchoolId =
    user?.id && user.id < 0
      ? schoolFilter === "all"
        ? null
        : normalizeSchoolId(schoolFilter)
      : normalizeSchoolId(user?.schoolId);
  const selectedSchool = selectedSchoolId
    ? schools.find((school) => normalizeSchoolId(school.id) === selectedSchoolId)
    : undefined;
  const selectedSchoolName =
    selectedSchool?.name ??
    (selectedSchoolId ? getSchoolLabel(selectedSchoolId) : "Escolha uma escola");
  const selectedSchoolLocation =
    [selectedSchool?.city, selectedSchool?.state].filter(Boolean).join(" - ") ||
    selectedSchool?.address ||
    selectedSchool?.description ||
    "Projeto Lumi Educa";
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
    ...(user?.role === "admin"
      ? [{ icon: Server, label: "Status", path: "/status" }]
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
          className="border-r-0 bg-[#08261e] text-[#F7F3E9] shadow-[18px_0_50px_rgba(15,61,46,0.14)]"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-20 justify-center border-b border-white/10 bg-[#08261e]">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-white/12 bg-white/8 text-[#F7F3E9] transition-colors hover:bg-[#F4C430]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C430] shrink-0"
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

          <SidebarContent className="gap-0 bg-[linear-gradient(180deg,#08261e,#0F3D2E_58%,#0a2c23)]">
            {!isCollapsed ? (
              <div className="mx-3 mb-3 overflow-hidden rounded-lg border border-[#F4C430]/24 bg-white/[0.075] text-[#F7F3E9] shadow-[0_16px_34px_rgba(0,0,0,0.16)]">
                <div className="relative p-3">
                  <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full border-[16px] border-[#F4C430]/15" />
                  <div className="relative flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/18 bg-white/12">
                      {selectedSchool?.logoUrl ? (
                        <img src={selectedSchool.logoUrl} alt={selectedSchoolName} className="h-full w-full object-cover" />
                      ) : (
                        <ShieldCheck className="h-6 w-6 text-[#F4C430]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-[#F4C430]">Ambiente escolar</p>
                      <p className="mt-1 truncate text-sm font-bold text-white">{selectedSchoolName}</p>
                      <p className="truncate text-xs text-white/58">{selectedSchoolLocation}</p>
                    </div>
                  </div>
                </div>
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
                      className={`h-11 rounded-lg font-semibold text-[#F7F3E9]/82 transition-all hover:bg-white/10 hover:text-white ${
                        isActive ? "bg-[#F4C430] text-[#0F3D2E] shadow-[0_8px_18px_rgba(244,196,48,0.18)] hover:bg-[#F4C430] hover:text-[#0F3D2E]" : ""
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

          <SidebarFooter className="border-t border-white/10 bg-[#061d17] p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 text-[#F7F3E9] transition-colors w-full text-left hover:bg-white/10 group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C430]">
                  <Avatar className="h-9 w-9 shrink-0 border border-[#F4C430]/35">
                    <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.name ?? "Usuario"} className="object-cover" />
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
        {user ? (
          <div className="sticky top-0 z-30 border-b border-[#0F3D2E]/10 bg-white/90 px-4 py-3 shadow-[0_10px_30px_rgba(15,61,46,0.06)] backdrop-blur md:px-6">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3 text-sm text-slate-700">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#0F3D2E]/10 bg-[#0F3D2E] text-white shadow-sm">
                  {selectedSchool?.logoUrl ? (
                    <img src={selectedSchool.logoUrl} alt={selectedSchoolName} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Ambiente da escola</p>
                  <p className="truncate text-base font-bold text-slate-950">{selectedSchoolName}</p>
                  <p className="truncate text-xs text-slate-500">{selectedSchoolLocation}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#F4C430]/45 bg-[#fff8d7] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#0F3D2E]">
                  <Trophy className="h-3.5 w-3.5" />
                  Rotina ativa
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#0F3D2E]/10 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  <GraduationCap className="h-3.5 w-3.5 text-[#266B3D]" />
                  {user.role === "student" ? "Aluno" : user.role === "educator" ? "Educador" : user.role === "coordinator" ? "Coordenador" : user.role === "editor" ? "Editor" : "Administrador"}
                </span>
                {showSchoolSwitcher ? (
                  <Button variant="outline" className="gap-2" onClick={() => setLocation("/select-school")}>
                    <Repeat2 className="h-4 w-4" />
                    Trocar escola
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </SidebarInset>
    </>
  );
}

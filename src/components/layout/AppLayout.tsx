"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Logo } from "@/components/icons/Logo";
import {
  LayoutDashboard,
  Gavel,
  SearchCheck,
  FileText,
  FilePieChart,
  Settings,
  LogOut,
  BellRing,
  Users,
  Map,
  AlertTriangle,
  Workflow,
  List,
  ShieldCheck,
  ClipboardList,
  FileSpreadsheet,
  Grid,
  CheckSquare,
  BookX,
  Activity,
  GraduationCap,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUser } from "@/contexts/UserContext";
import { useTeam } from "@/contexts/TeamContext";
import { Skeleton } from "@/components/ui/skeleton";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useIdentifiedRegulations } from "@/contexts/IdentifiedRegulationsContext";
import { useActivityLog } from "@/contexts/ActivityLogContext";
import { MemoHeaderTrigger } from "@/components/memos/MemoHeaderTrigger";
import { MemoDrawer } from "@/components/memos/MemoDrawer";
import { MemoEditorModalWrapper } from "@/components/memos/MemoEditorModalWrapper";
import { FloatingPinnedMemoWidget } from "@/components/memos/FloatingPinnedMemoWidget";
import { DeviceApprovalModal } from "@/components/auth/DeviceApprovalModal";
import { DeviceApprovalHeaderTrigger } from "@/components/auth/DeviceApprovalHeaderTrigger";

interface NavItem {
  href: string;
  icon: any;
  label: string;
  title: string;
  iconColor: string;
  iconBg: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  subItems?: { href: string; icon: any; label: string }[];
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    title: "Dashboard",
    iconColor: "text-blue-500 dark:text-blue-400",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
    activeBg: "bg-blue-500/15 dark:bg-blue-500/25",
    activeBorder: "border-blue-500/40",
    activeText: "text-blue-700 dark:text-blue-300 font-bold",
  },
  {
    href: "/plan",
    icon: Gavel,
    label: "Plan d'Organisation",
    title: "Plan d'Organisation",
    iconColor: "text-emerald-500 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    activeBg: "bg-emerald-500/15 dark:bg-emerald-500/25",
    activeBorder: "border-emerald-500/40",
    activeText: "text-emerald-700 dark:text-emerald-300 font-bold",
    subItems: [
      { href: "/plan#processus-metiers", icon: Workflow, label: "Processus Métiers" }
    ]
  },
  {
    href: "/ecosystem",
    icon: Users,
    label: "Cartographie des Acteurs",
    title: "Cartographie des Acteurs",
    iconColor: "text-teal-500 dark:text-teal-400",
    iconBg: "bg-teal-500/10 dark:bg-teal-500/20",
    activeBg: "bg-teal-500/15 dark:bg-teal-500/25",
    activeBorder: "border-teal-500/40",
    activeText: "text-teal-700 dark:text-teal-300 font-bold",
  },
  {
    href: "/regulatory-watch",
    icon: SearchCheck,
    label: "Assistance Conformité IA",
    title: "Assistance Conformité IA",
    iconColor: "text-indigo-500 dark:text-indigo-400",
    iconBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    activeBg: "bg-indigo-500/15 dark:bg-indigo-500/25",
    activeBorder: "border-indigo-500/40",
    activeText: "text-indigo-700 dark:text-indigo-300 font-bold",
  },
  {
    href: "/risk-mapping",
    icon: Map,
    label: "Cartographie des Risques",
    title: "Cartographie des Risques",
    iconColor: "text-amber-500 dark:text-amber-400",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    activeBg: "bg-amber-500/15 dark:bg-amber-500/25",
    activeBorder: "border-amber-500/40",
    activeText: "text-amber-700 dark:text-amber-300 font-bold",
    subItems: [
      { href: "/risk-mapping?tab=table", icon: List, label: "Risques identifiés" },
      { href: "/risk-mapping?tab=dmr", icon: ShieldCheck, label: "DMR" },
      { href: "/risk-mapping?tab=plan-actions", icon: ClipboardList, label: "Plan d'actions" },
    ]
  },
  {
    href: "/risk-mapping?tab=matrix",
    icon: Grid,
    label: "Matrice des Risques",
    title: "Matrice des Risques",
    iconColor: "text-orange-500 dark:text-orange-400",
    iconBg: "bg-orange-500/10 dark:bg-orange-500/20",
    activeBg: "bg-orange-500/15 dark:bg-orange-500/25",
    activeBorder: "border-orange-500/40",
    activeText: "text-orange-700 dark:text-orange-300 font-bold",
  },
  {
    href: "/documents",
    icon: FileText,
    label: "Gestion Documentaire",
    title: "Gestion Documentaire",
    iconColor: "text-sky-500 dark:text-sky-400",
    iconBg: "bg-sky-500/10 dark:bg-sky-500/20",
    activeBg: "bg-sky-500/15 dark:bg-sky-500/25",
    activeBorder: "border-sky-500/40",
    activeText: "text-sky-700 dark:text-sky-300 font-bold",
  },
  {
    href: "/training",
    icon: GraduationCap,
    label: "Formations",
    title: "Formations et Sensibilisation",
    iconColor: "text-violet-500 dark:text-violet-400",
    iconBg: "bg-violet-500/10 dark:bg-violet-500/20",
    activeBg: "bg-violet-500/15 dark:bg-violet-500/25",
    activeBorder: "border-violet-500/40",
    activeText: "text-violet-700 dark:text-violet-300 font-bold",
  },
  {
    href: "/reports",
    icon: FilePieChart,
    label: "Reporting Automatisé",
    title: "Reporting Automatisé",
    iconColor: "text-fuchsia-500 dark:text-fuchsia-400",
    iconBg: "bg-fuchsia-500/10 dark:bg-fuchsia-500/20",
    activeBg: "bg-fuchsia-500/15 dark:bg-fuchsia-500/25",
    activeBorder: "border-fuchsia-500/40",
    activeText: "text-fuchsia-700 dark:text-fuchsia-300 font-bold",
  },
  {
    href: "/regtools-diff",
    icon: FileSpreadsheet,
    label: "Rapprochement RegTools",
    title: "Rapprochement Clients (Tab RegTools vs NS)",
    iconColor: "text-cyan-500 dark:text-cyan-400",
    iconBg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    activeBg: "bg-cyan-500/15 dark:bg-cyan-500/25",
    activeBorder: "border-cyan-500/40",
    activeText: "text-cyan-700 dark:text-cyan-300 font-bold",
  },
  {
    href: "/cahier-recette",
    icon: CheckSquare,
    label: "Cahier de recettes",
    title: "Cahier de Recette — RegTools",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-600/10 dark:bg-emerald-600/20",
    activeBg: "bg-emerald-600/15 dark:bg-emerald-600/25",
    activeBorder: "border-emerald-600/40",
    activeText: "text-emerald-800 dark:text-emerald-200 font-bold",
  },
  {
    href: "/controle-suivi",
    icon: ClipboardList,
    label: "Controle et suivi",
    title: "Contrôle et Suivi",
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-600/10 dark:bg-blue-600/20",
    activeBg: "bg-blue-600/15 dark:bg-blue-600/25",
    activeBorder: "border-blue-600/40",
    activeText: "text-blue-800 dark:text-blue-200 font-bold",
  },
  {
    href: "/non-conformite",
    icon: BookX,
    label: "Non-conformité Réglementaire",
    title: "Non-Conformité Réglementaire",
    iconColor: "text-rose-500 dark:text-rose-400",
    iconBg: "bg-rose-500/10 dark:bg-rose-500/20",
    activeBg: "bg-rose-500/15 dark:bg-rose-500/25",
    activeBorder: "border-rose-500/40",
    activeText: "text-rose-700 dark:text-rose-300 font-bold",
    subItems: [
      { href: "/non-conformite?tab=cartographie", icon: BookX, label: "Cartographie des Risques" },
      { href: "/non-conformite?tab=registre-veille", icon: ShieldCheck, label: "Registre Veille Réglementaire" },
    ],
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  const isMobile = useIsMobile();
  const { user, isLoaded, logout } = useUser();
  const { teamMembers } = useTeam();
  const { isAdmin } = useActivityLog();
  const { identifiedRegulations } = useIdentifiedRegulations();

  const userIsAdmin = user ? isAdmin(user.authEmail || user.email || '') : false;

  const linkedTeamMember = React.useMemo(() => {
    return teamMembers.find(m => m.name === user?.name || (m.email && user?.email && m.email === user?.email));
  }, [teamMembers, user]);

  const displayRole = linkedTeamMember?.officialFunction || user?.officialFunction || linkedTeamMember?.role || user?.role;

  const newAlertsCount = React.useMemo(() => {
    return identifiedRegulations.filter(reg => reg.status === 'Nouveau').length;
  }, [identifiedRegulations]);

  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isItemActive = React.useCallback((item: NavItem) => {
    const [basePath, query] = item.href.split('?');
    if (pathname !== basePath) return false;
    if (query && query.includes('tab=')) {
      const tabVal = query.split('tab=')[1];
      return currentTab === tabVal;
    }
    return !query || currentTab !== 'matrix';
  }, [pathname, currentTab]);

  const currentPage = navItems.find((item) => isItemActive(item)) || (pathname.startsWith('/alerts') ? { title: "Centre d'Alertes" } : undefined);

  const pageTitle = currentPage?.title || (
    pathname.startsWith('/settings/admin/activity') ? "Journal d'Activité Admin" :
    pathname.startsWith('/admin/workflows') ? "Gestion des Workflows" :
    pathname.startsWith('/settings') ? 'Paramètres' : 
    'Compliance Navigator'
  );

  return (
    <SidebarProvider defaultOpen={!isMobile} open={isMobile ? false : undefined}>
      <Sidebar collapsible="icon" side="left" variant="sidebar" className="z-40 border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950">
        
        {/* ── Header Brand ────────────────────────────────────────────── */}
        <SidebarHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80">
          <Link href="/dashboard" className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
            <Logo className="h-10 w-10 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 transition-all duration-300" />
            <span className="font-headline text-xl font-bold text-slate-900 dark:text-white group-data-[collapsible=icon]:hidden">
              ComplianceNav
            </span>
          </Link>
        </SidebarHeader>

        {/* ── Content (Exact original order with vibrant colorful accents) ── */}
        <SidebarContent className="p-2">
          <ScrollArea className="h-full">
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                const active = isItemActive(item);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={{ children: item.label, className: "font-semibold text-xs" }}
                        className={cn(
                          "h-11 rounded-xl transition-all duration-200 px-3 group/btn flex items-center gap-3 border border-transparent",
                          active
                            ? cn(item.activeBg, item.activeBorder, item.activeText, "shadow-sm")
                            : "hover:bg-slate-100/80 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        <div className={cn(
                          "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/btn:scale-110",
                          item.iconBg,
                          item.iconColor
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>

                        <span className={cn(
                          "text-xs tracking-tight truncate",
                          active ? "font-bold" : "font-medium"
                        )}>
                          {item.label}
                        </span>
                      </SidebarMenuButton>
                    </Link>

                    {/* Sub-items */}
                    {item.subItems && active && (
                      <SidebarMenuSub className="ml-5 pl-2.5 border-l-2 border-slate-200 dark:border-slate-800 space-y-1 my-1">
                        {item.subItems.map((subItem) => {
                          const isSubActive = pathname === subItem.href.split('?')[0] && (
                            !subItem.href.includes('?tab=') || 
                            currentTab === subItem.href.split('?tab=')[1] ||
                            (subItem.href.includes('?tab=table') && !currentTab) ||
                            (subItem.href.includes('?tab=cartographie') && (!currentTab || currentTab === 'cartographie'))
                          );
                          const SubIcon = subItem.icon;
                          
                          return (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton asChild className={cn(
                                "h-8 rounded-lg transition-all duration-200 px-2.5 text-xs font-semibold",
                                isSubActive 
                                  ? subItem.label === "DMR" 
                                    ? "bg-orange-500/15 text-orange-700 dark:text-orange-300 font-bold" 
                                    : subItem.label === "Plan d'actions"
                                      ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold"
                                      : subItem.label === "Registre Veille Réglementaire"
                                        ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold"
                                        : subItem.label === "Cartographie des Risques"
                                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold"
                                          : "bg-slate-200/70 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                              )}>
                                <Link href={subItem.href} className="flex items-center gap-2 w-full">
                                  <SubIcon className={cn(
                                    "h-3.5 w-3.5 shrink-0",
                                    isSubActive
                                      ? subItem.label === "DMR"
                                        ? "text-orange-600"
                                        : subItem.label === "Plan d'actions"
                                          ? "text-blue-600"
                                          : subItem.label === "Registre Veille Réglementaire"
                                            ? "text-indigo-600"
                                            : subItem.label === "Cartographie des Risques"
                                              ? "text-rose-600"
                                              : "text-slate-900 dark:text-white"
                                      : "text-slate-400"
                                  )} />
                                  <span className="truncate">{subItem.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}

              {/* Admin Section (Original order & structure) */}
              {user && userIsAdmin && (
                <>
                  <div className="px-3 py-2 mt-3 group-data-[collapsible=icon]:hidden">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Administration</p>
                  </div>
                  <SidebarMenuItem>
                    <Link href="/settings/admin/activity">
                      <SidebarMenuButton
                        isActive={pathname.startsWith('/settings/admin/activity')}
                        tooltip={{ children: "Journal d'Activité Admin", className: "font-semibold text-xs" }}
                        className={cn(
                          "h-11 rounded-xl transition-all duration-200 px-3 group/btn flex items-center gap-3 border border-transparent",
                          pathname.startsWith('/settings/admin/activity')
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold shadow-sm"
                            : "hover:bg-slate-100/80 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        <div className="h-7 w-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/btn:scale-110">
                          <Activity className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold tracking-tight truncate">
                          Journal d'Activité Admin
                        </span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <SidebarFooter className="p-3 border-t border-slate-100 dark:border-slate-800 group-data-[collapsible=icon]:justify-center">
          {isLoaded ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2.5 w-full justify-start p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center">
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8 ring-1 ring-slate-200 dark:ring-slate-700">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xs">
                        {user ? getInitials(user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                  </div>
                  <div className="group-data-[collapsible=icon]:hidden text-left flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">{user?.name}</p>
                    <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">{displayRole}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-56 rounded-xl shadow-lg border-slate-200 dark:border-slate-800">
                <DropdownMenuLabel className="font-body text-xs">Mon Compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="font-body cursor-pointer text-xs">
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-slate-500" />
                    <span>Paramètres</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="font-body text-xs text-red-600 hover:!text-red-600 focus:!text-red-600 focus:!bg-red-50 dark:text-red-500 dark:hover:!text-red-500 dark:focus:!text-red-500 dark:focus:!bg-red-900/50 cursor-pointer flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2 w-full justify-start p-2 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="group-data-[collapsible=icon]:hidden space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      {/* ── Main Inset ──────────────────────────────────────────────── */}
      <SidebarInset className="flex flex-col min-w-0 overflow-x-hidden">
        {!isFirebaseConfigured && (
          <div className="bg-destructive text-destructive-foreground text-center p-2.5 text-sm font-semibold flex items-center justify-center gap-2 z-50 shadow-lg">
            <AlertTriangle className="h-5 w-5" />
            <span>Attention: Connexion à la base de données impossible. Vos modifications ne seront pas sauvegardées.</span>
          </div>
        )}

        {/* ── Sticky Top Header ────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-3 sm:px-6 md:px-8 border-slate-200/60 dark:border-slate-800/60 min-w-0 overflow-hidden">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 leading-none mb-1">
                Gouvernance & Conformité
              </span>
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none truncate max-w-[150px] sm:max-w-none">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Déclencheur Autorisation d'Appareil */}
            <DeviceApprovalHeaderTrigger />

            {/* Déclencheur Mémos Intelligents */}
            <MemoHeaderTrigger />

            <Link href="/alerts">
              <Button variant="ghost" size="icon" aria-label="Voir les alertes" className="relative hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <BellRing className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                {newAlertsCount > 0 && (
                  <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500">
                      <span className="absolute -top-4 -right-1.5 text-xs font-bold">{newAlertsCount}</span>
                    </span>
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </header>

        {/* ── Page Children Content ──────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 md:p-8 min-w-0">
          {children}
        </main>

        {/* Drawer latéral des mémos */}
        <MemoDrawer />
        {/* Modal de création / édition de mémo */}
        <MemoEditorModalWrapper />
        {/* Widget flottant de mémo épinglé */}
        <FloatingPinnedMemoWidget />
        {/* Modal d'approbation temps-réel de nouveaux appareils */}
        <DeviceApprovalModal />
      </SidebarInset>
    </SidebarProvider>
  );
}

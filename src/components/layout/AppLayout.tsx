
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ShieldAlert,
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
import { Skeleton } from "@/components/ui/skeleton";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useIdentifiedRegulations } from "@/contexts/IdentifiedRegulationsContext";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", title: "Dashboard" },
  {
    href: "/plan",
    icon: Gavel,
    label: "Plan d'Organisation",
    title: "Plan d'Organisation",
    subItems: [
      { href: "/plan#processus-metiers", icon: Workflow, label: "Processus Métiers" }
    ]
  },
  { href: "/ecosystem", icon: Users, label: "Cartographie des Acteurs", title: "Cartographie des Acteurs" },
  { href: "/regulatory-watch", icon: SearchCheck, label: "Assistance Conformité IA", title: "Assistance Conformité IA" },
  { href: "/risk-mapping", icon: Map, label: "Cartographie des Risques", title: "Cartographie des Risques" },
  { href: "/documents", icon: FileText, label: "Gestion Documentaire", title: "Gestion Documentaire" },
  { href: "/training", icon: Users, label: "Formations", title: "Formations et Sensibilisation" },
  { href: "/reports", icon: FilePieChart, label: "Reporting Automatisé", title: "Reporting Automatisé" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { user, isLoaded } = useUser();
  const { identifiedRegulations } = useIdentifiedRegulations();

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

  const currentPage = navItems.find((item) => pathname.startsWith(item.href)) || (pathname.startsWith('/alerts') ? { title: "Centre d'Alertes" } : undefined);

  const pageTitle = currentPage?.title || (pathname.startsWith('/settings') ? 'Paramètres' : 'Compliance Navigator');

  return (
    <SidebarProvider defaultOpen={!isMobile} open={isMobile ? false : undefined}>
      <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <Logo className="h-8 w-8" />
            <span className="font-headline text-xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              ComplianceNav
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <ScrollArea className="h-full">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton
                      isActive={pathname.startsWith(item.href)}
                      tooltip={{ children: item.label, className: "font-black uppercase tracking-widest text-[10px]" }}
                      className={cn(
                        "h-12 rounded-xl transition-all duration-300 px-4 group/btn",
                        pathname.startsWith(item.href)
                          ? "bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-950 shadow-lg shadow-slate-900/10 dark:shadow-slate-50/10"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 transition-transform group-hover/btn:scale-110",
                        pathname.startsWith(item.href) ? "text-primary" : "text-slate-400"
                      )} />
                      <span className="font-extrabold text-[11px] uppercase tracking-tighter italic">
                        {item.label}
                      </span>
                    </SidebarMenuButton>
                  </Link>
                  {item.subItems && (
                    <SidebarMenuSub>
                      {item.subItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.href}>
                          <SidebarMenuSubButton asChild className="h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 group/sub">
                            <Link href={subItem.href} className="flex items-center gap-3">
                              <subItem.icon className="h-4 w-4 text-slate-400 group-hover/sub:text-primary transition-colors" />
                              <span className="font-bold text-[10px] uppercase tracking-tight text-slate-500 group-hover/sub:text-slate-900 dark:group-hover/sub:text-slate-100 transition-colors">
                                {subItem.label}
                              </span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border group-data-[collapsible=icon]:justify-center">
          {isLoaded ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 w-full justify-start p-2 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center">
                  <Avatar key="user-profile-avatar" className="h-8 w-8">
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="group-data-[collapsible=icon]:hidden text-left">
                    <p className="text-sm font-medium text-sidebar-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.role}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-56">
                <DropdownMenuLabel className="font-body">Mon Compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="font-body cursor-pointer">
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Paramètres</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="font-body text-red-600 hover:!text-red-600 focus:!text-red-600 focus:!bg-red-50 dark:text-red-500 dark:hover:!text-red-500 dark:focus:!text-red-500 dark:focus:!bg-red-900/50">
                  <LogOut className="mr-2 h-4 w-4" />
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
      <SidebarInset className="flex flex-col">
        {!isFirebaseConfigured && (
          <div className="bg-destructive text-destructive-foreground text-center p-2.5 text-sm font-semibold flex items-center justify-center gap-2 z-50 shadow-lg">
            <AlertTriangle className="h-5 w-5" />
            <span>Attention: Connexion à la base de données impossible. Vos modifications ne seront pas sauvegardées.</span>
          </div>
        )}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-4 sm:px-6 md:px-8 border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 leading-none mb-1">Gouvernance & Conformité</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                {pageTitle}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/alerts">
              <Button variant="ghost" size="icon" aria-label="Voir les alertes" className="relative">
                <BellRing className="h-6 w-6" />
                {newAlertsCount > 0 && (
                  <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500">
                      <span className="absolute -top-4 -right-1.5 text-xs font-bold">{newAlertsCount}</span>
                    </span>
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

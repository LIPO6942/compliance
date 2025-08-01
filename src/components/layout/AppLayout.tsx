
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Logo } from "@/components/icons/Logo";
import {
  LayoutDashboard,
  Gavel,
  ShieldAlert,
  SearchCheck,
  ClipboardCheck,
  MessageSquareWarning,
  FolderKanban,
  FileText,
  FilePieChart,
  Settings,
  LogOut,
  BellRing,
  Users,
  Map,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", title: "Dashboard" },
  { href: "/plan", icon: Gavel, label: "Plan d'Organisation", title: "Plan d'Organisation" },
  {
    label: "Veille Réglementaire",
    icon: SearchCheck,
    title: "Veille Réglementaire",
    href: "/regulatory-watch", // Main link for the group
    subItems: [
      { href: "/regulatory-watch", label: "Analyse IA", title: "Veille Réglementaire IA" },
      { href: "/risk-mapping", label: "Cartographie des Risques", title: "Cartographie des Risques" },
    ],
  },
  { href: "/alerts", icon: BellRing, label: "Centre d'Alertes", title: "Centre d'Alertes" },
  { href: "/documents", icon: FileText, label: "Gestion Documentaire", title: "Gestion Documentaire" },
  { href: "/training", icon: Users, label: "Formations", title: "Formations et Sensibilisation" },
  { href: "/reports", icon: FilePieChart, label: "Reporting Automatisé", title: "Reporting Automatisé" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { user, isLoaded } = useUser();

  const activeParent = navItems.find((item) =>
    "subItems" in item && item.subItems?.some((sub) => pathname.startsWith(sub.href))
  );

  const [openSubMenu, setOpenSubMenu] = React.useState<string | null>(activeParent?.label || null);

  const currentPage = navItems
    .flatMap((item) => ("subItems" in item ? item.subItems : item))
    .find((item) => item && pathname.startsWith(item.href));

  const pageTitle = currentPage?.title || "Compliance Navigator";

  return (
    <SidebarProvider defaultOpen={!isMobile} open={isMobile ? false : undefined}>
      <Sidebar collapsible="icon" side="left" variant="sidebar">
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
              {navItems.map((item) =>
                "subItems" in item ? (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      onClick={() => setOpenSubMenu(openSubMenu === item.label ? null : item.label)}
                      isActive={item.subItems.some((sub) => pathname.startsWith(sub.href))}
                      tooltip={{ children: item.label, className: "font-body" }}
                      className="font-body justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <item.icon />
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden ${
                          openSubMenu === item.label ? "rotate-180" : ""
                        }`}
                      />
                    </SidebarMenuButton>
                    <div
                      className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
                        openSubMenu === item.label ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <SidebarMenuSub>
                          {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton asChild isActive={pathname.startsWith(subItem.href)}>
                                <Link href={subItem.href}>
                                  {subItem.label}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </div>
                    </div>
                  </SidebarMenuItem>
                ) : (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href!}>
                      <SidebarMenuButton
                        isActive={pathname.startsWith(item.href!)}
                        tooltip={{ children: item.label, className: "font-body" }}
                        className="font-body"
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border group-data-[collapsible=icon]:justify-center">
          {isLoaded ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 w-full justify-start p-2 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center">
                  <Avatar key="user-profile-avatar" className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl} alt="User Avatar" data-ai-hint="professional portrait" />
                    <AvatarFallback>{user.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
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
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6 md:px-8">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <h1 className="font-headline text-2xl font-semibold text-foreground">
              {pageTitle}
            </h1>
          </div>
          {/* Placeholder for additional header controls like dark mode toggle or notifications */}
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

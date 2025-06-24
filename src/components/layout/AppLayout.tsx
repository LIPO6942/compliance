
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
  Map, // Added Map icon
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

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", title: "Dashboard" },
  { href: "/plan", icon: Gavel, label: "Plan d'Organisation", title: "Plan d'Organisation" },
  { href: "/regulatory-watch", icon: SearchCheck, label: "Veille Réglementaire", title: "Veille Réglementaire IA" },
  { href: "/alerts", icon: BellRing, label: "Centre d'Alertes", title: "Centre d'Alertes" },
  { href: "/documents", icon: FileText, label: "Gestion Documentaire", title: "Gestion Documentaire" },
  { href: "/risk-mapping", icon: Map, label: "Cartographie des Risques", title: "Cartographie des Risques" },
  { href: "/training", icon: Users, label: "Formations", title: "Formations et Sensibilisation" },
  { href: "/reports", icon: FilePieChart, label: "Reporting Automatisé", title: "Reporting Automatisé" },
];

const complianceCategoriesIcons = {
  "Gouvernance de la conformité": Gavel,
  "Lutte contre le blanchiment et financement du terrorisme (LAB-FT)": ShieldAlert,
  "Veille réglementaire et conformité produit": SearchCheck,
  "Contrôles et reporting": ClipboardCheck,
  "Formation et sensibilisation": Users,
  "Réclamations et lanceurs d’alerte": MessageSquareWarning,
  "Projets et outils": FolderKanban,
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const currentPage = navItems.find(item => pathname.startsWith(item.href));
  const pageTitle = currentPage?.title || "Compliance Navigator";

  return (
    <SidebarProvider defaultOpen={!isMobile} open={isMobile ? false: undefined}>
      <Sidebar collapsible="icon" side="left" variant="sidebar">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <Logo className="h-8 w-8 text-primary" />
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
                      tooltip={{ children: item.label, className: "font-body" }}
                      className="font-body"
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border group-data-[collapsible=icon]:justify-center">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 w-full justify-start p-2 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center">
                <Avatar key="user-profile-avatar" className="h-8 w-8">
                  <AvatarImage src="https://images.unsplash.com/photo-1672268931062-e659b36c6dd4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxNfGVufDB8fHx8MTc1MDM2Njk5MHww&ixlib=rb-4.1.0&q=80&w=1080" alt="User Avatar" data-ai-hint="C letter" />
                  <AvatarFallback>M</AvatarFallback>
                </Avatar>
                <div className="group-data-[collapsible=icon]:hidden text-left">
                  <p className="text-sm font-medium text-sidebar-foreground">Moslem</p>
                  <p className="text-xs text-muted-foreground">Conformité MAE</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-56">
              <DropdownMenuLabel className="font-body">Mon Compte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="font-body">
                <Settings className="mr-2 h-4 w-4" />
                <span>Paramètres</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="font-body text-red-600 hover:!text-red-600 focus:!text-red-600 focus:!bg-red-50 dark:text-red-500 dark:hover:!text-red-500 dark:focus:!text-red-500 dark:focus:!bg-red-900/50">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Déconnexion</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
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

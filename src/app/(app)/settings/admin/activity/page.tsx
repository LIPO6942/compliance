'use client';

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Activity,
    Search,
    Filter,
    Clock,
    User,
    Layers,
    ShieldAlert,
    ArrowLeft,
    Download,
    Calendar,
    ChevronRight,
    ChevronLeft,
    Database,
    Eye,
    LogOut,
    LogIn,
    Printer,
    FileSpreadsheet,
    FileText,
    Settings,
    Trash2,
    CheckCircle2,
    Sparkles,
    Laptop,
    ShieldCheck,
    RefreshCw,
    X
} from "lucide-react";
import { useActivityLog, ActivityAction, ActivityEntry } from "@/contexts/ActivityLogContext";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { format, isToday, isWithinInterval, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import * as XLSX from "xlsx";

const actionStyles: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    // Auth
    'LOGIN': { bg: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200', text: 'text-emerald-800 dark:text-emerald-300', icon: LogIn, label: 'Connexion' },
    'LOGOUT': { bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200', text: 'text-slate-700 dark:text-slate-300', icon: LogOut, label: 'Déconnexion' },
    'SESSION_RESTORE': { bg: 'bg-teal-100 dark:bg-teal-900/40 border-teal-200', text: 'text-teal-800 dark:text-teal-300', icon: ShieldCheck, label: 'Session Active' },

    // Consultations
    'REPORT_VIEW': { bg: 'bg-blue-100 dark:bg-blue-900/40 border-blue-200', text: 'text-blue-800 dark:text-blue-300', icon: Eye, label: 'Consultation Rapport' },
    'DOCUMENT_VIEW': { bg: 'bg-sky-100 dark:bg-sky-900/40 border-sky-200', text: 'text-sky-800 dark:text-sky-300', icon: FileText, label: 'Consultation Doc' },
    'DOCUMENT_DOWNLOAD': { bg: 'bg-cyan-100 dark:bg-cyan-900/40 border-cyan-200', text: 'text-cyan-800 dark:text-cyan-300', icon: Download, label: 'Téléchargement' },
    'MEMO_VIEW': { bg: 'bg-violet-100 dark:bg-violet-900/40 border-violet-200', text: 'text-violet-800 dark:text-violet-300', icon: Eye, label: 'Lecture Mémo' },
    'PAGE_VIEW': { bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200', text: 'text-slate-700 dark:text-slate-300', icon: Eye, label: 'Vue Page' },

    // Impressions & Exports
    'PRINT_WORKFLOW': { bg: 'bg-purple-100 dark:bg-purple-900/40 border-purple-200', text: 'text-purple-800 dark:text-purple-300', icon: Printer, label: 'Impression Workflow' },
    'PRINT_REPORT': { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40 border-fuchsia-200', text: 'text-fuchsia-800 dark:text-fuchsia-300', icon: Printer, label: 'Impression Rapport' },
    'EXPORT_DATA': { bg: 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-200', text: 'text-indigo-800 dark:text-indigo-300', icon: FileSpreadsheet, label: 'Export Données' },

    // Risques & Matrice
    'RISK_ADD': { bg: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200', text: 'text-emerald-800 dark:text-emerald-300', icon: Activity, label: 'Ajout Risque' },
    'RISK_EDIT': { bg: 'bg-amber-100 dark:bg-amber-900/40 border-amber-200', text: 'text-amber-800 dark:text-amber-300', icon: Activity, label: 'Modif Risque' },
    'RISK_DELETE': { bg: 'bg-rose-100 dark:bg-rose-900/40 border-rose-200', text: 'text-rose-800 dark:text-rose-300', icon: Trash2, label: 'Suppr Risque' },

    // Plan & Tâches
    'PLAN_UPDATE': { bg: 'bg-violet-100 dark:bg-violet-900/40 border-violet-200', text: 'text-violet-800 dark:text-violet-300', icon: Layers, label: 'Plan Modifié' },
    'TASK_CREATE': { bg: 'bg-blue-100 dark:bg-blue-900/40 border-blue-200', text: 'text-blue-800 dark:text-blue-300', icon: Layers, label: 'Création Tâche' },
    'TASK_UPDATE': { bg: 'bg-amber-100 dark:bg-amber-900/40 border-amber-200', text: 'text-amber-800 dark:text-amber-300', icon: Layers, label: 'Modif Tâche' },
    'TASK_DELETE': { bg: 'bg-rose-100 dark:bg-rose-900/40 border-rose-200', text: 'text-rose-800 dark:text-rose-300', icon: Trash2, label: 'Suppr Tâche' },
    'TASK_COMPLETE': { bg: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200', text: 'text-emerald-800 dark:text-emerald-300', icon: CheckCircle2, label: 'Tâche Validée' },

    // Workflows
    'WORKFLOW_CREATE': { bg: 'bg-purple-100 dark:bg-purple-900/40 border-purple-200', text: 'text-purple-800 dark:text-purple-300', icon: Sparkles, label: 'Création Workflow' },
    'WORKFLOW_UPDATE': { bg: 'bg-purple-100 dark:bg-purple-900/40 border-purple-200', text: 'text-purple-800 dark:text-purple-300', icon: Settings, label: 'Modif Workflow' },
    'WORKFLOW_PUBLISH': { bg: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200', text: 'text-emerald-800 dark:text-emerald-300', icon: CheckCircle2, label: 'Publication Workflow' },
    'WORKFLOW_DELETE': { bg: 'bg-rose-100 dark:bg-rose-900/40 border-rose-200', text: 'text-rose-800 dark:text-rose-300', icon: Trash2, label: 'Suppr Workflow' },

    // Documents
    'DOCUMENT_ADD': { bg: 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-200', text: 'text-indigo-800 dark:text-indigo-300', icon: Database, label: 'Ajout Document' },
    'DOCUMENT_EDIT': { bg: 'bg-purple-100 dark:bg-purple-900/40 border-purple-200', text: 'text-purple-800 dark:text-purple-300', icon: Database, label: 'Modif Document' },
    'DOCUMENT_DELETE': { bg: 'bg-rose-100 dark:bg-rose-900/40 border-rose-200', text: 'text-rose-800 dark:text-rose-300', icon: Trash2, label: 'Suppr Document' },
    'DOCUMENT_STATUS': { bg: 'bg-cyan-100 dark:bg-cyan-900/40 border-cyan-200', text: 'text-cyan-800 dark:text-cyan-300', icon: Eye, label: 'Statut Document' },

    // Mémos
    'MEMO_CREATE': { bg: 'bg-amber-100 dark:bg-amber-900/40 border-amber-200', text: 'text-amber-800 dark:text-amber-300', icon: FileText, label: 'Création Mémo' },
    'MEMO_EDIT': { bg: 'bg-amber-100 dark:bg-amber-900/40 border-amber-200', text: 'text-amber-800 dark:text-amber-300', icon: FileText, label: 'Modif Mémo' },
    'MEMO_DELETE': { bg: 'bg-rose-100 dark:bg-rose-900/40 border-rose-200', text: 'text-rose-800 dark:text-rose-300', icon: Trash2, label: 'Suppr Mémo' },

    // Cahier & Contrôles
    'TEST_EXECUTE': { bg: 'bg-blue-100 dark:bg-blue-900/40 border-blue-200', text: 'text-blue-800 dark:text-blue-300', icon: CheckCircle2, label: 'Test Exécuté' },
    'ANOMALY_CREATE': { bg: 'bg-rose-100 dark:bg-rose-900/40 border-rose-200', text: 'text-rose-800 dark:text-rose-300', icon: ShieldAlert, label: 'Anomalie Créée' },
    'CONTROL_EXECUTE': { bg: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200', text: 'text-emerald-800 dark:text-emerald-300', icon: ShieldCheck, label: 'Contrôle Exécuté' },

    // Alertes & Paramètres
    'ALERT_CREATE': { bg: 'bg-orange-100 dark:bg-orange-900/40 border-orange-200', text: 'text-orange-800 dark:text-orange-300', icon: ShieldAlert, label: 'Alerte Créée' },
    'ALERT_REMOVE': { bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200', text: 'text-slate-700 dark:text-slate-300', icon: ShieldAlert, label: 'Alerte Retirée' },
    'SETTINGS_UPDATE': { bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200', text: 'text-slate-700 dark:text-slate-300', icon: Settings, label: 'Paramètres' },
    'LEGAL_BASE_UPDATE': { bg: 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-200', text: 'text-indigo-800 dark:text-indigo-300', icon: Database, label: 'Base Légale' },
    'TEAM_UPDATE': { bg: 'bg-blue-100 dark:bg-blue-900/40 border-blue-200', text: 'text-blue-800 dark:text-blue-300', icon: User, label: 'Équipe' },
    'OTHER': { bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200', text: 'text-slate-700 dark:text-slate-300', icon: Activity, label: 'Autre Activité' },
};

export default function AdminActivityPage() {
    const { logs, isAdmin } = useActivityLog();
    const { user, isLoaded } = useUser();
    const router = useRouter();

    // Filters
    const [searchTerm, setSearchTerm] = React.useState("");
    const [filterCategory, setFilterCategory] = React.useState<string>("all");
    const [filterUser, setFilterUser] = React.useState<string>("all");
    const [filterModule, setFilterModule] = React.useState<string>("all");
    const [filterPeriod, setFilterPeriod] = React.useState<string>("all");
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 50;

    const currentUserEmail = user?.authEmail || user?.email || "";
    const userIsAdmin = isAdmin(currentUserEmail);

    // Security check: only admins can see this
    React.useEffect(() => {
        if (isLoaded && (!currentUserEmail || !userIsAdmin)) {
            router.push("/dashboard");
        }
    }, [isLoaded, currentUserEmail, userIsAdmin, router]);

    const safeLogs = Array.isArray(logs) ? logs : [];

    // Distinct list of users from logs
    const distinctUsers = React.useMemo(() => {
        const map = new Map<string, { email: string; name: string }>();
        safeLogs.forEach(l => {
            const email = (l.userEmail || '').trim().toLowerCase();
            if (email && !map.has(email)) {
                map.set(email, { email, name: l.userName || email });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [safeLogs]);

    // Distinct list of modules from logs
    const distinctModules = React.useMemo(() => {
        const set = new Set<string>();
        safeLogs.forEach(l => {
            if (l.module && l.module.trim()) set.add(l.module.trim());
        });
        return Array.from(set).sort();
    }, [safeLogs]);

    // Compute KPIs
    const stats = React.useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = subDays(now, 7);

        let totalLogins = 0;
        let todayLogins = 0;
        let totalViews = 0;
        let totalPrints = 0;
        let totalModifications = 0;
        const activeUsersSet = new Set<string>();

        safeLogs.forEach(l => {
            const d = new Date(l.timestamp);
            const isValidDate = !isNaN(d.getTime());
            const email = (l.userEmail || '').toLowerCase();
            if (email) activeUsersSet.add(email);

            if (l.action === 'LOGIN' || l.action === 'SESSION_RESTORE') {
                totalLogins++;
                if (isValidDate && d >= startOfToday) {
                    todayLogins++;
                }
            } else if (l.action === 'REPORT_VIEW' || l.action === 'DOCUMENT_VIEW' || l.action === 'MEMO_VIEW' || l.action === 'PAGE_VIEW') {
                totalViews++;
            } else if (l.action === 'PRINT_WORKFLOW' || l.action === 'PRINT_REPORT' || l.action === 'EXPORT_DATA' || l.action === 'DOCUMENT_DOWNLOAD') {
                totalPrints++;
            } else {
                totalModifications++;
            }
        });

        return {
            totalLogs: safeLogs.length,
            totalLogins,
            todayLogins,
            totalViews,
            totalPrints,
            totalModifications,
            activeUsersCount: activeUsersSet.size
        };
    }, [safeLogs]);

    // Filter logs
    const filteredLogs = React.useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = subDays(now, 7);
        const thirtyDaysAgo = subDays(now, 30);

        return safeLogs.filter(log => {
            if (!log) return false;

            const userName = (log.userName || "").toLowerCase();
            const userEmail = (log.userEmail || "").toLowerCase();
            const label = (log.label || "").toLowerCase();
            const detail = (log.detail || "").toLowerCase();
            const moduleName = (log.module || "").toLowerCase();
            const deviceInfo = (log.deviceInfo || "").toLowerCase();
            const search = (searchTerm || "").toLowerCase().trim();

            const matchesSearch = !search ||
                userName.includes(search) ||
                userEmail.includes(search) ||
                label.includes(search) ||
                detail.includes(search) ||
                moduleName.includes(search) ||
                deviceInfo.includes(search);

            // Filter User
            const matchesUser = filterUser === "all" || userEmail === filterUser.toLowerCase();

            // Filter Module
            const matchesModule = filterModule === "all" || (log.module || "").toLowerCase() === filterModule.toLowerCase();

            // Filter Period
            let matchesPeriod = true;
            const logDate = new Date(log.timestamp);
            if (!isNaN(logDate.getTime())) {
                if (filterPeriod === "today") {
                    matchesPeriod = logDate >= startOfToday;
                } else if (filterPeriod === "7d") {
                    matchesPeriod = logDate >= sevenDaysAgo;
                } else if (filterPeriod === "30d") {
                    matchesPeriod = logDate >= thirtyDaysAgo;
                }
            }

            // Filter Category / Action
            let matchesCategory = true;
            const action = log.action || "OTHER";
            if (filterCategory === "cat_auth") {
                matchesCategory = ['LOGIN', 'LOGOUT', 'SESSION_RESTORE'].includes(action);
            } else if (filterCategory === "cat_view") {
                matchesCategory = ['REPORT_VIEW', 'DOCUMENT_VIEW', 'MEMO_VIEW', 'PAGE_VIEW'].includes(action);
            } else if (filterCategory === "cat_print") {
                matchesCategory = ['PRINT_WORKFLOW', 'PRINT_REPORT', 'EXPORT_DATA', 'DOCUMENT_DOWNLOAD'].includes(action);
            } else if (filterCategory === "cat_grc") {
                matchesCategory = ['RISK_ADD', 'RISK_EDIT', 'RISK_DELETE', 'ALERT_CREATE', 'ALERT_REMOVE'].includes(action);
            } else if (filterCategory === "cat_plan") {
                matchesCategory = ['PLAN_UPDATE', 'TASK_CREATE', 'TASK_UPDATE', 'TASK_DELETE', 'TASK_COMPLETE', 'WORKFLOW_CREATE', 'WORKFLOW_UPDATE', 'WORKFLOW_PUBLISH', 'WORKFLOW_DELETE'].includes(action);
            } else if (filterCategory === "cat_doc") {
                matchesCategory = ['DOCUMENT_ADD', 'DOCUMENT_EDIT', 'DOCUMENT_DELETE', 'DOCUMENT_STATUS', 'MEMO_CREATE', 'MEMO_EDIT', 'MEMO_DELETE', 'MEMO_PIN'].includes(action);
            } else if (filterCategory === "cat_admin") {
                matchesCategory = ['SETTINGS_UPDATE', 'LEGAL_BASE_UPDATE', 'TEAM_UPDATE'].includes(action);
            } else if (filterCategory !== "all") {
                matchesCategory = action === filterCategory;
            }

            return matchesSearch && matchesUser && matchesModule && matchesPeriod && matchesCategory;
        });
    }, [safeLogs, searchTerm, filterUser, filterModule, filterPeriod, filterCategory]);

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

    const getInitials = (name?: string) => {
        if (!name || typeof name !== 'string') return "U";
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "U";
        return parts.map(n => n[0]).join('').toUpperCase().substring(0, 2) || "U";
    };

    const safeFormatDate = (dateVal: any, formatStr: string) => {
        if (!dateVal) return "N/A";
        try {
            let d: Date;
            if (typeof dateVal === 'object' && dateVal !== null && 'seconds' in dateVal) {
                d = new Date(dateVal.seconds * 1000);
            } else if (dateVal instanceof Date) {
                d = dateVal;
            } else {
                d = new Date(dateVal);
            }
            if (isNaN(d.getTime())) return "N/A";
            return format(d, formatStr, { locale: fr });
        } catch {
            return "N/A";
        }
    };

    const handleExportExcel = () => {
        if (!filteredLogs || filteredLogs.length === 0) return;

        const excelData = filteredLogs.map((l, index) => ({
            "N°": index + 1,
            "Date": safeFormatDate(l.timestamp, 'yyyy-MM-dd'),
            "Heure": safeFormatDate(l.timestamp, 'HH:mm:ss'),
            "Nom Utilisateur": l.userName || 'Utilisateur',
            "Email": l.userEmail || '',
            "Rôle": l.userRole || '',
            "Action": (l.action || 'OTHER'),
            "Module": l.module || 'Général',
            "Description": l.label || '',
            "Détails Complémentaires": l.detail || '',
            "Appareil / Navigateur": l.deviceInfo || ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, "Journal_Activites_ADMIN");
        XLSX.writeFile(wb, `Journal_Activites_ADMIN_MAE_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);
    };

    const handleResetFilters = () => {
        setSearchTerm("");
        setFilterCategory("all");
        setFilterUser("all");
        setFilterModule("all");
        setFilterPeriod("all");
        setCurrentPage(1);
    };

    const hasActiveFilters = searchTerm !== "" || filterCategory !== "all" || filterUser !== "all" || filterModule !== "all" || filterPeriod !== "all";

    if (!isLoaded || !currentUserEmail || !userIsAdmin) return null;

    return (
        <div className="space-y-8 pb-20">
            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <Link href="/settings">
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 border border-slate-200 dark:border-slate-800 hover:bg-slate-100">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border-emerald-200">
                                Traçabilité & Audit GRC
                            </Badge>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3 mt-1">
                            <Activity className="h-8 w-8 text-primary" />
                            Journal d'Activités ADMIN
                        </h1>
                        <p className="text-sm text-muted-foreground font-medium">
                            Surveillance en temps réel de toutes les connexions, consultations de rapports, impressions et modifications métiers.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleExportExcel}
                        className="gap-2 font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-5 shadow-sm"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Exporter Audit (.xlsx)
                    </Button>
                </div>
            </div>

            {/* ── KPI SYNTHÈSE CARDS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Connexions */}
                <Card className="border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                🔐 Connexions & Sessions
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalLogins}</span>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                                    +{stats.todayLogins} auj.
                                </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium">
                                {stats.activeUsersCount} utilisateur(s) actif(s)
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600">
                            <LogIn className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Consultations */}
                <Card className="border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-slate-900">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                                📊 Rapports & Docs Consultés
                            </span>
                            <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalViews}</div>
                            <p className="text-[11px] text-muted-foreground font-medium">
                                Vues CGA, LAB-FT, Contrôles & Textes
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
                            <Eye className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Impressions & Exports */}
                <Card className="border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-slate-900">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400">
                                🖨️ Impressions & Exports
                            </span>
                            <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalPrints}</div>
                            <p className="text-[11px] text-muted-foreground font-medium">
                                Workflows 1 page, Excel & PDF
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600">
                            <Printer className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Modifications GRC */}
                <Card className="border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                ⚡ Actions GRC & Modifications
                            </span>
                            <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalModifications}</div>
                            <p className="text-[11px] text-muted-foreground font-medium">
                                Risques, Plans, Tâches & Mémos
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600">
                            <Layers className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── BARRE DE FILTRES MULTIDIMENSIONNELLE ── */}
            <Card className="border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 bg-white dark:bg-slate-900">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                    {/* Recherche plein texte */}
                    <div className="lg:col-span-4 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Rechercher (nom, email, action, module, appareil)..."
                            className="pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    {/* Filtre Catégorie d'action */}
                    <div className="lg:col-span-3">
                        <select
                            className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-primary/30"
                            value={filterCategory}
                            onChange={(e) => {
                                setFilterCategory(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="all">🔍 Toutes les activités</option>
                            <option value="cat_auth">🔐 Connexions & Sessions (Auth)</option>
                            <option value="cat_view">👁️ Consultations de Rapports & Docs</option>
                            <option value="cat_print">🖨️ Impressions & Exports Données</option>
                            <option value="cat_grc">🛡️ Risques & Matrice GRC</option>
                            <option value="cat_plan">📋 Plan & Tâches Métiers</option>
                            <option value="cat_doc">📁 Documents & Mémos</option>
                            <option value="cat_admin">⚙️ Administration & Paramètres</option>
                        </select>
                    </div>

                    {/* Filtre Utilisateur */}
                    <div className="lg:col-span-2">
                        <select
                            className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-primary/30"
                            value={filterUser}
                            onChange={(e) => {
                                setFilterUser(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="all">👤 Tous les utilisateurs</option>
                            {distinctUsers.map(u => (
                                <option key={u.email} value={u.email}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filtre Module */}
                    <div className="lg:col-span-2">
                        <select
                            className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-primary/30"
                            value={filterModule}
                            onChange={(e) => {
                                setFilterModule(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="all">📂 Tous les modules</option>
                            {distinctModules.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filtre Période */}
                    <div className="lg:col-span-1">
                        <select
                            className="w-full h-11 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-primary/30"
                            value={filterPeriod}
                            onChange={(e) => {
                                setFilterPeriod(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="all">📅 Tout</option>
                            <option value="today">Aujourd'hui</option>
                            <option value="7d">7 jours</option>
                            <option value="30d">30 jours</option>
                        </select>
                    </div>
                </div>

                {hasActiveFilters && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span className="text-muted-foreground font-semibold">
                            Résultats filtrés : <strong className="text-slate-900 dark:text-white">{filteredLogs.length}</strong> événement(s)
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResetFilters}
                            className="h-7 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
                        >
                            <X className="h-3.5 w-3.5" /> Réinitialiser les filtres
                        </Button>
                    </div>
                )}
            </Card>

            {/* ── TABLE DES LOGS ── */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-widest py-4 px-6">Utilisateur</TableHead>
                            <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-widest py-4 px-4">Action / Événement</TableHead>
                            <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-widest py-4 px-4">Description & Détails</TableHead>
                            <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-widest py-4 px-4">Module & Appareil</TableHead>
                            <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-widest py-4 px-6 text-right">Horodatage</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {currentLogs.length > 0 ? (
                            currentLogs.map((log, idx) => {
                                const actionKey = (log.action || 'OTHER') as string;
                                const style = actionStyles[actionKey] || actionStyles.OTHER;
                                const ActionIcon = style.icon || Activity;

                                return (
                                    <TableRow key={log.id || `${log.timestamp}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                                        {/* Utilisateur */}
                                        <TableCell className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border-2 border-white dark:border-slate-800 shadow-sm">
                                                    <AvatarFallback className="bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs">
                                                        {getInitials(log.userName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                                        {log.userName || "Utilisateur"}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {log.userEmail || "Anonyme"}
                                                    </span>
                                                    {log.userRole && (
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                                            {log.userRole}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Action Badge */}
                                        <TableCell className="py-4 px-4">
                                            <Badge className={cn("rounded-lg px-2.5 py-1 gap-1.5 border shadow-none font-black text-[9px] uppercase tracking-wider", style.bg, style.text)}>
                                                <ActionIcon className="h-3 w-3" />
                                                {style.label || (log.action || 'OTHER').replace(/_/g, ' ')}
                                            </Badge>
                                        </TableCell>

                                        {/* Description & Détails */}
                                        <TableCell className="py-4 px-4 max-w-md">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    {log.label || "-"}
                                                </span>
                                                {log.detail && (
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                                        {log.detail}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Module & Appareil */}
                                        <TableCell className="py-4 px-4">
                                            <div className="flex flex-col gap-1">
                                                <Badge variant="outline" className="w-fit text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 py-0.5">
                                                    {log.module || "Général"}
                                                </Badge>
                                                {log.deviceInfo && (
                                                    <span className="text-[9px] text-slate-400 flex items-center gap-1 font-medium truncate max-w-[180px]" title={log.deviceInfo}>
                                                        <Laptop className="h-2.5 w-2.5 flex-shrink-0" />
                                                        {log.deviceInfo}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Horodatage */}
                                        <TableCell className="py-4 px-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                                                    {safeFormatDate(log.timestamp, 'HH:mm:ss')}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {safeFormatDate(log.timestamp, 'dd MMM yyyy')}
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                                        <Activity className="h-12 w-12 opacity-20" />
                                        <p className="font-bold text-sm italic">Aucune activité enregistrée correspondant à vos critères.</p>
                                        {hasActiveFilters && (
                                            <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs font-bold rounded-xl">
                                                Réinitialiser les filtres
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* ── PAGINATION ── */}
            {filteredLogs.length > itemsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                    <div className="text-xs text-muted-foreground font-semibold">
                        Affichage de <span className="font-bold text-slate-900 dark:text-white">{Math.min(filteredLogs.length, (currentPage - 1) * itemsPerPage + 1)}</span> à <span className="font-bold text-slate-900 dark:text-white">{Math.min(filteredLogs.length, currentPage * itemsPerPage)}</span> sur <span className="font-bold text-slate-900 dark:text-white">{filteredLogs.length}</span> activités
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-800 font-bold gap-1 text-xs"
                            onClick={() => setCurrentPage((prev: number) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Précédent
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => {
                                    return page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2);
                                })
                                .map((page, idx, arr) => {
                                    const prevPage = arr[idx - 1];
                                    const showEllipsis = prevPage && page - prevPage > 1;
                                    return (
                                        <React.Fragment key={page}>
                                            {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                                            <Button
                                                variant={currentPage === page ? "default" : "outline"}
                                                size="sm"
                                                className={cn(
                                                    "h-9 w-9 p-0 rounded-xl text-xs font-bold",
                                                    currentPage === page ? "bg-primary text-white" : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                                                )}
                                                onClick={() => setCurrentPage(page)}
                                            >
                                                {page}
                                            </Button>
                                        </React.Fragment>
                                    );
                                })}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-800 font-bold gap-1 text-xs"
                            onClick={() => setCurrentPage((prev: number) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Suivant
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

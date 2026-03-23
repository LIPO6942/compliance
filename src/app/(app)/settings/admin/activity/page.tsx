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
    Settings,
    Trash2
} from "lucide-react";
import { useActivityLog, ActivityAction, ActivityEntry } from "@/contexts/ActivityLogContext";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const actionColors: Record<ActivityAction, { bg: string, text: string, icon: any }> = {
    'LOGIN': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: User },
    'LOGOUT': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400', icon: LogOut },
    'RISK_ADD': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: Activity },
    'RISK_EDIT': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: Activity },
    'RISK_DELETE': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400', icon: Trash2 },
    'DOCUMENT_ADD': { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', icon: Database },
    'DOCUMENT_EDIT': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', icon: Database },
    'DOCUMENT_DELETE': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400', icon: Trash2 },
    'DOCUMENT_STATUS': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', icon: Eye },
    'ALERT_CREATE': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', icon: ShieldAlert },
    'ALERT_REMOVE': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', icon: ShieldAlert },
    'PLAN_UPDATE': { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400', icon: Layers },
    'SETTINGS_UPDATE': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', icon: Settings },
    'OTHER': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', icon: Activity },
};

export default function AdminActivityPage() {
    const { logs, isAdmin } = useActivityLog();
    const { user } = useUser();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = React.useState("");
    const [filterAction, setFilterAction] = React.useState<string>("all");
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 50;

    // Security check: only moslem.gouia@mae.tn can see this
    React.useEffect(() => {
        if (user?.email && !isAdmin(user.email)) {
            router.push("/dashboard");
        }
    }, [user?.email, isAdmin, router]);

    if (!user?.email || !isAdmin(user.email)) return null;

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.module.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesAction = filterAction === "all" || log.action === filterAction;

        return matchesSearch && matchesAction;
    });

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/settings">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <Activity className="h-8 w-8 text-primary" />
                            Journal d'Activité
                        </h1>
                        <p className="text-muted-foreground">Audit complet des actions et modifications effectuées sur la plateforme.</p>
                    </div>
                </div>
                <Button variant="outline" className="gap-2 font-bold border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100">
                    <Download className="h-4 w-4" />
                    Exporter CSV
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par utilisateur, action ou module..."
                        className="pl-10 h-11 rounded-xl shadow-sm border-slate-200"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <div className="flex gap-2">
                    <Badge variant="secondary" className="h-11 px-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <select
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 outline-none"
                            value={filterAction}
                            onChange={(e) => {
                                setFilterAction(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="all">Toutes les actions</option>
                            <option value="LOGIN">Connexions</option>
                            <option value="RISK_ADD">Ajouts Risques</option>
                            <option value="RISK_EDIT">Modifs Risques</option>
                            <option value="RISK_DELETE">Suppressions Risques</option>
                            <option value="ALERT_CREATE">Alertes Créées</option>
                            <option value="ALERT_REMOVE">Alertes Suppr</option>
                            <option value="PLAN_UPDATE">Modifs Plan</option>
                            <option value="SETTINGS_UPDATE">Paramètres</option>
                            <option value="DOCUMENT_EDIT">Modifs Documents</option>
                        </select>
                    </Badge>
                </div>
            </div>

            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-transparent border-slate-200">
                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-4">Utilisateur</TableHead>
                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-4">Action</TableHead>
                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-4">Description</TableHead>
                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-4 text-center">Date & Heure</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentLogs.length > 0 ? (
                            currentLogs.map((log) => {
                                const style = actionColors[log.action] || actionColors.OTHER;
                                const ActionIcon = style.icon;
                                return (
                                    <TableRow key={log.id} className="hover:bg-slate-50/80 transition-colors border-slate-100 group">
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                                                    <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-xs">
                                                        {getInitials(log.userName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{log.userName}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{log.userEmail}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Badge className={cn("rounded-lg px-2.5 py-1 gap-1.5 border-none shadow-sm font-bold text-[10px] uppercase tracking-tighter", style.bg, style.text)}>
                                                <ActionIcon className="h-3 w-3" />
                                                {log.action.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-700">{log.label}</span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Badge variant="outline" className="text-[10px] font-bold text-slate-400 border-slate-200 py-0">
                                                        {log.module}
                                                    </Badge>
                                                    {log.detail && (
                                                        <span className="text-[10px] text-slate-400 italic">({log.detail})</span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-black text-slate-600">
                                                    {format(new Date(log.timestamp), 'HH:mm:ss', { locale: fr })}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-semibold">
                                                    {format(new Date(log.timestamp), 'dd MMM yyyy', { locale: fr })}
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                                        <Activity className="h-12 w-12 opacity-20" />
                                        <p className="font-bold italic">Aucune activité trouvée pour ces critères.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {filteredLogs.length > itemsPerPage && (
                <div className="flex items-center justify-between px-2 py-4">
                    <div className="text-sm text-muted-foreground font-medium">
                        Affichage de <span className="font-bold text-slate-900">{Math.min(filteredLogs.length, (currentPage - 1) * itemsPerPage + 1)}</span> à <span className="font-bold text-slate-900">{Math.min(filteredLogs.length, currentPage * itemsPerPage)}</span> sur <span className="font-bold text-slate-900">{filteredLogs.length}</span> activités
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 rounded-lg border-slate-200 hover:bg-slate-50 font-bold gap-1"
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
                                .map((page, index, array) => {
                                    const showEllipsis = index > 0 && page - array[index - 1] > 1;

                                    return (
                                        <React.Fragment key={page}>
                                            {showEllipsis && <span className="px-2 text-slate-400 text-xs">...</span>}
                                            <Button
                                                variant={currentPage === page ? "default" : "outline"}
                                                size="sm"
                                                className={cn(
                                                    "h-9 w-9 rounded-lg p-0 font-bold",
                                                    currentPage === page ? "bg-primary shadow-md hover:bg-primary/90" : "border-slate-200 hover:bg-slate-50"
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
                            className="h-9 px-3 rounded-lg border-slate-200 hover:bg-slate-50 font-bold gap-1"
                            onClick={() => setCurrentPage((prev: number) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Suivant
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-black uppercase text-emerald-800 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Utilisateurs Actifs
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <span className="text-3xl font-black text-emerald-600">
                            {new Set(logs.map((l: ActivityEntry) => l.userEmail)).size}
                        </span>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-black uppercase text-blue-800 flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Actions Total
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <span className="text-3xl font-black text-blue-600">
                            {logs.length}
                        </span>
                    </CardContent>
                </Card>
                <Card className="bg-indigo-50/50 border-indigo-100 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-black uppercase text-indigo-800 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Dernier évènement
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <span className="text-sm font-bold text-indigo-600 block truncate">
                            {logs[0] ? logs[0].label : 'N/A'}
                        </span>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

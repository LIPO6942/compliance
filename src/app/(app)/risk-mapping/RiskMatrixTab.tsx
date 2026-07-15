"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Globe, MapPin, Package, Layers, Grid, Users, Landmark,
  Download, FileText, History, CheckCircle2, Clock, Save, Plus, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PHYS_PROFESSIONS_DATA from "./professions_data.json";
import { useActivityLog } from "@/contexts/ActivityLogContext";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useMatrixConfig, DEFAULT_KYC_FACTORS, type KycFactor } from "@/contexts/MatrixConfigContext";
import ExcelJS from "exceljs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";



// Risk Level Thresholds
const RISK_LEVELS = [
  { label: "Risque Élevé (RE)", range: "≥ 70%", color: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-300" },
  { label: "Risque Moyen (RM)", range: "≥ 50%, < 70%", color: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-300" },
  { label: "Risque Faible (RF)", range: "< 50%", color: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300" }
];

// ── 1. Pays ──
const COUNTRIES_DATA = [
  { numeric: 4, alpha3: "AFG", name: "Afghanistan", gafi: false, corruption: true, oecd: false, terrorism: true, other: "", risk: "RE" },
  { numeric: 8, alpha3: "ALB", name: "Albanie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 10, alpha3: "ATA", name: "Antarctique", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 12, alpha3: "DZA", name: "Algérie", gafi: true, corruption: false, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 16, alpha3: "ASM", name: "Samoa américaines", gafi: false, corruption: false, oecd: true, terrorism: false, other: "", risk: "RM" },
  { numeric: 20, alpha3: "AND", name: "Andorre", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 24, alpha3: "AGO", name: "Angola", gafi: true, corruption: false, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 28, alpha3: "ATG", name: "Antigua-et-Barbuda", gafi: false, corruption: false, oecd: true, terrorism: false, other: "", risk: "RM" },
  { numeric: 31, alpha3: "AZE", name: "Azerbaïdjan", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 32, alpha3: "ARG", name: "Argentine", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 36, alpha3: "AUS", name: "Australie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 40, alpha3: "AUT", name: "Autriche", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 44, alpha3: "BHS", name: "Bahamas", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 48, alpha3: "BHR", name: "Bahreïn", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 50, alpha3: "BGD", name: "Bangladesh", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 51, alpha3: "ARM", name: "Arménie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 52, alpha3: "BRB", name: "Barbade", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 56, alpha3: "BEL", name: "Belgique", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 60, alpha3: "BMU", name: "Bermudes", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 64, alpha3: "BTN", name: "Bhoutan", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 68, alpha3: "BOL", name: "Bolivie", gafi: true, corruption: true, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 70, alpha3: "BIH", name: "Bosnie-Herzégovine", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 72, alpha3: "BWA", name: "Botswana", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 74, alpha3: "BVT", name: "Ile Bouvet", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 76, alpha3: "BRA", name: "Brésil", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 84, alpha3: "BLZ", name: "Belize", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 86, alpha3: "IOT", name: "Territoire britannique de l’Océan Indien", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 90, alpha3: "SLB", name: "Iles Salomon", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 92, alpha3: "VGB", name: "British Virgin Islands", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 96, alpha3: "BRN", name: "Brunei Darussalam", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 100, alpha3: "BGR", name: "Bulgarie", gafi: true, corruption: false, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 104, alpha3: "MMR", name: "Myanmar", gafi: true, corruption: true, oecd: false, terrorism: true, other: "", risk: "RE" },
  { numeric: 108, alpha3: "BDI", name: "Burundi", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 112, alpha3: "BLR", name: "Biélorussie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 116, alpha3: "KHM", name: "Cambodge", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 120, alpha3: "CMR", name: "Cameroun", gafi: true, corruption: true, oecd: false, terrorism: true, other: "", risk: "RE" },
  { numeric: 124, alpha3: "CAN", name: "Canada", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 132, alpha3: "CPV", name: "Cap-Vert", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 136, alpha3: "CYM", name: "Iles Cayman", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 140, alpha3: "CAF", name: "République centrafricaine", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 144, alpha3: "LKA", name: "Sri Lanka", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 148, alpha3: "TCD", name: "Tchad", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 152, alpha3: "CHL", name: "Chili", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 156, alpha3: "CHN", name: "Chine", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 158, alpha3: "TWN", name: "Taiwan", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 162, alpha3: "CXR", name: "Ile Christmas", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 166, alpha3: "CCK", name: "Iles Cocos", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 170, alpha3: "COL", name: "Colombie", gafi: false, corruption: false, oecd: false, terrorism: true, other: "", risk: "RM" },
  { numeric: 174, alpha3: "COM", name: "Comores", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 175, alpha3: "MYT", name: "Mayotte", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 178, alpha3: "COG", name: "République du Congo", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 180, alpha3: "COD", name: "République démocratique du Congo", gafi: true, corruption: true, oecd: false, terrorism: true, other: "", risk: "RE" },
  { numeric: 184, alpha3: "COK", name: "Iles Cook", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 188, alpha3: "CRI", name: "Costa Rica", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 191, alpha3: "HRV", name: "Croatie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 192, alpha3: "CUB", name: "Cuba", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 196, alpha3: "CYP", name: "Chypre", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 203, alpha3: "CZE", name: "République tchèque", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 204, alpha3: "BEN", name: "Bénin", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 208, alpha3: "DNK", name: "Danemark", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 212, alpha3: "DMA", name: "Dominique", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 214, alpha3: "DOM", name: "République dominicaine", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 218, alpha3: "ECU", name: "Equateur", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 222, alpha3: "SLV", name: "Salvador", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 226, alpha3: "GNQ", name: "Guinée équatoriale", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 231, alpha3: "ETH", name: "Ethiopie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 232, alpha3: "ERI", name: "Erythrée", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 233, alpha3: "EST", name: "Estonie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 234, alpha3: "FRO", name: "Iles Féroé", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 238, alpha3: "FLK", name: "Iles Falkland", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 239, alpha3: "SGS", name: "Géorgie du Sud et les îles Sandwich du Sud", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 242, alpha3: "FJI", name: "Fidji", gafi: false, corruption: false, oecd: true, terrorism: false, other: "", risk: "RM" },
  { numeric: 246, alpha3: "FIN", name: "Finlande", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 248, alpha3: "ALA", name: "Iles Åland", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 250, alpha3: "FRA", name: "France", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 254, alpha3: "GUF", name: "Guyane française", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 258, alpha3: "PYF", name: "Polynésie française", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 260, alpha3: "ATF", name: "Terres australes et antarctiques françaises", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 262, alpha3: "DJI", name: "Djibouti", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 266, alpha3: "GAB", name: "Gabon", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 268, alpha3: "GEO", name: "Géorgie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 270, alpha3: "GMB", name: "Gambie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 275, alpha3: "PSE", name: "Palestine", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 276, alpha3: "DEU", name: "Allemagne", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 288, alpha3: "GHA", name: "Ghana", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 292, alpha3: "GIB", name: "Gibraltar", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 296, alpha3: "KIR", name: "Kiribati", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 300, alpha3: "GRC", name: "Grèce", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 304, alpha3: "GRL", name: "Groenland", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 308, alpha3: "GRD", name: "Grenade", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 312, alpha3: "GLP", name: "Guadeloupe", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 316, alpha3: "GUM", name: "Guam", gafi: false, corruption: false, oecd: true, terrorism: false, other: "", risk: "RM" },
  { numeric: 320, alpha3: "GTM", name: "Guatemala", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 324, alpha3: "GIN", name: "Guinée", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 328, alpha3: "GUY", name: "Guyane", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 332, alpha3: "HTI", name: "Haïti", gafi: true, corruption: true, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 334, alpha3: "HMD", name: "Iles Heard-et-MacDonald", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 336, alpha3: "VAT", name: "Saint-Siège (Vatican)", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 340, alpha3: "HND", name: "Honduras", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 344, alpha3: "HKG", name: "Hong Kong", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 348, alpha3: "HUN", name: "Hongrie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 352, alpha3: "ISL", name: "Islande", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 356, alpha3: "IND", name: "Inde", gafi: false, corruption: false, oecd: false, terrorism: true, other: "", risk: "RM" },
  { numeric: 360, alpha3: "IDN", name: "Indonésie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 364, alpha3: "IRN", name: "Iran", gafi: true, corruption: true, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 368, alpha3: "IRQ", name: "Irak", gafi: false, corruption: false, oecd: false, terrorism: true, other: "", risk: "RM" },
  { numeric: 372, alpha3: "IRL", name: "Irlande", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 376, alpha3: "ISR", name: "Israël", gafi: false, corruption: false, oecd: false, terrorism: true, other: "Situation politique", risk: "RE" },
  { numeric: 380, alpha3: "ITA", name: "Italie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 384, alpha3: "CIV", name: "Côte d’Ivoire", gafi: true, corruption: false, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 388, alpha3: "JAM", name: "Jamaïque", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 392, alpha3: "JPN", name: "Japon", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 398, alpha3: "KAZ", name: "Kazakhstan", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 400, alpha3: "JOR", name: "Jordanie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 404, alpha3: "KEN", name: "Kenya", gafi: true, corruption: false, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 408, alpha3: "PRK", name: "Corée du Nord", gafi: true, corruption: true, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 410, alpha3: "KOR", name: "Corée du Sud", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 414, alpha3: "KWT", name: "Koweït", gafi: true, corruption: false, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 417, alpha3: "KGZ", name: "Kirghizistan", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 418, alpha3: "LAO", name: "Laos", gafi: true, corruption: true, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 422, alpha3: "LBN", name: "Liban", gafi: true, corruption: true, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 426, alpha3: "LSO", name: "Lesotho", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 428, alpha3: "LVA", name: "Lettonie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 430, alpha3: "LBR", name: "Libéria", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 434, alpha3: "LBY", name: "Libye", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 438, alpha3: "LIE", name: "Liechtenstein", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 440, alpha3: "LTU", name: "Lituanie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 442, alpha3: "LUX", name: "Luxembourg", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 446, alpha3: "MAC", name: "Macao", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 450, alpha3: "MDG", name: "Madagascar", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 454, alpha3: "MWI", name: "Malawi", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 458, alpha3: "MYS", name: "Malaisie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 462, alpha3: "MDV", name: "Maldives", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 466, alpha3: "MLI", name: "Mali", gafi: false, corruption: true, oecd: false, terrorism: true, other: "", risk: "RE" },
  { numeric: 470, alpha3: "MLT", name: "Malte", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 474, alpha3: "MTQ", name: "Martinique", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 478, alpha3: "MRT", name: "Mauritanie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 480, alpha3: "MUS", name: "Maurice", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 484, alpha3: "MEX", name: "Mexique", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 492, alpha3: "MCO", name: "Monaco", gafi: true, corruption: false, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 496, alpha3: "MNG", name: "Mongolie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 498, alpha3: "MDA", name: "Moldavie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 499, alpha3: "MNE", name: "Monténégro", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 500, alpha3: "MSR", name: "Montserrat", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 504, alpha3: "MAR", name: "Maroc", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 508, alpha3: "MOZ", name: "Mozambique", gafi: false, corruption: true, oecd: false, terrorism: true, other: "", risk: "RE" },
  { numeric: 512, alpha3: "OMN", name: "Oman", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 516, alpha3: "NAM", name: "Namibie", gafi: true, corruption: false, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 520, alpha3: "NRU", name: "Nauru", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 524, alpha3: "NPL", name: "Népal", gafi: true, corruption: false, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 528, alpha3: "NLD", name: "Pays-Bas", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 533, alpha3: "ABW", name: "Aruba", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 534, alpha3: "SXM", name: "Saint-Martin (Pays-Bas)", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 540, alpha3: "NCL", name: "Nouvelle-Calédonie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 548, alpha3: "VUT", name: "Vanuatu", gafi: false, corruption: false, oecd: true, terrorism: false, other: "", risk: "RM" },
  { numeric: 554, alpha3: "NZL", name: "Nouvelle-Zélande", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 558, alpha3: "NIC", name: "Nicaragua", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 562, alpha3: "NER", name: "Niger", gafi: false, corruption: false, oecd: false, terrorism: true, other: "Situation politique", risk: "RE" },
  { numeric: 566, alpha3: "NGA", name: "Nigeria", gafi: false, corruption: true, oecd: false, terrorism: true, other: "", risk: "RE" },
  { numeric: 570, alpha3: "NIU", name: "Niue", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 574, alpha3: "NFK", name: "Ile Norfolk", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 578, alpha3: "NOR", name: "Norvège", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 580, alpha3: "MNP", name: "Iles Mariannes du Nord", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 581, alpha3: "UMI", name: "Iles mineures éloignées des Etats-Unis", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 583, alpha3: "FSM", name: "Micronésie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 584, alpha3: "MHL", name: "Iles Marshall", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 585, alpha3: "PLW", name: "Palau", gafi: false, corruption: false, oecd: true, terrorism: false, other: "", risk: "RM" },
  { numeric: 586, alpha3: "PAK", name: "Pakistan", gafi: false, corruption: true, oecd: false, terrorism: true, other: "", risk: "RE" },
  { numeric: 591, alpha3: "PAN", name: "Panama", gafi: false, corruption: false, oecd: true, terrorism: false, other: "", risk: "RE" },
  { numeric: 598, alpha3: "PNG", name: "Papouasie-Nouvelle-Guinée", gafi: true, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 600, alpha3: "PRY", name: "Paraguay", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 604, alpha3: "PER", name: "Pérou", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 608, alpha3: "PHL", name: "Philippines", gafi: true, corruption: false, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 612, alpha3: "PCN", name: "Pitcairn", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 616, alpha3: "POL", name: "Pologne", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 620, alpha3: "PRT", name: "Portugal", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 624, alpha3: "GNB", name: "Guinée-Bissau", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 626, alpha3: "TLS", name: "Timor-Leste", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 630, alpha3: "PRI", name: "Puerto Rico", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 634, alpha3: "QAT", name: "Qatar", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 638, alpha3: "REU", name: "Réunion", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 642, alpha3: "ROU", name: "Roumanie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 643, alpha3: "RUS", name: "Russie", gafi: false, corruption: true, oecd: true, terrorism: false, other: "", risk: "RE" },
  { numeric: 646, alpha3: "RWA", name: "Rwanda", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 652, alpha3: "BLM", name: "Saint-Barthélemy", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 654, alpha3: "SHN", name: "Sainte-Hélène", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 659, alpha3: "KNA", name: "Saint-Kitts-et-Nevis", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 660, alpha3: "AIA", name: "Anguilla", gafi: false, corruption: false, oecd: true, terrorism: false, other: "", risk: "RM" },
  { numeric: 662, alpha3: "LCA", name: "Sainte-Lucie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 663, alpha3: "MAF", name: "Saint-Martin (partie française)", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 666, alpha3: "SPM", name: "Saint-Pierre-et-Miquelon", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 670, alpha3: "VCT", name: "Saint-Vincent-et-les Grenadines", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 674, alpha3: "SMR", name: "Saint-Marin", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 678, alpha3: "STP", name: "Sao Tomé-et-Principe", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 682, alpha3: "SAU", name: "Arabie Saoudite", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 686, alpha3: "SEN", name: "Sénégal", gafi: false, corruption: false, oecd: false, terrorism: false, other: "Situation politique", risk: "RM" },
  { numeric: 688, alpha3: "SRB", name: "Serbie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 690, alpha3: "SYC", name: "Seychelles", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 694, alpha3: "SLE", name: "Sierra Leone", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 702, alpha3: "SGP", name: "Singapour", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 703, alpha3: "SVK", name: "Slovaquie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 704, alpha3: "VNM", name: "Viêt Nam", gafi: true, corruption: false, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 705, alpha3: "SVN", name: "Slovénie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 706, alpha3: "SOM", name: "Somalie", gafi: false, corruption: true, oecd: false, terrorism: true, other: "", risk: "RE" },
  { numeric: 710, alpha3: "ZAF", name: "Afrique du Sud", gafi: true, corruption: false, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 716, alpha3: "ZWE", name: "Zimbabwe", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 724, alpha3: "ESP", name: "Espagne", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 728, alpha3: "SSD", name: "Sud-Soudan", gafi: true, corruption: true, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 732, alpha3: "ESH", name: "Sahara occidental", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 736, alpha3: "SDN", name: "Soudan", gafi: false, corruption: true, oecd: false, terrorism: true, other: "Situation politique", risk: "RE" },
  { numeric: 740, alpha3: "SUR", name: "Suriname", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 744, alpha3: "SJM", name: "Svalbard et Jan Mayen", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 748, alpha3: "SWZ", name: "Swaziland", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 752, alpha3: "SWE", name: "Suède", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 756, alpha3: "CHE", name: "Suisse", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 760, alpha3: "SYR", name: "Syrie", gafi: true, corruption: true, oecd: false, terrorism: true, other: "", risk: "RE" },
  { numeric: 762, alpha3: "TJK", name: "Tadjikistan", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 764, alpha3: "THA", name: "Thaïlande", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 768, alpha3: "TGO", name: "Togo", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 772, alpha3: "TKL", name: "Tokelau", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 776, alpha3: "TON", name: "Tonga", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 780, alpha3: "TTO", name: "Trinité-et-Tobago", gafi: false, corruption: false, oecd: true, terrorism: false, other: "", risk: "RM" },
  { numeric: 784, alpha3: "ARE", name: "Emirats Arabes Unis", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 788, alpha3: "TUN", name: "Tunisie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 792, alpha3: "TUR", name: "Turquie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 795, alpha3: "TKM", name: "Turkménistan", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 796, alpha3: "TCA", name: "Iles Turques-et-Caïques", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 798, alpha3: "TUV", name: "Tuvalu", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 800, alpha3: "UGA", name: "Ouganda", gafi: false, corruption: true, oecd: false, terrorism: false, other: "", risk: "RM" },
  { numeric: 804, alpha3: "UKR", name: "Ukraine", gafi: false, corruption: false, oecd: false, terrorism: false, other: "Situation politique", risk: "RE" },
  { numeric: 807, alpha3: "MKD", name: "Macédoine", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 818, alpha3: "EGY", name: "Egypte", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 826, alpha3: "GBR", name: "Royaume-Uni", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 831, alpha3: "GGY", name: "Guernesey", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 832, alpha3: "JEY", name: "Jersey", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 833, alpha3: "IMN", name: "Ile de Man", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 834, alpha3: "TZA", name: "Tanzanie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 840, alpha3: "USA", name: "Etats-Unis", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 850, alpha3: "VIR", name: "Iles Vierges américaines", gafi: true, corruption: false, oecd: true, terrorism: false, other: "", risk: "RE" },
  { numeric: 854, alpha3: "BFA", name: "Burkina Faso", gafi: true, corruption: false, oecd: false, terrorism: true, other: "Situation politique", risk: "RE" },
  { numeric: 858, alpha3: "URY", name: "Uruguay", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 860, alpha3: "UZB", name: "Ouzbékistan", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 862, alpha3: "VEN", name: "Venezuela", gafi: true, corruption: true, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 876, alpha3: "WLF", name: "Wallis-et-Futuna", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" },
  { numeric: 882, alpha3: "WSM", name: "Samoa", gafi: false, corruption: false, oecd: true, terrorism: false, other: "", risk: "RM" },
  { numeric: 887, alpha3: "YEM", name: "Yémen", gafi: true, corruption: true, oecd: false, terrorism: false, other: "", risk: "RE" },
  { numeric: 894, alpha3: "ZMB", name: "Zambie", gafi: false, corruption: false, oecd: false, terrorism: false, other: "", risk: "RF" }
];

// ── 2. Gouvernorats ──
const GOVERNORATES_DATA = [
  { id: 1000, name: "Tunis", nameAr: "تونس", border: false, port: false, airport: true, market: false, other: "", risk: "RM" },
  { id: 2080, name: "Ariana", nameAr: "أريانة", border: false, port: false, airport: true, market: false, other: "", risk: "RM" },
  { id: 2013, name: "Ben Arous", nameAr: "بن عروس", border: false, port: true, airport: false, market: false, other: "", risk: "RM" },
  { id: 2010, name: "La Manouba", nameAr: "منوبة", border: false, port: false, airport: false, market: false, other: "", risk: "RF" },
  { id: 8000, name: "Nabeul", nameAr: "نابل", border: false, port: false, airport: false, market: false, other: "", risk: "RF" },
  { id: 1100, name: "Zaghouan", nameAr: "زغوان", border: false, port: false, airport: false, market: false, other: "", risk: "RF" },
  { id: 7000, name: "Bizerte", nameAr: "بنزرت", border: false, port: true, airport: false, market: false, other: "", risk: "RM" },
  { id: 9000, name: "Béja", nameAr: "باجة", border: false, port: false, airport: false, market: false, other: "", risk: "RF" },
  { id: 8100, name: "Jendouba", nameAr: "جندوبة", border: true, port: false, airport: false, market: false, other: "", risk: "RE" },
  { id: 7100, name: "Le Kef", nameAr: "الكاف", border: true, port: false, airport: false, market: false, other: "", risk: "RE" },
  { id: 6100, name: "Siliana", nameAr: "سليانة", border: false, port: false, airport: false, market: false, other: "", risk: "RF" },
  { id: 4000, name: "Sousse", nameAr: "سousse", border: false, port: true, airport: false, market: false, other: "", risk: "RM" },
  { id: 5000, name: "Monastir", nameAr: "المنستير", border: false, port: false, airport: true, market: false, other: "", risk: "RM" },
  { id: 5100, name: "Mahdia", nameAr: "المهدية", border: false, port: false, airport: false, market: true, other: "", risk: "RM" },
  { id: 3000, name: "Sfax", nameAr: "صفاقس", border: false, port: true, airport: true, market: false, other: "", risk: "RM" },
  { id: 3100, name: "Kairouan", nameAr: "القيروان", border: false, port: false, airport: false, market: false, other: "", risk: "RF" },
  { id: 1253, name: "Kasserine", nameAr: "القصرين", border: true, port: false, airport: false, market: false, other: "", risk: "RE" },
  { id: 9100, name: "Sidi Bouzid", nameAr: "سيدي بوزيد", border: false, port: false, airport: false, market: false, other: "Terrorisme (Chaambi/Mghilla)", risk: "RM" },
  { id: 6000, name: "Gabès", nameAr: "قابس", border: false, port: false, airport: false, market: false, other: "", risk: "RF" },
  { id: 4100, name: "Médenine", nameAr: "مدنين", border: true, port: false, airport: false, market: false, other: "", risk: "RE" },
  { id: 3200, name: "Tataouine", nameAr: "تطاوين", border: true, port: false, airport: false, market: false, other: "", risk: "RE" },
  { id: 2100, name: "Gafsa", nameAr: "قفصة", border: true, port: false, airport: false, market: false, other: "", risk: "RE" },
  { id: 2200, name: "Tozeur", nameAr: "توزر", border: true, port: false, airport: false, market: false, other: "", risk: "RE" },
  { id: 4200, name: "Kébili", nameAr: "قبلي", border: true, port: false, airport: false, market: false, other: "", risk: "RE" }
];

// ── 3. Produits ──
const PRODUCTS_DATA = [
  { code: 1, name: "Assurance Automobile", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "" },
  { code: 2, name: "Multirisques Habitation", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "Indicateur AML: Capital assuré" },
  { code: 3, name: "Multirisques Artisans & Libéraux", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "Indicateur AML: Capital assuré" },
  { code: 4, name: "Responsabilité Civile", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "" },
  { code: 5, name: "Accidents Corporels Individuels", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "" },
  { code: 6, name: "Assurance Assistance Auto Gold", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "" },
  { code: 7, name: "Assurance Assistance à l'Etranger", liquid: false, forex: true, highValue: false, fraud: false, cap: false, risk: "RM", comment: "Selon montants et modalités de remboursement" },
  { code: 8, name: "Assurance Assistance Domiciliaire", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "" },
  { code: 9, name: "Assurance Assistance Etudiant", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "" },
  { code: 10, name: "Assurance Incendie", liquid: false, forex: false, highValue: true, fraud: false, cap: false, risk: "RM", comment: "" },
  { code: 11, name: "Assurance Vol", liquid: false, forex: false, highValue: true, fraud: false, cap: false, risk: "RM", comment: "" },
  { code: 12, name: "Assurance Dégâts des Eaux", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "" },
  { code: 13, name: "Assurance Bris de Glaces", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "" },
  { code: 14, name: "Multirisques Informatiques", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "" },
  { code: 15, name: "Matériels Electroniques", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "" },
  { code: 16, name: "Bris de Machines", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "" },
  { code: 17, name: "Tous Risques Chantier", liquid: false, forex: false, highValue: true, fraud: false, cap: false, risk: "RM", comment: "" },
  { code: 18, name: "Engin de Chantier", liquid: false, forex: false, highValue: true, fraud: false, cap: false, risk: "RM", comment: "Vu la valeur élevée du capital assuré" },
  { code: 19, name: "Maritime sur Facultés", liquid: false, forex: false, highValue: true, fraud: false, cap: false, risk: "RM", comment: "" },
  { code: 20, name: "Maritime Corps de Plaisance", liquid: false, forex: false, highValue: true, fraud: true, cap: false, risk: "RE", comment: "Capital assuré élevé + aisance de provocation de sinistre" },
  { code: 21, name: "Assurance Groupe Maladie", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "" },
  { code: 22, name: "Assurance Epargne Collective", liquid: false, forex: false, highValue: true, fraud: false, cap: false, risk: "RM", comment: "" },
  { code: 23, name: "Assurance Epargne Etudes", liquid: false, forex: false, highValue: true, fraud: false, cap: true, risk: "RE", comment: "" },
  { code: 24, name: "Assurance Epargne Individuelle", liquid: false, forex: false, highValue: true, fraud: false, cap: true, risk: "RE", comment: "" },
  { code: 25, name: "Assurance Mixte", liquid: false, forex: false, highValue: true, fraud: false, cap: true, risk: "RE", comment: "" },
  { code: 26, name: "Assurance Prévoyance", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "" },
  { code: 27, name: "Temporaire Décès (Couverture Prêt)", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "" },
  { code: 28, name: "Assurance SAHTEK", liquid: false, forex: false, highValue: false, fraud: false, cap: false, risk: "RF", comment: "" }
];

// ── 4. Distribution & Techniques ──
const DISTRIBUTION_DATA = [
  { code: "1.0", name: "Agent", complex: false, nonCompliance: false, noCulture: false, risk: "RF", comment: "" },
  { code: "2.0", name: "Agent général", complex: false, nonCompliance: true, noCulture: false, risk: "RM", comment: "" },
  { code: "3.0", name: "Courtier", complex: true, nonCompliance: true, noCulture: false, risk: "RE", comment: "" },
  { code: "4.0", name: "Succursale Digitale", complex: true, nonCompliance: true, noCulture: false, risk: "RE", comment: "" }
];

const SALES_TECHNIQUES_DATA = [
  { code: 1, name: "Présentielle (Contact direct)", noContact: false, noOriginals: false, risk: "RF", comment: "" },
  { code: 2, name: "À distance", noContact: true, noOriginals: true, risk: "RE", comment: "" },
  { code: 3, name: "Banque-assurances", noContact: true, noOriginals: true, risk: "RE", comment: "" },
  { code: 4, name: "La Poste Tunisienne", noContact: true, noOriginals: true, risk: "RE", comment: "" }
];

// ── 5. Activité P Morales ──
const MORAL_ACTIVITIES_DATA = [
  { code: "1.0", name: "Société de commerce internationale", cash: false, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RM", comment: "" },
  { code: "2.0", name: "Construction & BTP", cash: false, objects: true, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "3.0", name: "Associations (OBNL)", cash: false, objects: false, volume: false, noInfo: true, complexEval: false, intermediary: true, corruption: false, risk: "RE", comment: "Soumis à la fiche OBNL" },
  { code: "4.0", name: "Partis politiques", cash: false, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE", comment: "PPE / OBNL" },
  { code: "5.0", name: "Activités commerciales", cash: false, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RM", comment: "" },
  { code: "6.0", name: "Activités de transport", cash: false, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RM", comment: "" },
  { code: "7.0", name: "Activités de services", cash: false, objects: false, volume: false, noInfo: false, complexEval: true, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "8.0", name: "Activités agricoles et artisanales", cash: true, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "9.0", name: "Administration publique", cash: false, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: true, corruption: true, risk: "RE", comment: "" },
  { code: "10.0", name: "Sociétés cotées en bourse", cash: true, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RM", comment: "" },
  { code: "11.0", name: "Construction juridique (Trusts...)", cash: false, objects: false, volume: false, noInfo: true, complexEval: true, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "12.0", name: "Casinos & Jeux de hasard", cash: true, objects: false, volume: false, noInfo: false, complexEval: true, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "13.0", name: "Paiement électronique (IP)", cash: false, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RM", comment: "" },
  { code: "14.0", name: "Sociétés de Start-up", cash: false, objects: false, volume: false, noInfo: false, complexEval: true, intermediary: false, corruption: false, risk: "RM", comment: "" },
  { code: "15.0", name: "Bureaux de change", cash: true, objects: false, volume: false, noInfo: false, complexEval: true, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "16.0", name: "Tourisme (Aérien, Voyages, Hôtels)", cash: true, objects: false, volume: true, noInfo: false, complexEval: true, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "17.0", name: "Concessionnaires voitures de luxe", cash: true, objects: true, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "18.0", name: "Agences de location de voitures", cash: true, objects: true, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "19.0", name: "Sociétés privées Off-shore", cash: false, objects: false, volume: true, noInfo: true, complexEval: true, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "20.0", name: "Éducation privée, Crèches", cash: true, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RM", comment: "" },
  { code: "21.0", name: "Salons de thé & Restauration", cash: true, objects: false, volume: true, noInfo: false, complexEval: true, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "22.0", name: "Marchands de journaux", cash: true, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RF", comment: "" },
  { code: "23.0", name: "Salons de coiffure & Fitness", cash: true, objects: false, volume: false, noInfo: false, complexEval: true, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "24.0", name: "Vendeurs de bateaux de plaisance", cash: false, objects: true, volume: false, noInfo: false, complexEval: true, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "25.0", name: "Banques", cash: true, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "26.0", name: "Sociétés de valeurs mobilières", cash: false, objects: true, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "27.0", name: "Sociétés de leasing", cash: true, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "28.0", name: "Sociétés d'assurance", cash: true, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RM", comment: "" },
  { code: "29.0", name: "Sociétés de micro-crédit", cash: true, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "30.0", name: "Poste", cash: true, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "31.0", name: "Joaillerie & Bijouterie de luxe", cash: true, objects: true, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE", comment: "" },
  { code: "32.0", name: "Cabinet d'expertise comptable", cash: false, objects: false, volume: true, noInfo: false, complexEval: true, intermediary: true, corruption: false, risk: "RE", comment: "" },
  { code: "33.0", name: "Cabinet d'avocat", cash: false, objects: false, volume: true, noInfo: false, complexEval: true, intermediary: true, corruption: false, risk: "RE", comment: "" },
  { code: "34.0", name: "Cabinet de comptabilité", cash: false, objects: false, volume: false, noInfo: false, complexEval: true, intermediary: true, corruption: false, risk: "RE", comment: "" },
  { code: "35.0", name: "Cabinet de conseil fiscal", cash: false, objects: false, volume: false, noInfo: false, complexEval: true, intermediary: true, corruption: false, risk: "RE", comment: "" },
  { code: "36.0", name: "Agences immobilières", cash: false, objects: true, volume: false, noInfo: false, complexEval: false, intermediary: true, corruption: false, risk: "RE", comment: "" },
  { code: "37.0", name: "Promotion immobilière", cash: false, objects: true, volume: true, noInfo: false, complexEval: false, intermediary: true, corruption: false, risk: "RE", comment: "" },
  { code: "38.0", name: "Institutions financières", cash: true, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: true, corruption: false, risk: "RE", comment: "" },
  { code: "39.0", name: "Autres activités inconnues", cash: false, objects: false, volume: false, noInfo: true, complexEval: true, intermediary: false, corruption: false, risk: "RE", comment: "" }
];

// PHYS_PROFESSIONS_DATA imported from professions_data.json

export function RiskMatrixTab() {
  const { logAction } = useActivityLog();
  const { user } = useUser();
  const { toast } = useToast();
  const {
    kycFactors,
    kycHistory,
    overrides,
    customItems,
    deletedItems,
    addCustomItem,
    removeCustomItem,
    loading: matrixLoading,
    updateFactor: ctxUpdateFactor,
    resetFactors: ctxResetFactors,
    updateOverride,
    resetOverrides
  } = useMatrixConfig();

  const [subTab, setSubTab] = React.useState<"params" | "countries" | "govs" | "products" | "dist" | "moral" | "physical">("params");
  
  // State for Add Item Modal
  const [addItemModalOpen, setAddItemModalOpen] = React.useState(false);
  const [addItemCategory, setAddItemCategory] = React.useState<'dist' | 'sale' | 'moral' | 'profession' | null>(null);
  const [newItemData, setNewItemData] = React.useState({
    code: "",
    name: "",
    domain: "", // only for profession
    complex: false,
    nonCompliance: false,
    noCulture: false,
    cash: false,
    objects: false,
    volume: false,
    noInfo: false,
    complexEval: false,
    intermediary: false,
    corruption: false,
    noContact: false,
    noOriginals: false
  });

  const handleOpenAddModal = (category: 'dist' | 'sale' | 'moral' | 'profession') => {
    setAddItemCategory(category);
    setNewItemData({
      code: "",
      name: "",
      domain: "",
      complex: false,
      nonCompliance: false,
      noCulture: false,
      cash: false,
      objects: false,
      volume: false,
      noInfo: false,
      complexEval: false,
      intermediary: false,
      corruption: false,
      noContact: false,
      noOriginals: false
    });
    setAddItemModalOpen(true);
  };

  const handleAddSubmit = async () => {
    if (!addItemCategory) return;
    if (!newItemData.name.trim()) {
      toast({ title: "Erreur", description: "Veuillez saisir un nom.", variant: "destructive" });
      return;
    }
    if ((addItemCategory === 'dist' || addItemCategory === 'sale' || addItemCategory === 'moral') && !newItemData.code.trim()) {
      toast({ title: "Erreur", description: "Veuillez saisir un code.", variant: "destructive" });
      return;
    }
    if (addItemCategory === 'profession' && !newItemData.domain.trim()) {
      toast({ title: "Erreur", description: "Veuillez saisir un domaine / secteur.", variant: "destructive" });
      return;
    }

    let payload: any = {};
    if (addItemCategory === 'dist') {
      payload = {
        code: newItemData.code.trim(),
        name: newItemData.name.trim(),
        complex: newItemData.complex,
        nonCompliance: newItemData.nonCompliance,
        noCulture: newItemData.noCulture,
        risk: 'RF',
        comment: ''
      };
    } else if (addItemCategory === 'sale') {
      payload = {
        code: parseInt(newItemData.code.trim()) || String(newItemData.code.trim()),
        name: newItemData.name.trim(),
        noContact: newItemData.noContact,
        noOriginals: newItemData.noOriginals,
        risk: 'RF',
        comment: ''
      };
    } else if (addItemCategory === 'moral') {
      payload = {
        code: newItemData.code.trim(),
        name: newItemData.name.trim(),
        cash: newItemData.cash,
        objects: newItemData.objects,
        volume: newItemData.volume,
        noInfo: newItemData.noInfo,
        complexEval: newItemData.complexEval,
        intermediary: newItemData.intermediary,
        corruption: newItemData.corruption,
        risk: 'RF',
        comment: ''
      };
    } else if (addItemCategory === 'profession') {
      payload = {
        domain: newItemData.domain.trim(),
        name: newItemData.name.trim(),
        cash: newItemData.cash,
        objects: newItemData.objects,
        volume: newItemData.volume,
        noInfo: newItemData.noInfo,
        complexEval: newItemData.complexEval,
        intermediary: newItemData.intermediary,
        corruption: newItemData.corruption,
        risk: 'RF'
      };
    }

    try {
      await addCustomItem(addItemCategory, payload, authorName);
      toast({ title: "Succès", description: "Élément ajouté avec succès." });
      setAddItemModalOpen(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: "Erreur lors de l'ajout : " + e.message, variant: "destructive" });
    }
  };

  const handleRemoveRequest = async (category: 'dist' | 'sale' | 'moral' | 'profession', key: string, label: string) => {
    if (confirm(`Voulez-vous vraiment retirer l'élément « ${label} » ?`)) {
      try {
        await removeCustomItem(category, key, label, authorName);
        toast({ title: "Succès", description: "Élément retiré avec succès." });
      } catch (e: any) {
        toast({ title: "Erreur", description: "Erreur lors du retrait : " + e.message, variant: "destructive" });
      }
    }
  };

  const [searchQuery, setSearchQuery] = React.useState("");
  const [riskFilter, setRiskFilter] = React.useState<"all" | "RE" | "RM" | "RF">("all");
  const [selectedDomain, setSelectedDomain] = React.useState<string>("all");
  const [factorFilter, setFactorFilter] = React.useState<string>("all");
  const [editingCell, setEditingCell] = React.useState<{ category: OverrideCategory; itemId: string; field: string } | null>(null);
  const [editingText, setEditingText] = React.useState("");
  const [historyOpen, setHistoryOpen] = React.useState(false);

  // Confirmation Modal state
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingChange, setPendingChange] = React.useState<{
    category: 'profession' | 'moral' | 'country' | 'gov' | 'product' | 'dist' | 'sale';
    itemId: string;
    field: string;
    value: boolean;
    itemName: string;
  } | null>(null);

  const authorName = user?.name || user?.email || "Utilisateur";

  const handleSaveComment = async (category: OverrideCategory, itemId: string, field: string, originalVal: string) => {
    if (editingText.trim() === originalVal.trim()) {
      setEditingCell(null);
      return;
    }
    try {
      await updateOverride(category, itemId, field, editingText.trim(), authorName);
      toast({
        title: "✅ Remarque mise à jour",
        description: `Remarque pour « ${itemId} » mise à jour avec succès.`
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Impossible de sauvegarder la remarque : ${err.message}`
      });
    }
    setEditingCell(null);
  };

  const handleToggleRequest = (
    category: 'profession' | 'moral' | 'country' | 'gov' | 'product' | 'dist' | 'sale',
    itemId: string,
    field: string,
    currentValue: boolean,
    itemName: string
  ) => {
    setPendingChange({
      category,
      itemId,
      field,
      value: !currentValue,
      itemName
    });
    setConfirmOpen(true);
  };

  const handleConfirmChange = async () => {
    if (!pendingChange) return;
    const { category, itemId, field, value, itemName } = pendingChange;
    const oldValueStr = !value ? 'Oui' : 'Non (—)';
    const newValueStr = value ? 'Oui' : 'Non (—)';

    await updateOverride(category, itemId, field, value, authorName);

    toast({
      title: "Modification enregistrée",
      description: `« ${itemName} » : paramètre « ${field} » mis à jour.`
    });

    if (user) {
      logAction({
        userEmail: user.email,
        userName: user.name,
        action: "SETTINGS_UPDATE",
        label: `Matrice KYC [${category}] - ${itemName} → ${field}`,
        detail: `${oldValueStr} → ${newValueStr}`,
        module: "Matrice des Risques"
      });
    }

    setConfirmOpen(false);
    setPendingChange(null);
  };

  const updateFactor = async (id: string, field: keyof Omit<KycFactor, 'id' | 'facteur'>, newValue: string) => {
    const factor = kycFactors.find(f => f.id === id);
    if (!factor || factor[field] === newValue) return;
    const oldValue = factor[field];

    await ctxUpdateFactor(id, field, newValue, authorName);

    toast({ title: "Modification enregistrée", description: `Facteur « ${factor.facteur} » mis à jour pour tous les utilisateurs.` });
    if (user) {
      logAction({
        userEmail: user.email,
        userName: user.name,
        action: "SETTINGS_UPDATE",
        label: `Matrice KYC - ${factor.facteur} → ${field}`,
        detail: `${oldValue} → ${newValue}`,
        module: "Matrice des Risques"
      });
    }
  };

  const resetFactors = async () => {
    await ctxResetFactors(authorName);
    toast({ title: "Réinitialisation effectuée", description: "Les valeurs par défaut ont été restaurées pour tous les utilisateurs." });
  };

  const uniqueDomains = React.useMemo(() => {
    const domains = new Set(PHYS_PROFESSIONS_DATA.map(p => p.domain));
    return Array.from(domains).sort();
  }, []);

  // ── Overrides Resolution & Dynamic Risk Calculation ──

  const resolvedCountries = React.useMemo(() => {
    return COUNTRIES_DATA.map((c) => {
      const override = overrides.country[c.name] || {};
      const merged = {
        ...c,
        gafi: override.gafi !== undefined ? override.gafi as boolean : c.gafi,
        corruption: override.corruption !== undefined ? override.corruption as boolean : c.corruption,
        oecd: override.oecd !== undefined ? override.oecd as boolean : c.oecd,
        terrorism: override.terrorism !== undefined ? override.terrorism as boolean : c.terrorism,
        other: override.other !== undefined ? String(override.other) : c.other,
      };
      
      const count = [
        merged.gafi,
        merged.corruption,
        merged.oecd,
        merged.terrorism
      ].filter(Boolean).length;
      
      merged.risk = count >= 2 ? "RE" : count === 1 ? "RM" : "RF";
      return merged;
    });
  }, [overrides.country]);

  const resolvedGovs = React.useMemo(() => {
    return GOVERNORATES_DATA.map((g) => {
      const override = overrides.gov[String(g.id)] || {};
      const merged = {
        ...g,
        border: override.border !== undefined ? override.border as boolean : g.border,
        port: override.port !== undefined ? override.port as boolean : g.port,
        airport: override.airport !== undefined ? override.airport as boolean : g.airport,
        market: override.market !== undefined ? override.market as boolean : g.market,
        other: override.other !== undefined ? String(override.other) : g.other,
      };
      
      const count = [
        merged.border,
        merged.port,
        merged.airport,
        merged.market
      ].filter(Boolean).length;
      
      merged.risk = count >= 2 ? "RE" : count === 1 ? "RM" : "RF";
      return merged;
    });
  }, [overrides.gov]);

  const resolvedProducts = React.useMemo(() => {
    return PRODUCTS_DATA.map((p) => {
      const override = overrides.product[String(p.code)] || {};
      const merged = {
        ...p,
        liquid: override.liquid !== undefined ? override.liquid as boolean : p.liquid,
        forex: override.forex !== undefined ? override.forex as boolean : p.forex,
        highValue: override.highValue !== undefined ? override.highValue as boolean : p.highValue,
        fraud: override.fraud !== undefined ? override.fraud as boolean : p.fraud,
        cap: override.cap !== undefined ? override.cap as boolean : p.cap,
        comment: override.comment !== undefined ? String(override.comment) : p.comment,
      };
      
      const count = [
        merged.liquid,
        merged.forex,
        merged.highValue,
        merged.fraud,
        merged.cap
      ].filter(Boolean).length;
      
      merged.risk = count >= 2 ? "RE" : count === 1 ? "RM" : "RF";
      return merged;
    });
  }, [overrides.product]);

  const resolvedDist = React.useMemo(() => {
    const list = customItems?.dist ? [...customItems.dist] : [];
    const base = DISTRIBUTION_DATA.filter(d => !deletedItems?.dist?.includes(d.code));
    const all = [...base, ...list];
    
    return all.map((d) => {
      const override = overrides.dist[d.code] || {};
      const merged = {
        ...d,
        complex: override.complex !== undefined ? override.complex as boolean : d.complex,
        nonCompliance: override.nonCompliance !== undefined ? override.nonCompliance as boolean : d.nonCompliance,
        noCulture: override.noCulture !== undefined ? override.noCulture as boolean : d.noCulture,
      };
      
      const count = [
        merged.complex,
        merged.nonCompliance,
        merged.noCulture
      ].filter(Boolean).length;
      
      merged.risk = count >= 2 ? "RE" : count === 1 ? "RM" : "RF";
      return merged;
    });
  }, [overrides.dist, customItems?.dist, deletedItems?.dist]);

  const resolvedSales = React.useMemo(() => {
    const list = customItems?.sale ? [...customItems.sale] : [];
    const base = SALES_TECHNIQUES_DATA.filter(s => !deletedItems?.sale?.includes(String(s.code)));
    const all = [...base, ...list];
    
    return all.map((s) => {
      const override = overrides.sale[String(s.code)] || {};
      const merged = {
        ...s,
        noContact: override.noContact !== undefined ? override.noContact as boolean : s.noContact,
        noOriginals: override.noOriginals !== undefined ? override.noOriginals as boolean : s.noOriginals,
      };
      
      const count = [
        merged.noContact,
        merged.noOriginals
      ].filter(Boolean).length;
      
      merged.risk = count >= 2 ? "RE" : count === 1 ? "RM" : "RF";
      return merged;
    });
  }, [overrides.sale, customItems?.sale, deletedItems?.sale]);

  const resolvedMoralActivities = React.useMemo(() => {
    const list = customItems?.moral ? [...customItems.moral] : [];
    const base = MORAL_ACTIVITIES_DATA.filter(a => !deletedItems?.moral?.includes(a.code));
    const all = [...base, ...list];
    
    return all.map((a) => {
      const override = overrides.moral[a.code] || {};
      const merged = {
        ...a,
        cash: override.cash !== undefined ? override.cash as boolean : a.cash,
        objects: override.objects !== undefined ? override.objects as boolean : a.objects,
        volume: override.volume !== undefined ? override.volume as boolean : a.volume,
        noInfo: override.noInfo !== undefined ? override.noInfo as boolean : a.noInfo,
        complexEval: override.complexEval !== undefined ? override.complexEval as boolean : a.complexEval,
        intermediary: override.intermediary !== undefined ? override.intermediary as boolean : a.intermediary,
        corruption: override.corruption !== undefined ? override.corruption as boolean : a.corruption,
        comment: override.comment !== undefined ? String(override.comment) : a.comment,
      };
      
      const count = [
        merged.cash,
        merged.objects,
        merged.volume,
        merged.noInfo,
        merged.complexEval,
        merged.intermediary,
        merged.corruption
      ].filter(Boolean).length;
      
      merged.risk = count >= 2 ? "RE" : count === 1 ? "RM" : "RF";
      return merged;
    });
  }, [overrides.moral, customItems?.moral, deletedItems?.moral]);

  const resolvedPhysicalProfessions = React.useMemo(() => {
    const list = customItems?.profession ? [...customItems.profession] : [];
    const base = PHYS_PROFESSIONS_DATA.filter(p => !deletedItems?.profession?.includes(p.name));
    const all = [...base, ...list];
    
    return all.map((p) => {
      const override = overrides.profession[p.name] || {};
      const merged = {
        ...p,
        cash: override.cash !== undefined ? override.cash : p.cash,
        objects: override.objects !== undefined ? override.objects : p.objects,
        volume: override.volume !== undefined ? override.volume : p.volume,
        noInfo: override.noInfo !== undefined ? override.noInfo : p.noInfo,
        complexEval: override.complexEval !== undefined ? override.complexEval : p.complexEval,
        intermediary: override.intermediary !== undefined ? override.intermediary : p.intermediary,
        corruption: override.corruption !== undefined ? override.corruption : p.corruption,
      };
      
      const count = [
        merged.cash,
        merged.objects,
        merged.volume,
        merged.noInfo,
        merged.complexEval,
        merged.intermediary,
        merged.corruption,
      ].filter(Boolean).length;
      
      merged.risk = count >= 2 ? "RE" : count === 1 ? "RM" : "RF";
      return merged;
    });
  }, [overrides.profession, customItems?.profession, deletedItems?.profession]);

  // ── Filtered Memos ──

  const filteredCountries = React.useMemo(() => {
    return resolvedCountries.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.alpha3.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === "all" || c.risk === riskFilter;
      const matchesFactor = factorFilter === "all" || (c as any)[factorFilter] === true;
      return matchesSearch && matchesRisk && matchesFactor;
    });
  }, [resolvedCountries, searchQuery, riskFilter, factorFilter]);

  const filteredGovs = React.useMemo(() => {
    return resolvedGovs.filter(g => {
      const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.nameAr.includes(searchQuery);
      const matchesRisk = riskFilter === "all" || g.risk === riskFilter;
      const matchesFactor = factorFilter === "all" || (g as any)[factorFilter] === true;
      return matchesSearch && matchesRisk && matchesFactor;
    });
  }, [resolvedGovs, searchQuery, riskFilter, factorFilter]);

  const filteredProducts = React.useMemo(() => {
    return resolvedProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === "all" || p.risk === riskFilter;
      const matchesFactor = factorFilter === "all" || (p as any)[factorFilter] === true;
      return matchesSearch && matchesRisk && matchesFactor;
    });
  }, [resolvedProducts, searchQuery, riskFilter, factorFilter]);

  const filteredDist = React.useMemo(() => {
    return resolvedDist.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === "all" || d.risk === riskFilter;
      const matchesFactor = factorFilter === "all" || (d as any)[factorFilter] === true;
      return matchesSearch && matchesRisk && matchesFactor;
    });
  }, [resolvedDist, searchQuery, riskFilter, factorFilter]);

  const filteredSales = React.useMemo(() => {
    return resolvedSales.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === "all" || s.risk === riskFilter;
      const matchesFactor = factorFilter === "all" || (s as any)[factorFilter] === true;
      return matchesSearch && matchesRisk && matchesFactor;
    });
  }, [resolvedSales, searchQuery, riskFilter, factorFilter]);

  const filteredMoralActivities = React.useMemo(() => {
    return resolvedMoralActivities.filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === "all" || a.risk === riskFilter;
      const matchesFactor = factorFilter === "all" || (a as any)[factorFilter] === true;
      return matchesSearch && matchesRisk && matchesFactor;
    });
  }, [resolvedMoralActivities, searchQuery, riskFilter, factorFilter]);

  const filteredPhysicalProfessions = React.useMemo(() => {
    return resolvedPhysicalProfessions.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.domain.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === "all" || p.risk === riskFilter;
      const matchesDomain = selectedDomain === "all" || p.domain === selectedDomain;
      const matchesFactor = factorFilter === "all" || (p as any)[factorFilter] === true;
      return matchesSearch && matchesRisk && matchesDomain && matchesFactor;
    });
  }, [resolvedPhysicalProfessions, searchQuery, riskFilter, selectedDomain, factorFilter]);

  // Real-time statistics across all reference lists
  const riskDistributionStats = React.useMemo(() => {
    const allItems = [
      ...resolvedCountries.map(c => ({ type: "Pays", risk: c.risk })),
      ...resolvedGovs.map(g => ({ type: "Gouvernorats", risk: g.risk })),
      ...resolvedProducts.map(p => ({ type: "Produits d'Assurance", risk: p.risk })),
      ...resolvedDist.map(d => ({ type: "Canaux", risk: d.risk })),
      ...resolvedSales.map(s => ({ type: "Techniques de Vente", risk: s.risk })),
      ...resolvedMoralActivities.map(a => ({ type: "Activités Morales", risk: a.risk })),
      ...resolvedPhysicalProfessions.map(p => ({ type: "Professions PP", risk: p.risk })),
    ];

    const total = allItems.length;

    const stats = {
      total,
      RE: { count: 0, percentage: 0, byType: {} as Record<string, number> },
      RM: { count: 0, percentage: 0, byType: {} as Record<string, number> },
      RF: { count: 0, percentage: 0, byType: {} as Record<string, number> },
    };

    allItems.forEach(item => {
      const r = item.risk as 'RE' | 'RM' | 'RF';
      if (stats[r]) {
        stats[r].count++;
        stats[r].byType[item.type] = (stats[r].byType[item.type] || 0) + 1;
      }
    });

    if (total > 0) {
      stats.RE.percentage = Math.round((stats.RE.count / total) * 100);
      stats.RM.percentage = Math.round((stats.RM.count / total) * 100);
      stats.RF.percentage = Math.round((stats.RF.count / total) * 100);
    }

    return stats;
  }, [
    resolvedCountries,
    resolvedGovs,
    resolvedProducts,
    resolvedDist,
    resolvedSales,
    resolvedMoralActivities,
    resolvedPhysicalProfessions
  ]);

  const totalOverridesCount = React.useMemo(() => {
    let count = 0;
    Object.keys(overrides).forEach(cat => {
      const catObj = overrides[cat as any] || {};
      Object.keys(catObj).forEach(itemId => {
        const itemObj = catObj[itemId] || {};
        count += Object.keys(itemObj).length;
      });
    });
    return count;
  }, [overrides]);

  const renderBadge = (risk: string) => {
    const style = risk === "RE" 
      ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-450 dark:border-rose-900"
      : risk === "RM"
      ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-450 dark:border-amber-900"
      : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-450 dark:border-emerald-900";
    return (
      <Badge variant="outline" className={cn("font-bold text-[10px] uppercase px-2 py-0.5", style)}>
        {risk === "RE" ? "Élevé" : risk === "RM" ? "Moyen" : "Faible"}
      </Badge>
    );
  };

  // ── Export Excel (matrice des risques) ──
  const exportMatrixExcel = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Compliance Navigator";

    // Styles global apply helper
    const applyGlobalSheetStyles = (ws: ExcelJS.Worksheet) => {
      // Header row style
      const headerRow = ws.getRow(1);
      headerRow.height = 30;
      headerRow.eachCell((cell) => {
        cell.font = { name: "Segoe UI", bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6D28D9" } }; // Theme violet header
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FFC7D2FE" } },
          bottom: { style: "medium", color: { argb: "FF4F46E5" } },
          left: { style: "thin", color: { argb: "FFC7D2FE" } },
          right: { style: "thin", color: { argb: "FFC7D2FE" } }
        };
      });

      // Data rows style
      const riskBg: Record<string, string> = { RE: "FFFFE4E6", RM: "FFFEF9C3", RF: "FFD1FAE5" };
      const riskText: Record<string, string> = { RE: "FF9F1239", RM: "FF92400E", RF: "FF065F46" };

      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.height = 24;
        const isEven = rowNumber % 2 === 0;
        const bg = isEven ? "FFF8FAFC" : "FFFFFFFF"; // Alternating slate-50 rows

        // Find risk value in this row (typically last cell)
        const riskCell = row.getCell(ws.columns.length);
        const riskVal = riskCell.value as string;

        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF1E293B" } };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } }
          };

          // Apply cell alignment
          const column = ws.columns[colNumber - 1];
          const isCenter = column.key === "code" || 
                           column.key === "numeric" || 
                           column.key === "alpha3" || 
                           column.key === "coeff" || 
                           column.key === "agregation" || 
                           column.key === "risk" ||
                           cell.value === "Oui" || 
                           cell.value === "—";
          cell.alignment = { 
            vertical: "middle", 
            horizontal: isCenter ? "center" : "left",
            wrapText: true 
          };

          // Background fill & custom fonts for risk levels
          if (column.key === "risk" && riskBg[riskVal]) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: riskBg[riskVal] } };
            cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: riskText[riskVal] } };
            cell.value = riskVal === "RE" ? "Élevé" : riskVal === "RM" ? "Moyen" : "Faible";
          } else {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
          }
        });
      });
    };

    // ── Sheet 1: Légende & Méthodologie ──
    const wsL = wb.addWorksheet("Légende & Cotation");
    wsL.views = [{ showGridLines: true }];
    
    wsL.mergeCells("A2:C2");
    const titleCell = wsL.getCell("A2");
    titleCell.value = "Compliance Navigator — Légende de la Matrice des Risques";
    titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FF4F46E5" } };
    titleCell.alignment = { vertical: "middle", horizontal: "left" };
    wsL.getRow(2).height = 32;

    wsL.mergeCells("A3:C3");
    const subCell = wsL.getCell("A3");
    subCell.value = `Exporté le : ${new Date().toLocaleDateString("fr-FR")} — Document de référence des cotations KYC et paramètres de risques`;
    subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF64748B" } };
    wsL.getRow(3).height = 20;

    wsL.getRow(5).values = ["Niveau de Risque", "Représentation", "Critère de calcul automatique"];
    wsL.getRow(5).height = 26;
    wsL.getRow(5).eachCell((cell) => {
      cell.font = { name: "Segoe UI", bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    const legendData = [
      { level: "Risque Élevé (RE)", repr: "Rouge", rule: "Au moins 2 facteurs qualifiés de 'Oui' (>= 2 Oui)" },
      { level: "Risque Moyen (RM)", repr: "Orange", rule: "Exactement 1 facteur qualifié de 'Oui' (1 Oui)" },
      { level: "Risque Faible (RF)", repr: "Vert", rule: "Aucun facteur qualifié de 'Oui' (0 Oui, que des tirets)" }
    ];

    legendData.forEach((row, i) => {
      const r = wsL.addRow([row.level, row.repr, row.rule]);
      r.height = 24;
      const rowNum = 6 + i;
      r.eachCell((cell, col) => {
        cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF1E293B" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } }
        };
        cell.alignment = { vertical: "middle", horizontal: col === 3 ? "left" : "center" };
        
        if (rowNum === 6) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } };
          if (col === 1) cell.font = { name: "Segoe UI", bold: true, color: { argb: "FF9F1239" } };
        } else if (rowNum === 7) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9C3" } };
          if (col === 1) cell.font = { name: "Segoe UI", bold: true, color: { argb: "FF92400E" } };
        } else if (rowNum === 8) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
          if (col === 1) cell.font = { name: "Segoe UI", bold: true, color: { argb: "FF065F46" } };
        }
      });
    });

    wsL.getColumn(1).width = 25;
    wsL.getColumn(2).width = 18;
    wsL.getColumn(3).width = 50;

    // ── Sheet 2: Structure & Pondérations ──
    const wsP = wb.addWorksheet("Pondérations & Structure");
    wsP.views = [{ showGridLines: true }];
    wsP.columns = [
      { header: "Facteur d'évaluation", key: "facteur", width: 35 },
      { header: "KYC Physique", key: "kycPhys", width: 45 },
      { header: "KYC Morale", key: "kycMorale", width: 35 },
      { header: "KYC OBNL", key: "kycObnl", width: 35 },
      { header: "Coeff", key: "coeff", width: 10 },
      { header: "Agrégation", key: "agregation", width: 15 }
    ];
    kycFactors.forEach((f) => wsP.addRow(f));
    applyGlobalSheetStyles(wsP);

    // ── Sheet 3: Pays ──
    const wsC = wb.addWorksheet("1. Pays");
    wsC.views = [{ showGridLines: true }];
    wsC.columns = [
      { header: "ISO Num", key: "numeric", width: 10 },
      { header: "ISO Alpha-3", key: "alpha3", width: 15 },
      { header: "Pays", key: "name", width: 35 },
      { header: "GAFI", key: "gafi", width: 12 },
      { header: "Corruption (CPI < 30)", key: "corruption", width: 22 },
      { header: "Paradis Fiscal", key: "oecd", width: 15 },
      { header: "Terrorisme (GTI > 6)", key: "terrorism", width: 20 },
      { header: "Remarques / Autres", key: "other", width: 35 },
      { header: "Risque", key: "risk", width: 12 }
    ];
    resolvedCountries.forEach((c) => {
      wsC.addRow({
        numeric: c.numeric,
        alpha3: c.alpha3,
        name: c.name,
        gafi: c.gafi ? "Oui" : "—",
        corruption: c.corruption ? "Oui" : "—",
        oecd: c.oecd ? "Oui" : "—",
        terrorism: c.terrorism ? "Oui" : "—",
        other: c.other || "—",
        risk: c.risk
      });
    });
    applyGlobalSheetStyles(wsC);

    // ── Sheet 4: Gouvernorats (TN) ──
    const wsG = wb.addWorksheet("2. Gouvernorats");
    wsG.views = [{ showGridLines: true }];
    wsG.columns = [
      { header: "Code", key: "id", width: 10 },
      { header: "Gouvernorat (FR)", key: "name", width: 25 },
      { header: "Gouvernorat (AR)", key: "nameAr", width: 20 },
      { header: "Zone frontalière", key: "border", width: 18 },
      { header: "Port International", key: "port", width: 18 },
      { header: "Aéroport", key: "airport", width: 15 },
      { header: "Contrebande", key: "market", width: 15 },
      { header: "Autres critères", key: "other", width: 35 },
      { header: "Risque", key: "risk", width: 12 }
    ];
    resolvedGovs.forEach((g) => {
      wsG.addRow({
        id: g.id,
        name: g.name,
        nameAr: g.nameAr,
        border: g.border ? "Oui" : "—",
        port: g.port ? "Oui" : "—",
        airport: g.airport ? "Oui" : "—",
        market: g.market ? "Oui" : "—",
        other: g.other || "—",
        risk: g.risk
      });
    });
    applyGlobalSheetStyles(wsG);

    // ── Sheet 5: Produits d'Assurance ──
    const wsPr = wb.addWorksheet("3. Produits d'Assurance");
    wsPr.views = [{ showGridLines: true }];
    wsPr.columns = [
      { header: "Code", key: "code", width: 10 },
      { header: "Contrat d'Assurance", key: "name", width: 40 },
      { header: "Liquidité", key: "liquid", width: 15 },
      { header: "Devises / Étranger", key: "forex", width: 20 },
      { header: "Capital Élevé", key: "highValue", width: 18 },
      { header: "Fraude / Sinistralité", key: "fraud", width: 20 },
      { header: "Capitalisation", key: "cap", width: 18 },
      { header: "Commentaire réglementaire", key: "comment", width: 45 },
      { header: "Risque", key: "risk", width: 12 }
    ];
    resolvedProducts.forEach((p) => {
      wsPr.addRow({
        code: p.code,
        name: p.name,
        liquid: p.liquid ? "Oui" : "—",
        forex: p.forex ? "Oui" : "—",
        highValue: p.highValue ? "Oui" : "—",
        fraud: p.fraud ? "Oui" : "—",
        cap: p.cap ? "Oui" : "—",
        comment: p.comment || "—",
        risk: p.risk
      });
    });
    applyGlobalSheetStyles(wsPr);

    // ── Sheet 6: Canaux de Distribution ──
    const wsD = wb.addWorksheet("4. Canaux");
    wsD.views = [{ showGridLines: true }];
    wsD.columns = [
      { header: "Code", key: "code", width: 10 },
      { header: "Canal", key: "name", width: 30 },
      { header: "Difficulté Contrôle", key: "complex", width: 20 },
      { header: "Non-soumission", key: "nonCompliance", width: 20 },
      { header: "Pas de culture LBC", key: "noCulture", width: 22 },
      { header: "Risque", key: "risk", width: 12 }
    ];
    resolvedDist.forEach((d) => {
      wsD.addRow({
        code: d.code,
        name: d.name,
        complex: d.complex ? "Oui" : "—",
        nonCompliance: d.nonCompliance ? "Oui" : "—",
        noCulture: d.noCulture ? "Oui" : "—",
        risk: d.risk
      });
    });
    applyGlobalSheetStyles(wsD);

    // ── Sheet 7: Techniques de Vente ──
    const wsS = wb.addWorksheet("5. Techniques de Vente");
    wsS.views = [{ showGridLines: true }];
    wsS.columns = [
      { header: "Code", key: "code", width: 10 },
      { header: "Voie de distribution / Vente", key: "name", width: 35 },
      { header: "Pas de contact direct", key: "noContact", width: 22 },
      { header: "Pas d'originaux", key: "noOriginals", width: 18 },
      { header: "Risque", key: "risk", width: 12 }
    ];
    resolvedSales.forEach((s) => {
      wsS.addRow({
        code: s.code,
        name: s.name,
        noContact: s.noContact ? "Oui" : "—",
        noOriginals: s.noOriginals ? "Oui" : "—",
        risk: s.risk
      });
    });
    applyGlobalSheetStyles(wsS);

    // ── Sheet 8: Activités Morales (PM) ──
    const wsM = wb.addWorksheet("6. Activités Morales");
    wsM.views = [{ showGridLines: true }];
    wsM.columns = [
      { header: "Code", key: "code", width: 10 },
      { header: "Activité", key: "name", width: 40 },
      { header: "Liquide", key: "cash", width: 12 },
      { header: "Objets précieux", key: "objects", width: 18 },
      { header: "Volume d'affaires", key: "volume", width: 18 },
      { header: "Manque Info", key: "noInfo", width: 15 },
      { header: "Complexe", key: "complexEval", width: 15 },
      { header: "Intermédiation", key: "intermediary", width: 18 },
      { header: "Corruption", key: "corruption", width: 15 },
      { header: "Remarque", key: "comment", width: 40 },
      { header: "Risque", key: "risk", width: 12 }
    ];
    resolvedMoralActivities.forEach((a) => {
      wsM.addRow({
        code: a.code,
        name: a.name,
        cash: a.cash ? "Oui" : "—",
        objects: a.objects ? "Oui" : "—",
        volume: a.volume ? "Oui" : "—",
        noInfo: a.noInfo ? "Oui" : "—",
        complexEval: a.complexEval ? "Oui" : "—",
        intermediary: a.intermediary ? "Oui" : "—",
        corruption: a.corruption ? "Oui" : "—",
        comment: a.comment || "—",
        risk: a.risk
      });
    });
    applyGlobalSheetStyles(wsM);

    // ── Sheet 9: Professions PP ──
    const wsPh = wb.addWorksheet("7. Professions PP");
    wsPh.views = [{ showGridLines: true }];
    wsPh.columns = [
      { header: "Domaine / Secteur", key: "domain", width: 30 },
      { header: "Profession", key: "name", width: 35 },
      { header: "Liquide", key: "cash", width: 12 },
      { header: "Objets précieux", key: "objects", width: 18 },
      { header: "Volume d'affaires", key: "volume", width: 18 },
      { header: "Manque Info", key: "noInfo", width: 15 },
      { header: "Complexe", key: "complexEval", width: 15 },
      { header: "Intermédiation", key: "intermediary", width: 18 },
      { header: "Corruption", key: "corruption", width: 15 },
      { header: "Risque", key: "risk", width: 12 }
    ];
    resolvedPhysicalProfessions.forEach((p) => {
      wsPh.addRow({
        domain: p.domain,
        name: p.name,
        cash: p.cash ? "Oui" : "—",
        objects: p.objects ? "Oui" : "—",
        volume: p.volume ? "Oui" : "—",
        noInfo: p.noInfo ? "Oui" : "—",
        complexEval: p.complexEval ? "Oui" : "—",
        intermediary: p.intermediary ? "Oui" : "—",
        corruption: p.corruption ? "Oui" : "—",
        risk: p.risk
      });
    });
    applyGlobalSheetStyles(wsPh);

    // Write file to user
    const today = new Date().toISOString().split("T")[0];
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Matrice_des_Risques_KYC_${today}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export réussi", description: "La matrice des risques a été exportée au format Excel complet." });
  };

  const exportMatrixPDF = () => {
    window.print();
    toast({ title: "Impression lancée", description: "La matrice des risques sera imprimée / exportée en PDF." });
  };

  return (
    <div className="space-y-6">
      {/* ── Matrice Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-[0.2em]">KYC Risk Intelligence</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Matrice des <span className="text-violet-600 dark:text-violet-400">Risques</span>
          </h2>
          <p className="text-slate-500 text-sm max-w-xl">
            Référentiel KYC — Cotation et pondération des facteurs de risque par catégorie de client.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {totalOverridesCount > 0 && (
            <Badge variant="outline" className="h-9 px-3 rounded-xl border-2 border-violet-100 bg-violet-50 text-violet-700 font-bold text-[10px] animate-fade-in shadow-xs dark:bg-violet-950/20 dark:border-violet-900 dark:text-violet-400">
              ✨ {totalOverridesCount} personnalisations
            </Badge>
          )}

          {/* History */}
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-bold text-[10px] shadow-sm hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
                <History className="h-3.5 w-3.5 mr-1.5 text-violet-500" />
                Historique ({kycHistory.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-2xl p-0 border-none shadow-2xl">
              <div className="p-6 border-b border-slate-100">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <History className="h-5 w-5 text-violet-500" />
                    Historique des Modifications
                  </DialogTitle>
                </DialogHeader>
              </div>
              <ScrollArea className="max-h-[60vh]">
                <div className="p-6 space-y-3">
                  {kycHistory.length === 0 && (
                    <p className="text-center text-slate-400 italic text-sm py-12">Aucune modification enregistrée</p>
                  )}
                  {kycHistory.map(entry => (
                    <div key={entry.id} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-800 dark:text-white truncate">{entry.field}</span>
                          <span className="text-[9px] text-slate-400 flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3" />
                            {new Date(entry.date).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Par: <strong>{entry.user}</strong></p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] line-through text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded">{entry.oldValue || "(vide)"}</span>
                          <span className="text-[9px] text-slate-400">→</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">{entry.newValue || "(vide)"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Export PDF */}
          <Button
            size="sm"
            variant="outline"
            onClick={exportMatrixPDF}
            className="h-9 px-4 rounded-xl border-2 border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] shadow-sm transition-all hover:scale-[1.02] dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400"
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" /> Rapport PDF
          </Button>

          {/* Export Excel */}
          <Button
            size="sm"
            variant="outline"
            onClick={exportMatrixExcel}
            className="h-9 px-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] shadow-sm transition-all hover:scale-[1.02] dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> Exporter Excel
          </Button>
        </div>
      </div>

      {/* ── Live Risk Intelligence Dashboard ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            key: "RE",
            label: "Risque Élevé (RE)",
            range: "≥ 70% ou ≥ 2 Oui",
            color: "border-rose-100 dark:border-rose-950 bg-rose-50/40 dark:bg-rose-950/5",
            textColor: "text-rose-700 dark:text-rose-400",
            barColor: "bg-rose-500",
            badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
            stats: riskDistributionStats.RE
          },
          {
            key: "RM",
            label: "Risque Moyen (RM)",
            range: "≥ 50% ou exactly 1 Oui",
            color: "border-amber-100 dark:border-amber-950 bg-amber-50/40 dark:bg-amber-950/5",
            textColor: "text-amber-700 dark:text-amber-400",
            barColor: "bg-amber-500",
            badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
            stats: riskDistributionStats.RM
          },
          {
            key: "RF",
            label: "Risque Faible (RF)",
            range: "< 50% ou 0 Oui",
            color: "border-emerald-100 dark:border-emerald-950 bg-emerald-50/40 dark:bg-emerald-950/5",
            textColor: "text-emerald-700 dark:text-emerald-400",
            barColor: "bg-emerald-500",
            badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
            stats: riskDistributionStats.RF
          }
        ].map(item => {
          const isFilterActive = riskFilter === item.key;
          return (
            <Card
              key={item.key}
              onClick={() => setRiskFilter(riskFilter === item.key ? "all" : item.key)}
              className={cn(
                "border-2 transition-all duration-300 cursor-pointer relative overflow-hidden group hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                item.color,
                isFilterActive 
                  ? "ring-2 ring-violet-500 shadow-md border-violet-300 dark:border-violet-700" 
                  : "border-slate-100 dark:border-slate-800/80"
              )}
            >
              {isFilterActive && (
                <div className="absolute top-0 right-0 bg-violet-650 text-white text-[8px] font-black uppercase px-2.5 py-1 rounded-bl-lg tracking-wider animate-pulse">
                  Filtre Actif
                </div>
              )}
              <CardHeader className="pb-1 p-5">
                <div className="flex justify-between items-start">
                  <span className={cn("text-xs font-black uppercase tracking-wider", item.textColor)}>
                    {item.label}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-full">
                    {item.range}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                    {item.stats.count}
                  </span>
                  <span className="text-xs font-bold text-slate-500">entités</span>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0 space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>Part dans le modèle</span>
                    <span>{item.stats.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-700", item.barColor)} 
                      style={{ width: `${item.stats.percentage}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-1 flex-wrap">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Répartition par type :</span>
                  <div className="flex flex-wrap gap-1 mt-1 w-full">
                    {Object.keys(item.stats.byType).length === 0 ? (
                      <span className="text-[9px] text-slate-400 italic">Aucune entité</span>
                    ) : (
                      Object.keys(item.stats.byType).map(type => (
                        <Badge 
                          key={type} 
                          variant="secondary" 
                          className="text-[8px] font-bold py-0 px-1.5 bg-slate-100/50 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100 transition-colors"
                        >
                          {type} : {item.stats.byType[type]}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sub tabs navigation */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex flex-wrap gap-1 bg-slate-100/60 dark:bg-slate-900/60 p-1 rounded-xl border">
          {[
            { id: "params", label: "Pondérations & Structure", icon: Layers, iconColor: "text-violet-500" },
            { id: "countries", label: "Pays", icon: Globe, iconColor: "text-blue-500" },
            { id: "govs", label: "Gouvernorats (TN)", icon: MapPin, iconColor: "text-rose-500" },
            { id: "products", label: "Produits d'Assurance", icon: Package, iconColor: "text-amber-500" },
            { id: "dist", label: "Canaux & Ventes", icon: Grid, iconColor: "text-emerald-500" },
            { id: "moral", label: "Activités Morales", icon: Landmark, iconColor: "text-indigo-500" },
            { id: "physical", label: "Professions PP", icon: Users, iconColor: "text-teal-500" }
          ].map(tab => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setSubTab(tab.id as any); setSearchQuery(""); setRiskFilter("all"); setSelectedDomain("all"); }}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  active
                    ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", tab.iconColor)} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Global Matrix Search & Filters */}
        {subTab !== "params" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1 h-9 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-[180px] focus:bg-white transition-all"
              />
            </div>
            <select
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value as any)}
              className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 outline-none h-9 font-semibold text-slate-600 dark:text-slate-350 cursor-pointer"
            >
              <option value="all">Tous les risques</option>
              <option value="RE">Risque Élevé</option>
              <option value="RM">Risque Moyen</option>
              <option value="RF">Risque Faible</option>
            </select>
            {(() => {
              const options = (() => {
                switch (subTab) {
                  case "countries":
                    return [
                      { value: "gafi", label: "GAFI (Dominant)" },
                      { value: "corruption", label: "Corruption CPI" },
                      { value: "oecd", label: "Paradis fiscal" },
                      { value: "terrorism", label: "Terrorisme GTI" }
                    ];
                  case "govs":
                    return [
                      { value: "border", label: "Zone frontalière" },
                      { value: "port", label: "Port International" },
                      { value: "airport", label: "Aéroport" },
                      { value: "market", label: "Contrebande" }
                    ];
                  case "products":
                    return [
                      { value: "liquid", label: "Liquidité" },
                      { value: "forex", label: "Devises / Étranger" },
                      { value: "highValue", label: "Capital Élevé" },
                      { value: "fraud", label: "Fraude" },
                      { value: "cap", label: "Capitalisation / Épargne" }
                    ];
                  case "dist":
                    return [
                      { value: "complex", label: "Difficulté Contrôle" },
                      { value: "nonCompliance", label: "Non-soumission" },
                      { value: "noCulture", label: "Pas de culture LBC" },
                      { value: "noContact", label: "Pas de contact direct" },
                      { value: "noOriginals", label: "Pas d'originaux" }
                    ];
                  case "moral":
                  case "physical":
                    return [
                      { value: "cash", label: "Liquide" },
                      { value: "objects", label: "Objets" },
                      { value: "volume", label: "Volume" },
                      { value: "noInfo", label: "Info" },
                      { value: "complexEval", label: "Éval." },
                      { value: "intermediary", label: "Interm." },
                      { value: "corruption", label: "Corrup." }
                    ];
                  default:
                    return [];
                }
              })();
              if (options.length === 0) return null;
              return (
                <select
                  value={factorFilter}
                  onChange={e => setFactorFilter(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 outline-none h-9 font-semibold text-slate-600 dark:text-slate-350 cursor-pointer max-w-[200px]"
                >
                  <option value="all">Tous les facteurs</option>
                  {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label} : Oui</option>
                  ))}
                </select>
              );
            })()}
            {subTab === "physical" && (
              <select
                value={selectedDomain}
                onChange={e => setSelectedDomain(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 outline-none h-9 font-semibold text-slate-600 dark:text-slate-350 cursor-pointer max-w-[200px]"
              >
                <option value="all">Tous les domaines ({uniqueDomains.length})</option>
                {uniqueDomains.map(dom => (
                  <option key={dom} value={dom}>{dom}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* ── Sub-tab contents ── */}

      {/* 1. Structural parameters — Editable table */}
      {subTab === "params" && (
        <Card className="border-none bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 px-6 pt-5 bg-slate-50/50 dark:bg-slate-900/20 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Pondérations des facteurs KYC</CardTitle>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Cliquez sur une cellule pour modifier — enregistrement automatique</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-violet-600 border-violet-200 bg-violet-50 font-bold text-[10px]">
                  <Save className="h-3 w-3 mr-1" /> Auto-save
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFactors}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-7 px-3 rounded-lg"
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Responsive grid layout — no horizontal scroll */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* Header */}
              <div className="grid grid-cols-[minmax(160px,1fr)_1fr_1fr_1fr_80px_90px] gap-0 bg-slate-50 dark:bg-slate-800/40 text-[10px] font-black uppercase tracking-widest text-slate-500 px-4 py-2">
                <div className="py-1">Facteur d&apos;évaluation</div>
                <div className="py-1 pl-2">KYC Physique</div>
                <div className="py-1 pl-2">KYC Morale</div>
                <div className="py-1 pl-2">KYC OBNL</div>
                <div className="py-1 pl-2 text-center">Coeff</div>
                <div className="py-1 pl-2 text-center">Agrégation</div>
              </div>
              {/* Rows */}
              {kycFactors.map((factor, idx) => (
                <div
                  key={factor.id}
                  className={cn(
                    "grid grid-cols-[minmax(160px,1fr)_1fr_1fr_1fr_80px_90px] gap-0 group transition-colors",
                    idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/40 dark:bg-slate-800/20",
                    "hover:bg-violet-50/30 dark:hover:bg-violet-900/10"
                  )}
                >
                  {/* Facteur (label — read-only) */}
                  <div className="px-4 py-3 border-r border-slate-100 dark:border-slate-800 flex items-center">
                    <span className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{factor.facteur}</span>
                  </div>
                  {/* KYC Physique */}
                  <div className="px-2 py-2 border-r border-slate-100 dark:border-slate-800">
                    <Textarea
                      defaultValue={factor.kycPhys}
                      onBlur={e => updateFactor(factor.id, "kycPhys", e.target.value.trim())}
                      className="text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-transparent border-none shadow-none focus-visible:ring-1 focus-visible:ring-violet-400/40 p-1 min-h-[36px] resize-none overflow-hidden leading-tight w-full"
                      rows={2}
                    />
                  </div>
                  {/* KYC Morale */}
                  <div className="px-2 py-2 border-r border-slate-100 dark:border-slate-800">
                    <Textarea
                      defaultValue={factor.kycMorale}
                      onBlur={e => updateFactor(factor.id, "kycMorale", e.target.value.trim())}
                      className="text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-transparent border-none shadow-none focus-visible:ring-1 focus-visible:ring-violet-400/40 p-1 min-h-[36px] resize-none overflow-hidden leading-tight w-full"
                      rows={2}
                    />
                  </div>
                  {/* KYC OBNL */}
                  <div className="px-2 py-2 border-r border-slate-100 dark:border-slate-800">
                    <Textarea
                      defaultValue={factor.kycObnl}
                      onBlur={e => updateFactor(factor.id, "kycObnl", e.target.value.trim())}
                      className="text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-transparent border-none shadow-none focus-visible:ring-1 focus-visible:ring-violet-400/40 p-1 min-h-[36px] resize-none overflow-hidden leading-tight w-full"
                      rows={2}
                    />
                  </div>
                  {/* Coeff */}
                  <div className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 flex items-center justify-center">
                    <input
                      type="text"
                      defaultValue={factor.coeff}
                      onBlur={e => updateFactor(factor.id, "coeff", e.target.value.trim())}
                      className="text-xs font-black text-center text-slate-700 dark:text-slate-200 bg-transparent border-none outline-none w-full focus:bg-slate-50 dark:focus:bg-slate-800 rounded px-1"
                    />
                  </div>
                  {/* Agrégation */}
                  <div className="px-2 py-2 flex items-center justify-center">
                    <input
                      type="text"
                      defaultValue={factor.agregation}
                      onBlur={e => updateFactor(factor.id, "agregation", e.target.value.trim())}
                      className="text-xs font-black text-center text-slate-700 dark:text-slate-200 bg-transparent border-none outline-none w-full focus:bg-slate-50 dark:focus:bg-slate-800 rounded px-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Countries list */}
      {subTab === "countries" && (
        <Card className="border-none bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 px-6 pt-5 bg-slate-50/50 dark:bg-slate-900/20 border-b flex flex-row justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Indice de risque par Pays</CardTitle>
              <p className="text-[10px] text-slate-400 mt-0.5">Calculé selon la liste GAFI, l&apos;indice de corruption et le terrorisme global</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await resetOverrides('country', authorName);
                  toast({ title: "Paramètres pays réinitialisés", description: "Tous les pays ont retrouvé leurs valeurs d'origine." });
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-7 px-3 rounded-lg"
              >
                Réinitialiser
              </Button>
              <Badge variant="outline" className="font-bold text-slate-500 bg-white dark:bg-slate-900">{filteredCountries.length} pays trouvés</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                <TableRow className="bg-slate-50/30 dark:bg-slate-900/10 text-xs">
                  <TableHead className="font-bold text-center w-[80px]">ISO Num</TableHead>
                  <TableHead className="font-bold text-center w-[100px]">ISO Alpha 3</TableHead>
                  <TableHead className="font-bold">Nom du Pays</TableHead>
                  <TableHead className="font-bold text-center w-[130px]">GAFI (Dominant)</TableHead>
                  <TableHead className="font-bold text-center w-[130px]">Corruption CPI</TableHead>
                  <TableHead className="font-bold text-center w-[130px]">Paradis fiscal</TableHead>
                  <TableHead className="font-bold text-center w-[130px]">Terrorisme GTI</TableHead>
                  <TableHead className="font-bold">Remarques</TableHead>
                  <TableHead className="font-bold text-center w-[100px]">Risque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredCountries.map(c => (
                  <TableRow key={c.alpha3} className={cn("hover:bg-slate-50/50 dark:hover:bg-slate-900/20", c.risk === "RE" ? "bg-rose-50/10 dark:bg-rose-950/5" : "")}>
                    <TableCell className="text-center text-slate-500">{c.numeric}</TableCell>
                    <TableCell className="text-center font-bold text-slate-700 dark:text-slate-350">{c.alpha3}</TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white">{c.name}</TableCell>
                    {[
                      { field: "gafi", yesLabel: "🔴 Oui" },
                      { field: "corruption", yesLabel: "🔶 CPI < 30" },
                      { field: "oecd", yesLabel: "🌴 Oui" },
                      { field: "terrorism", yesLabel: "⚠️ GTI > 6" }
                    ].map((col) => {
                      const val = (c as any)[col.field];
                      return (
                        <TableCell key={col.field} className="text-center p-1.5">
                          <button
                            onClick={() => handleToggleRequest('country', c.name, col.field, val, c.name)}
                            className={cn(
                              "text-[9px] font-black uppercase tracking-tight py-1 px-2.5 rounded-md border shadow-xs transition-all hover:scale-105 cursor-pointer w-28 text-center",
                              val 
                                ? "bg-emerald-100 text-emerald-800 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-900"
                                : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                            )}
                          >
                            {val ? col.yesLabel : "—"}
                          </button>
                        </TableCell>
                      );
                    })}
                    <TableCell className="p-2 max-w-[200px]">
                      {editingCell?.category === 'country' && editingCell?.itemId === c.name ? (
                        <Input
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          onBlur={() => handleSaveComment('country', c.name, 'other', c.other || '')}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveComment('country', c.name, 'other', c.other || '');
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          autoFocus
                          className="h-7 text-xs bg-white dark:bg-slate-950 font-bold"
                        />
                      ) : (
                        <div
                          onClick={() => {
                            setEditingCell({ category: 'country', itemId: c.name, field: 'other' });
                            setEditingText(c.other || '');
                          }}
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded min-h-[28px] italic text-slate-500 truncate font-semibold"
                          title={c.other || "Cliquez pour ajouter une remarque"}
                        >
                          {c.other || <span className="text-slate-300 dark:text-slate-600 font-normal">Ajouter...</span>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{renderBadge(c.risk)}</TableCell>
                  </TableRow>
                ))}
                {filteredCountries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-400 italic font-semibold">Aucun pays trouvé</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 3. Governorates list */}
      {subTab === "govs" && (
        <Card className="border-none bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 px-6 pt-5 bg-slate-50/50 dark:bg-slate-900/20 border-b flex flex-row justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Indice de risque par Gouvernorat (Tunisie)</CardTitle>
              <p className="text-[10px] text-slate-400 mt-0.5">Basé sur les critères frontaliers, aéroports, ports et risques terroristes</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await resetOverrides('gov', authorName);
                  toast({ title: "Paramètres gouvernorats réinitialisés", description: "Tous les gouvernorats ont retrouvé leurs valeurs d'origine." });
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-7 px-3 rounded-lg"
              >
                Réinitialiser
              </Button>
              <Badge variant="outline" className="font-bold text-slate-500 bg-white dark:bg-slate-900">{filteredGovs.length} gouvernorats</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/30 dark:bg-slate-900/10 text-xs">
                  <TableHead className="font-bold text-center w-[80px]">Code</TableHead>
                  <TableHead className="font-bold">Gouvernorat</TableHead>
                  <TableHead className="font-bold text-right">الولاية</TableHead>
                  <TableHead className="font-bold text-center">Zone frontalière</TableHead>
                  <TableHead className="font-bold text-center">Port International</TableHead>
                  <TableHead className="font-bold text-center">Aéroport</TableHead>
                  <TableHead className="font-bold text-center">Contrebande</TableHead>
                  <TableHead className="font-bold">Autres critères</TableHead>
                  <TableHead className="font-bold text-center w-[100px]">Risque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredGovs.map(g => (
                  <TableRow key={g.id} className={cn("hover:bg-slate-50/50 dark:hover:bg-slate-900/20", g.risk === "RE" ? "bg-rose-50/10 dark:bg-rose-950/5" : "")}>
                    <TableCell className="text-center text-slate-500">{g.id}</TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white">{g.name}</TableCell>
                    <TableCell className="text-right font-medium text-slate-400">{g.nameAr}</TableCell>
                    {[
                      { field: "border", yesLabel: "🛡️ Oui" },
                      { field: "port", yesLabel: "⚓ Oui" },
                      { field: "airport", yesLabel: "✈️ Oui" },
                      { field: "market", yesLabel: "💸 Oui" }
                    ].map((col) => {
                      const val = (g as any)[col.field];
                      return (
                        <TableCell key={col.field} className="text-center p-1.5">
                          <button
                            onClick={() => handleToggleRequest('gov', String(g.id), col.field, val, g.name)}
                            className={cn(
                              "text-[9px] font-black uppercase tracking-tight py-1 px-2.5 rounded-md border shadow-xs transition-all hover:scale-105 cursor-pointer w-28 text-center",
                              val 
                                ? "bg-emerald-100 text-emerald-800 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-900"
                                : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                            )}
                          >
                            {val ? col.yesLabel : "—"}
                          </button>
                        </TableCell>
                      );
                    })}
                    <TableCell className="p-2 max-w-[200px]">
                      {editingCell?.category === 'gov' && editingCell?.itemId === String(g.id) ? (
                        <Input
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          onBlur={() => handleSaveComment('gov', String(g.id), 'other', g.other || '')}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveComment('gov', String(g.id), 'other', g.other || '');
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          autoFocus
                          className="h-7 text-xs bg-white dark:bg-slate-950 font-bold"
                        />
                      ) : (
                        <div
                          onClick={() => {
                            setEditingCell({ category: 'gov', itemId: String(g.id), field: 'other' });
                            setEditingText(g.other || '');
                          }}
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded min-h-[28px] italic text-slate-500 truncate font-semibold"
                          title={g.other || "Cliquez pour ajouter une remarque"}
                        >
                          {g.other || <span className="text-slate-350 dark:text-slate-600 font-normal">Ajouter...</span>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{renderBadge(g.risk)}</TableCell>
                  </TableRow>
                ))}
                {filteredGovs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-400 italic font-semibold">Aucun gouvernorat trouvé</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 4. Products list */}
      {subTab === "products" && (
        <Card className="border-none bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 px-6 pt-5 bg-slate-50/50 dark:bg-slate-900/20 border-b flex flex-row justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Risque par Produit d&apos;Assurance</CardTitle>
              <p className="text-[10px] text-slate-400 mt-0.5">Score de risque par type de contrat d&apos;assurance et de produit d&apos;épargne</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await resetOverrides('product', authorName);
                  toast({ title: "Paramètres produits réinitialisés", description: "Tous les produits ont retrouvé leurs valeurs d'origine." });
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-7 px-3 rounded-lg"
              >
                Réinitialiser
              </Button>
              <Badge variant="outline" className="font-bold text-slate-500 bg-white dark:bg-slate-900">{filteredProducts.length} contrats</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/30 dark:bg-slate-900/10 text-xs">
                  <TableHead className="font-bold text-center w-[80px]">Code</TableHead>
                  <TableHead className="font-bold">Contrat d&apos;Assurance</TableHead>
                  <TableHead className="font-bold text-center">Liquidité</TableHead>
                  <TableHead className="font-bold text-center">Devises / Étranger</TableHead>
                  <TableHead className="font-bold text-center">Capital Élevé</TableHead>
                  <TableHead className="font-bold text-center">Fraude</TableHead>
                  <TableHead className="font-bold text-center">Capitalisation</TableHead>
                  <TableHead className="font-bold">Commentaire réglementaire</TableHead>
                  <TableHead className="font-bold text-center w-[100px]">Risque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredProducts.map(p => (
                  <TableRow key={p.code} className={cn("hover:bg-slate-50/50 dark:hover:bg-slate-900/20", p.risk === "RE" ? "bg-rose-50/10 dark:bg-rose-950/5" : "")}>
                    <TableCell className="text-center text-slate-500 font-bold">{p.code}</TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white">{p.name}</TableCell>
                    {[
                      { field: "liquid", yesLabel: "💧 Oui" },
                      { field: "forex", yesLabel: "💵 Oui" },
                      { field: "highValue", yesLabel: "💰 Oui" },
                      { field: "fraud", yesLabel: "🚨 Oui" },
                      { field: "cap", yesLabel: "📈 Épargne" }
                    ].map((col) => {
                      const val = (p as any)[col.field];
                      return (
                        <TableCell key={col.field} className="text-center p-1.5">
                          <button
                            onClick={() => handleToggleRequest('product', String(p.code), col.field, val, p.name)}
                            className={cn(
                              "text-[9px] font-black uppercase tracking-tight py-1 px-2.5 rounded-md border shadow-xs transition-all hover:scale-105 cursor-pointer w-28 text-center",
                              val 
                                ? "bg-emerald-100 text-emerald-800 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-900"
                                : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                            )}
                          >
                            {val ? col.yesLabel : "—"}
                          </button>
                        </TableCell>
                      );
                    })}
                    <TableCell className="p-2 max-w-[200px]">
                      {editingCell?.category === 'product' && editingCell?.itemId === String(p.code) ? (
                        <Input
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          onBlur={() => handleSaveComment('product', String(p.code), 'comment', p.comment || '')}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveComment('product', String(p.code), 'comment', p.comment || '');
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          autoFocus
                          className="h-7 text-xs bg-white dark:bg-slate-950 font-bold"
                        />
                      ) : (
                        <div
                          onClick={() => {
                            setEditingCell({ category: 'product', itemId: String(p.code), field: 'comment' });
                            setEditingText(p.comment || '');
                          }}
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded min-h-[28px] italic text-slate-500 truncate font-semibold"
                          title={p.comment || "Cliquez pour ajouter un commentaire"}
                        >
                          {p.comment || <span className="text-slate-355 dark:text-slate-600 font-normal">Ajouter...</span>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{renderBadge(p.risk)}</TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-400 italic font-semibold">Aucun contrat trouvé</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 5. Distribution channels */}
      {subTab === "dist" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Canaux */}
          <Card className="border-none bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 px-6 pt-5 bg-slate-50/50 dark:bg-slate-900/20 border-b flex flex-row justify-between items-center flex-wrap gap-4">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Canaux de Distribution</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenAddModal('dist')}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 h-7 px-3 rounded-lg flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Ajouter
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await resetOverrides('dist', authorName);
                    toast({ title: "Canaux réinitialisés", description: "Les canaux de distribution ont retrouvé leurs valeurs d'origine." });
                  }}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-7 px-3 rounded-lg animate-fade-in"
                >
                  Réinitialiser
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/30 dark:bg-slate-900/10 text-xs">
                    <TableHead className="font-bold text-center w-[80px]">Code</TableHead>
                    <TableHead className="font-bold">Canal</TableHead>
                    <TableHead className="font-bold text-center">Difficulté Contrôle</TableHead>
                    <TableHead className="font-bold text-center">Non-soumission</TableHead>
                    <TableHead className="font-bold text-center">Pas de culture LBC</TableHead>
                    <TableHead className="font-bold text-center w-[90px]">Risque</TableHead>
                    <TableHead className="font-bold text-center w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredDist.map(d => (
                    <TableRow key={d.code} className={cn("hover:bg-slate-50/50 dark:hover:bg-slate-900/20", d.risk === "RE" ? "bg-rose-50/10 dark:bg-rose-950/5" : "")}>
                      <TableCell className="text-center text-slate-500">{d.code}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white">{d.name}</TableCell>
                      {[
                        { field: "complex", yesLabel: "⚠️ Oui" },
                        { field: "nonCompliance", yesLabel: "🔴 Oui" },
                        { field: "noCulture", yesLabel: "📯 Oui" }
                      ].map((col) => {
                        const val = (d as any)[col.field];
                        return (
                          <TableCell key={col.field} className="text-center p-1.5">
                            <button
                              onClick={() => handleToggleRequest('dist', d.code, col.field, val, d.name)}
                              className={cn(
                                "text-[9px] font-black uppercase tracking-tight py-1 px-2.5 rounded-md border shadow-xs transition-all hover:scale-105 cursor-pointer w-24 text-center",
                                val 
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-900"
                                  : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                              )}
                            >
                              {val ? col.yesLabel : "—"}
                            </button>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">{renderBadge(d.risk)}</TableCell>
                      <TableCell className="text-center p-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-rose-500 hover:text-rose-750 hover:bg-rose-50 rounded-full cursor-pointer"
                          onClick={() => handleRemoveRequest('dist', d.code, d.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredDist.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-400 italic font-semibold">Aucun canal trouvé</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Techniques de vente */}
          <Card className="border-none bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 px-6 pt-5 bg-slate-50/50 dark:bg-slate-900/20 border-b flex flex-row justify-between items-center flex-wrap gap-4">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Technique de Vente</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenAddModal('sale')}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 h-7 px-3 rounded-lg flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Ajouter
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await resetOverrides('sale', authorName);
                    toast({ title: "Techniques réinitialisées", description: "Les techniques de vente ont retrouvé leurs valeurs d'origine." });
                  }}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-7 px-3 rounded-lg"
                >
                  Réinitialiser
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/30 dark:bg-slate-900/10 text-xs">
                    <TableHead className="font-bold text-center w-[80px]">Code</TableHead>
                    <TableHead className="font-bold">Voie de distribution / Vente</TableHead>
                    <TableHead className="font-bold text-center">Pas de contact direct</TableHead>
                    <TableHead className="font-bold text-center">Pas d&apos;originaux</TableHead>
                    <TableHead className="font-bold text-center w-[90px]">Risque</TableHead>
                    <TableHead className="font-bold text-center w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredSales.map(s => (
                    <TableRow key={s.code} className={cn("hover:bg-slate-50/50 dark:hover:bg-slate-900/20", s.risk === "RE" ? "bg-rose-50/10 dark:bg-rose-950/5" : "")}>
                      <TableCell className="text-center text-slate-500 font-bold">{s.code}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white">{s.name}</TableCell>
                      {[
                        { field: "noContact", yesLabel: "🌐 Oui" },
                        { field: "noOriginals", yesLabel: "📄 Oui" }
                      ].map((col) => {
                        const val = (s as any)[col.field];
                        return (
                          <TableCell key={col.field} className="text-center p-1.5">
                            <button
                              onClick={() => handleToggleRequest('sale', String(s.code), col.field, val, s.name)}
                              className={cn(
                                "text-[9px] font-black uppercase tracking-tight py-1 px-2.5 rounded-md border shadow-xs transition-all hover:scale-105 cursor-pointer w-24 text-center",
                                val 
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-900"
                                  : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                              )}
                            >
                              {val ? col.yesLabel : "—"}
                            </button>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">{renderBadge(s.risk)}</TableCell>
                      <TableCell className="text-center p-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-rose-500 hover:text-rose-750 hover:bg-rose-50 rounded-full cursor-pointer"
                          onClick={() => handleRemoveRequest('sale', String(s.code), s.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-400 italic font-semibold">Aucune technique trouvée</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. Moral Activities */}
      {subTab === "moral" && (
        <Card className="border-none bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 px-6 pt-5 bg-slate-50/50 dark:bg-slate-900/20 border-b flex flex-row justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Risques par Secteur / Activité (Personnes Morales)</CardTitle>
              <p className="text-[10px] text-slate-400 mt-0.5">Cliquez sur un facteur pour l&apos;activer/désactiver — calcul automatique du risque et synchronisation collaborative</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenAddModal('moral')}
                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 h-7 px-3 rounded-lg flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Ajouter
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await resetOverrides('moral', authorName);
                  toast({ title: "Paramètres PM réinitialisés", description: "Toutes les activités morales ont retrouvé leurs valeurs d'origine." });
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-7 px-3 rounded-lg"
              >
                Réinitialiser
              </Button>
              <Badge variant="outline" className="font-bold text-slate-500 bg-white dark:bg-slate-900">{filteredMoralActivities.length} activités</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto max-h-[500px]">
            <TooltipProvider>
              <Table className="w-full table-fixed min-w-[1000px]">
                <TableHeader className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                  <TableRow className="bg-slate-50/30 dark:bg-slate-900/10 text-xs">
                    <TableHead className="font-bold w-[12%]">Code</TableHead>
                    <TableHead className="font-bold w-[28%]">Activité</TableHead>
                    {[
                      { header: "Liquide", label: "Manipulation intensive d'argent liquide", field: "cash" },
                      { header: "Objets", label: "Manipulation d'objets de grandes valeurs", field: "objects" },
                      { header: "Volume", label: "Importance du volume des affaires", field: "volume" },
                      { header: "Info", label: "Manque d'information sur la nature de l'activité", field: "noInfo" },
                      { header: "Éval.", label: "Difficulté d'évaluation des produits, services ou livrables", field: "complexEval" },
                      { header: "Interm.", label: "Présence de l'intermédiation", field: "intermediary" },
                      { header: "Corrup.", label: "Exposition à la corruption", field: "corruption" }
                    ].map((col) => (
                      <TableHead key={col.field} className="font-bold text-center w-[6%]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="underline decoration-dotted cursor-help">{col.header}</span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-950 text-white p-2 rounded-lg border-none shadow-xl max-w-[200px]">
                            <p className="text-[10px] font-semibold">{col.label}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                    ))}
                    <TableHead className="font-bold w-[15%]">Remarque</TableHead>
                    <TableHead className="font-bold text-center w-[10%]">Risque</TableHead>
                    <TableHead className="font-bold text-center w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredMoralActivities.map(a => (
                    <TableRow key={a.code} className={cn("hover:bg-slate-50/50 dark:hover:bg-slate-900/20", a.risk === "RE" ? "bg-rose-50/10 dark:bg-rose-950/5" : "")}>
                      <TableCell className="text-slate-500 font-bold">{a.code}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white truncate" title={a.name}>{a.name}</TableCell>
                      {[
                        { field: "cash", label: "Liquide" },
                        { field: "objects", label: "Objets" },
                        { field: "volume", label: "Volume" },
                        { field: "noInfo", label: "Info" },
                        { field: "complexEval", label: "Éval." },
                        { field: "intermediary", label: "Interm." },
                        { field: "corruption", label: "Corrup." }
                      ].map((col) => {
                        const val = (a as any)[col.field];
                        return (
                          <TableCell key={col.field} className="text-center p-1.5">
                            <button
                              onClick={() => handleToggleRequest('moral', a.code, col.field, val, a.name)}
                              className={cn(
                                "text-[9px] font-black uppercase tracking-tight py-1 px-2.5 rounded-md border shadow-xs transition-all hover:scale-105 cursor-pointer w-12 text-center",
                                val 
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-900"
                                  : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                              )}
                            >
                              {val ? "Oui" : "—"}
                            </button>
                          </TableCell>
                        );
                      })}
                      <TableCell className="p-2 w-[15%]">
                        {editingCell?.category === 'moral' && editingCell?.itemId === a.code ? (
                          <Input
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
                            onBlur={() => handleSaveComment('moral', a.code, 'comment', a.comment || '')}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveComment('moral', a.code, 'comment', a.comment || '');
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="h-7 text-xs bg-white dark:bg-slate-950 font-bold"
                          />
                        ) : (
                          <div
                            onClick={() => {
                              setEditingCell({ category: 'moral', itemId: a.code, field: 'comment' });
                              setEditingText(a.comment || '');
                            }}
                            className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded min-h-[28px] italic text-slate-500 truncate font-semibold"
                            title={a.comment || "Cliquez pour ajouter une remarque"}
                          >
                            {a.comment || <span className="text-slate-300 dark:text-slate-600 font-normal">Ajouter...</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{renderBadge(a.risk)}</TableCell>
                      <TableCell className="text-center p-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-rose-500 hover:text-rose-750 hover:bg-rose-50 rounded-full cursor-pointer"
                          onClick={() => handleRemoveRequest('moral', a.code, a.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredMoralActivities.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-10 text-slate-400 italic font-semibold">Aucune activité trouvée</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TooltipProvider>
          </CardContent>
        </Card>
      )}

      {/* 7. Physical Professions */}
      {subTab === "physical" && (
        <Card className="border-none bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 px-6 pt-5 bg-slate-50/50 dark:bg-slate-900/20 border-b flex flex-row justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Risques par Profession (Personnes Physiques)</CardTitle>
              <p className="text-[10px] text-slate-400 mt-0.5">Cliquez sur un facteur pour l&apos;activer/désactiver — calcul automatique du risque et synchronisation collaborative</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenAddModal('profession')}
                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 h-7 px-3 rounded-lg flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Ajouter
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await resetOverrides('profession', authorName);
                  toast({ title: "Professions réinitialisées", description: "Toutes les professions ont retrouvé leurs valeurs d'origine." });
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-7 px-3 rounded-lg"
              >
                Réinitialiser les professions
              </Button>
              <Badge variant="outline" className="font-bold text-slate-500 bg-white dark:bg-slate-900">{filteredPhysicalProfessions.length} professions</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto max-h-[500px]">
            <TooltipProvider>
              <Table className="w-full table-fixed min-w-[1000px]">
                <TableHeader className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                  <TableRow className="bg-slate-50/30 dark:bg-slate-900/10 text-xs">
                    <TableHead className="font-bold w-[20%]">Domaine / Secteur</TableHead>
                    <TableHead className="font-bold w-[20%]">Profession</TableHead>
                    {[
                      { header: "Liquide", label: "Manipulation intensive d'argent liquide", field: "cash" },
                      { header: "Objets", label: "Manipulation d'objets de grandes valeurs", field: "objects" },
                      { header: "Volume", label: "Importance du volume des affaires", field: "volume" },
                      { header: "Info", label: "Manque d'information sur la nature de l'activité", field: "noInfo" },
                      { header: "Éval.", label: "Difficulté d'évaluation des produits, services ou livrables", field: "complexEval" },
                      { header: "Interm.", label: "Présence de l'intermédiation", field: "intermediary" },
                      { header: "Corrup.", label: "Exposition à la corruption", field: "corruption" }
                    ].map((col) => (
                      <TableHead key={col.field} className="font-bold text-center w-[7%]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="underline decoration-dotted cursor-help">{col.header}</span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-950 text-white p-2 rounded-lg border-none shadow-xl max-w-[200px]">
                            <p className="text-[10px] font-semibold">{col.label}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                    ))}
                    <TableHead className="font-bold text-center w-[10%]">Risque</TableHead>
                    <TableHead className="font-bold text-center w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredPhysicalProfessions.map((p, idx) => (
                    <TableRow key={idx} className={cn("hover:bg-slate-50/50 dark:hover:bg-slate-900/20", p.risk === "RE" ? "bg-rose-50/10 dark:bg-rose-950/5" : "")}>
                      <TableCell className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider truncate" title={p.domain}>{p.domain}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white truncate" title={p.name}>{p.name}</TableCell>
                      {[
                        { field: "cash", label: "Liquide" },
                        { field: "objects", label: "Objets" },
                        { field: "volume", label: "Volume" },
                        { field: "noInfo", label: "Info" },
                        { field: "complexEval", label: "Éval." },
                        { field: "intermediary", label: "Interm." },
                        { field: "corruption", label: "Corrup." }
                      ].map((col) => {
                        const val = (p as any)[col.field];
                        return (
                          <TableCell key={col.field} className="text-center p-1.5">
                            <button
                              onClick={() => handleToggleRequest('profession', p.name, col.field, val, p.name)}
                              className={cn(
                                "text-[9px] font-black uppercase tracking-tight py-1 px-2.5 rounded-md border shadow-xs transition-all hover:scale-105 cursor-pointer w-12 text-center",
                                val 
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-900"
                                  : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                              )}
                            >
                              {val ? "Oui" : "—"}
                            </button>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">{renderBadge(p.risk)}</TableCell>
                      <TableCell className="text-center p-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-rose-500 hover:text-rose-750 hover:bg-rose-50 rounded-full cursor-pointer"
                          onClick={() => handleRemoveRequest('profession', p.name, p.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPhysicalProfessions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-10 text-slate-400 italic font-semibold">Aucune profession trouvée</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TooltipProvider>
          </CardContent>
        </Card>
      )}

      {/* ── Add Item Modal ────────────────────────────────────────────────── */}
      {addItemModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setAddItemModalOpen(false); }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col"
            style={{ maxHeight: '90vh' }}>

            {/* Header — fixe en haut */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {addItemCategory === 'dist' && '➕ Nouveau Canal de Distribution'}
                  {addItemCategory === 'sale' && '➕ Nouvelle Technique de Vente'}
                  {addItemCategory === 'moral' && '➕ Nouvelle Activité (Personne Morale)'}
                  {addItemCategory === 'profession' && '➕ Nouvelle Profession (Personne Physique)'}
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Les champs marqués d&apos;un * sont obligatoires</p>
              </div>
              <button
                onClick={() => setAddItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0 ml-3"
              >
                ✕
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">

              {/* Code ou Domaine */}
              {addItemCategory === 'profession' ? (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Domaine / Secteur *
                  </label>
                  <select
                    value={newItemData.domain}
                    onChange={e => setNewItemData(d => ({ ...d, domain: e.target.value }))}
                    className="w-full h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer"
                  >
                    <option value="">-- Sélectionner un domaine --</option>
                    <option value="ADMINISTRATION PUBLIQUE">Administration Publique</option>
                    <option value="AGRICULTURE , PECHE ET ENVIRONNEMENT">Agriculture, Pêche et Environnement</option>
                    <option value="ARCHITECTURE ET CONSTRUCTION">Architecture et Construction</option>
                    <option value="ARTISANAT ET METIERS D'ARTS">Artisanat et Métiers d&apos;Arts</option>
                    <option value="ARTS ET CULTURE">Arts et Culture</option>
                    <option value="CONSEIL ET EXPERTISE">Conseil et Expertise</option>
                    <option value="COSMETIQUE ET BIEN ETRE">Cosmétique et Bien-être</option>
                    <option value="DROIT ET JUSTICE">Droit et Justice</option>
                    <option value="EDITION ET PUBLICATION">Édition et Publication</option>
                    <option value="ENSEIGNEMENT ET RECHERCHE">Enseignement et Recherche</option>
                    <option value="FINANCES ET COMMERCE">Finances et Commerce</option>
                    <option value="HOTELLERIE ET RESTAURATION">Hôtellerie et Restauration</option>
                    <option value="INDUSTRIE ET PRODUCTION">Industrie et Production</option>
                    <option value="MEDIAS , INFORMATIONS ET COMMUNICATION">Médias, Informations et Communication</option>
                    <option value="PRODUCTION, DISTRIBUTION DES EAUX ET D'ENERGIE ( ELECTRICITE,GAZ ET ENERGIES RENOUVELABLES)">Production &amp; Distribution Eaux / Énergie</option>
                    <option value="Santé et Médical">Santé et Médical</option>
                    <option value="SERVICES ET ASSISTANCE">Services et Assistance</option>
                    <option value="SOCIAL ET HUMANITAIRE">Social et Humanitaire</option>
                    <option value="SPORT ET LOISIRS">Sport et Loisirs</option>
                    <option value="TECHNOLOGIES ET INFORMATIQUE">Technologies et Informatique</option>
                    <option value="TRANSPORT ET LOGISTISQUE">Transport et Logistique</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Code *</label>
                  <Input
                    value={newItemData.code}
                    onChange={e => setNewItemData(d => ({ ...d, code: e.target.value }))}
                    placeholder={addItemCategory === 'sale' ? 'ex: 6' : 'ex: C06'}
                    className="h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              )}

              {/* Nom */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  {addItemCategory === 'dist' ? 'Nom du Canal *'
                    : addItemCategory === 'sale' ? 'Nom de la Technique *'
                    : addItemCategory === 'moral' ? "Nom de l'Activité *"
                    : 'Nom de la Profession *'}
                </label>
                <Input
                  value={newItemData.name}
                  onChange={e => setNewItemData(d => ({ ...d, name: e.target.value }))}
                  placeholder="Saisir le nom..."
                  className="h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              {/* Facteurs de risque */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                  Facteurs de Risque
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {addItemCategory === 'dist' && [
                    { field: 'complex' as const, label: 'Difficulté de Contrôle' },
                    { field: 'nonCompliance' as const, label: 'Non-soumission LBC' },
                    { field: 'noCulture' as const, label: 'Pas de culture LBC' },
                  ].map(({ field, label }) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => setNewItemData(d => ({ ...d, [field]: !d[field] }))}
                      className={`text-[10px] font-bold py-2 px-3 rounded-xl border transition-all text-left flex items-center gap-2 ${
                        newItemData[field]
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
                          : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[8px] font-black border ${newItemData[field] ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300'}`}>
                        {newItemData[field] ? '✓' : ''}
                      </span>
                      {label}
                    </button>
                  ))}

                  {addItemCategory === 'sale' && [
                    { field: 'noContact' as const, label: 'Pas de contact direct' },
                    { field: 'noOriginals' as const, label: "Pas d'originaux" },
                  ].map(({ field, label }) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => setNewItemData(d => ({ ...d, [field]: !d[field] }))}
                      className={`text-[10px] font-bold py-2 px-3 rounded-xl border transition-all text-left flex items-center gap-2 ${
                        newItemData[field]
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
                          : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[8px] font-black border ${newItemData[field] ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300'}`}>
                        {newItemData[field] ? '✓' : ''}
                      </span>
                      {label}
                    </button>
                  ))}

                  {(addItemCategory === 'moral' || addItemCategory === 'profession') && [
                    { field: 'cash' as const, label: 'Argent liquide' },
                    { field: 'objects' as const, label: 'Objets de valeur' },
                    { field: 'volume' as const, label: 'Volume élevé' },
                    { field: 'noInfo' as const, label: "Manque d'information" },
                    { field: 'complexEval' as const, label: 'Évaluation difficile' },
                    { field: 'intermediary' as const, label: 'Intermédiation' },
                    { field: 'corruption' as const, label: 'Exposition corruption' },
                  ].map(({ field, label }) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => setNewItemData(d => ({ ...d, [field]: !d[field] }))}
                      className={`text-[10px] font-bold py-2 px-3 rounded-xl border transition-all text-left flex items-center gap-2 ${
                        newItemData[field]
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
                          : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[8px] font-black border ${newItemData[field] ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300'}`}>
                        {newItemData[field] ? '✓' : ''}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Risque calculé */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Risque calculé :</span>
                {(() => {
                  let count = 0;
                  if (addItemCategory === 'dist') count = [newItemData.complex, newItemData.nonCompliance, newItemData.noCulture].filter(Boolean).length;
                  else if (addItemCategory === 'sale') count = [newItemData.noContact, newItemData.noOriginals].filter(Boolean).length;
                  else count = [newItemData.cash, newItemData.objects, newItemData.volume, newItemData.noInfo, newItemData.complexEval, newItemData.intermediary, newItemData.corruption].filter(Boolean).length;
                  const risk = count >= 2 ? 'RE' : count === 1 ? 'RM' : 'RF';
                  return renderBadge(risk);
                })()}
                <span className="text-[9px] text-slate-400 ml-auto italic">Calculé automatiquement</span>
              </div>
            </div>

            {/* Footer — fixe en bas, toujours visible */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-900 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setAddItemModalOpen(false)}
                className="text-xs font-bold px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAddSubmit}
                className="text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-white"
                style={{ backgroundColor: '#7c3aed' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed'; }}
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter l&apos;élément
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md p-6 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Confirmer la modification ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Voulez-vous vraiment modifier ce paramètre ? Cette modification mettra à jour la cotation de risque de manière automatique et sera synchronisée en temps réel pour tous les utilisateurs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-2 justify-end">
            <AlertDialogCancel 
              onClick={() => { setConfirmOpen(false); setPendingChange(null); }}
              className="text-xs font-bold px-4 py-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmChange}
              className="text-xs font-bold px-4 py-2 bg-violet-650 hover:bg-violet-700 text-white rounded-xl shadow-md shadow-violet-200 dark:shadow-none transition-all cursor-pointer"
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

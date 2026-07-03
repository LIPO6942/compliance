"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle, ShieldCheck, Globe, MapPin, Package, HelpCircle, Layers, Grid, Users, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

// ── 6. Professions PP ──
const PHYS_PROFESSIONS_DATA = [
  // Agriculture
  { domain: "Agriculture, Pêche & Environnement", name: "Agriculteur", cash: true, objects: false, volume: false, noInfo: false, complexEval: true, intermediary: false, corruption: false, risk: "RE" },
  { domain: "Agriculture, Pêche & Environnement", name: "Apiculteur", cash: true, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RM" },
  { domain: "Agriculture, Pêche & Environnement", name: "Aquaculteur", cash: true, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RM" },
  { domain: "Agriculture, Pêche & Environnement", name: "Botaniste", cash: true, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RM" },
  { domain: "Agriculture, Pêche & Environnement", name: "Chasseur", cash: false, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RF" },
  { domain: "Agriculture, Pêche & Environnement", name: "Cultivateur palmiers-dattiers", cash: true, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE" },
  { domain: "Agriculture, Pêche & Environnement", name: "Éleveur", cash: true, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE" },
  { domain: "Agriculture, Pêche & Environnement", name: "Responsable de ferme", cash: false, objects: false, volume: false, noInfo: false, complexEval: true, intermediary: false, corruption: false, risk: "RM" },
  { domain: "Agriculture, Pêche & Environnement", name: "Viticulteur", cash: true, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE" },
  { domain: "Agriculture, Pêche & Environnement", name: "Ingénieur / Cadre Agricole", cash: false, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RF" },
  
  // Industrie
  { domain: "Industrie & Production", name: "Directeur industriel", cash: false, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RF" },
  { domain: "Industrie & Production", name: "Responsable HSE", cash: false, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: true, risk: "RM" },
  { domain: "Industrie & Production", name: "Responsable Qualité", cash: false, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: true, risk: "RM" },
  { domain: "Industrie & Production", name: "Ingénieur de production", cash: false, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RF" },
  { domain: "Industrie & Production", name: "Technicien / Ouvrier", cash: false, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RF" },

  // Architecture
  { domain: "Architecture & Construction", name: "Architecte / Design d'intérieur", cash: false, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RF" },
  { domain: "Architecture & Construction", name: "Conducteur de travaux", cash: false, objects: true, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RM" },
  { domain: "Architecture & Construction", name: "Diagnostiqueur immobilier", cash: false, objects: true, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RM" },
  { domain: "Architecture & Construction", name: "Electricien Bâtiment", cash: true, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RM" },
  { domain: "Architecture & Construction", name: "Expert en pathologie du bâtiment", cash: false, objects: true, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: true, risk: "RE" },
  { domain: "Architecture & Construction", name: "Gérant de patrimoine immobilier", cash: false, objects: true, volume: false, noInfo: false, complexEval: false, intermediary: true, corruption: false, risk: "RE" },
  { domain: "Architecture & Construction", name: "Ingénieur génie civil", cash: true, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE" },
  { domain: "Architecture & Construction", name: "Responsable de projet immobilier", cash: false, objects: true, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RE" },
  { domain: "Architecture & Construction", name: "Responsable qualité construction", cash: false, objects: true, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: true, risk: "RE" },
  { domain: "Architecture & Construction", name: "Urbaniste", cash: false, objects: false, volume: true, noInfo: false, complexEval: false, intermediary: false, corruption: true, risk: "RE" },

  // Finance
  { domain: "Finances & Commerce", name: "Agent immobilier", cash: true, objects: false, volume: false, noInfo: false, complexEval: true, intermediary: true, corruption: false, risk: "RE" },
  { domain: "Finances & Commerce", name: "Agent de change", cash: true, objects: false, volume: true, noInfo: false, complexEval: true, intermediary: false, corruption: false, risk: "RE" },
  { domain: "Finances & Commerce", name: "Banquier / Assureur", cash: true, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: true, corruption: false, risk: "RE" },
  { domain: "Finances & Commerce", name: "Commerçant équipements industriels/gros", cash: true, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RM" },
  { domain: "Finances & Commerce", name: "Commerçant de détails / informatique", cash: true, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RM" },
  { domain: "Finances & Commerce", name: "Comptable", cash: false, objects: false, volume: false, noInfo: false, complexEval: true, intermediary: false, corruption: false, risk: "RM" },
  { domain: "Finances & Commerce", name: "Commercial", cash: false, objects: false, volume: false, noInfo: false, complexEval: true, intermediary: true, corruption: false, risk: "RE" },
  { domain: "Finances & Commerce", name: "Médiateur d'entreprise", cash: false, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: true, corruption: true, risk: "RE" },
  { domain: "Finances & Commerce", name: "Gestionnaire de portefeuille", cash: false, objects: true, volume: false, noInfo: false, complexEval: false, intermediary: true, corruption: false, risk: "RE" },
  { domain: "Finances & Commerce", name: "Marchand de véhicules", cash: true, objects: true, volume: false, noInfo: false, complexEval: true, intermediary: false, corruption: false, risk: "RE" },
  { domain: "Finances & Commerce", name: "Vendeur en ligne", cash: true, objects: false, volume: true, noInfo: true, complexEval: false, intermediary: false, corruption: false, risk: "RE" },
  { domain: "Finances & Commerce", name: "Analyste financier / Actuaire", cash: false, objects: false, volume: false, noInfo: false, complexEval: false, intermediary: false, corruption: false, risk: "RF" }
];

export function RiskMatrixTab() {
  const [subTab, setSubTab] = React.useState<"params" | "countries" | "govs" | "products" | "dist" | "moral" | "physical">("params");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [riskFilter, setRiskFilter] = React.useState<"all" | "RE" | "RM" | "RF">("all");

  const filteredCountries = React.useMemo(() => {
    return COUNTRIES_DATA.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.alpha3.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === "all" || c.risk === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [searchQuery, riskFilter]);

  const filteredGovs = React.useMemo(() => {
    return GOVERNORATES_DATA.filter(g => {
      const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.nameAr.includes(searchQuery);
      const matchesRisk = riskFilter === "all" || g.risk === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [searchQuery, riskFilter]);

  const filteredProducts = React.useMemo(() => {
    return PRODUCTS_DATA.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === "all" || p.risk === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [searchQuery, riskFilter]);

  const filteredMoralActivities = React.useMemo(() => {
    return MORAL_ACTIVITIES_DATA.filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === "all" || a.risk === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [searchQuery, riskFilter]);

  const filteredPhysicalProfessions = React.useMemo(() => {
    return PHYS_PROFESSIONS_DATA.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.domain.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === "all" || p.risk === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [searchQuery, riskFilter]);

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

  return (
    <div className="space-y-6">
      {/* Risk Thresholds Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {RISK_LEVELS.map(lvl => (
          <Card key={lvl.label} className={cn("border-2 shadow-sm", lvl.color)}>
            <CardHeader className="pb-2 p-5">
              <CardDescription className="text-[10px] font-black uppercase tracking-wider opacity-60">Matrice KYC Threshold</CardDescription>
              <CardTitle className="text-lg font-black">{lvl.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <span className="text-2xl font-black">{lvl.range}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sub tabs navigation */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex flex-wrap gap-1 bg-slate-100/60 dark:bg-slate-900/60 p-1 rounded-xl border">
          {[
            { id: "params", label: "Pondérations & Structure", icon: Layers },
            { id: "countries", label: "Pays", icon: Globe },
            { id: "govs", label: "Gouvernorats (TN)", icon: MapPin },
            { id: "products", label: "Produits d'Assurance", icon: Package },
            { id: "dist", label: "Canaux & Ventes", icon: Grid },
            { id: "moral", label: "Activités Morales", icon: Landmark },
            { id: "physical", label: "Professions PP", icon: Users }
          ].map(tab => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setSubTab(tab.id as any); setSearchQuery(""); setRiskFilter("all"); }}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  active
                    ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
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
          </div>
        )}
      </div>

      {/* ── Sub-tab contents ── */}

      {/* 1. Structural parameters */}
      {subTab === "params" && (
        <Card className="border-none bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 px-6 pt-5 bg-slate-50/50 dark:bg-slate-900/20 border-b">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Pondérations des facteurs KYC</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/30 dark:bg-slate-900/10 text-xs">
                  <TableHead className="font-bold">Facteur d&apos;évaluation</TableHead>
                  <TableHead className="font-bold">Champs KYC Physi.</TableHead>
                  <TableHead className="font-bold">Champs KYC Morale</TableHead>
                  <TableHead className="font-bold">Champs KYC OBNL</TableHead>
                  <TableHead className="font-bold text-center">Coeff</TableHead>
                  <TableHead className="font-bold text-center">Agrégation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                  <TableCell className="font-bold text-slate-900 dark:text-white">Zones Géographiques (Pays)</TableCell>
                  <TableCell>Nationalité, Pays de résidence, Deuxième nationalité</TableCell>
                  <TableCell>Pays</TableCell>
                  <TableCell>Pays, Adresse de résidence principale</TableCell>
                  <TableCell className="text-center font-bold">1</TableCell>
                  <TableCell className="text-center"><Badge>Max</Badge></TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                  <TableCell className="font-bold text-slate-900 dark:text-white">Zones Géographiques (Gouvernorats)</TableCell>
                  <TableCell>Pays de résidence, Gouvernorat</TableCell>
                  <TableCell>Gouvernorat</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-center font-bold">1</TableCell>
                  <TableCell className="text-center"><Badge>Max</Badge></TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                  <TableCell className="font-bold text-slate-900 dark:text-white">Activité & Profession</TableCell>
                  <TableCell>Statut Professionnel, Profession</TableCell>
                  <TableCell>Nature de l&apos;activité</TableCell>
                  <TableCell>Type d&apos;organisation</TableCell>
                  <TableCell className="text-center font-bold">1</TableCell>
                  <TableCell className="text-center"><Badge>Max</Badge></TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                  <TableCell className="font-bold text-slate-900 dark:text-white">Produit</TableCell>
                  <TableCell>Produit</TableCell>
                  <TableCell>Produit</TableCell>
                  <TableCell>Produit</TableCell>
                  <TableCell className="text-center font-bold">1</TableCell>
                  <TableCell className="text-center"><Badge>-</Badge></TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                  <TableCell className="font-bold text-slate-900 dark:text-white">Canal de distribution</TableCell>
                  <TableCell>Canal de distribution</TableCell>
                  <TableCell>Canal de distribution</TableCell>
                  <TableCell>Canal de distribution</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                  <TableCell className="text-center"><Badge>-</Badge></TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                  <TableCell className="font-bold text-slate-900 dark:text-white">Technique de vente</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-center font-bold">1</TableCell>
                  <TableCell className="text-center"><Badge>-</Badge></TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                  <TableCell className="font-bold text-slate-900 dark:text-white">Statuts spécifiques</TableCell>
                  <TableCell>PPE, OBNL</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>OBNL</TableCell>
                  <TableCell className="text-center font-bold">1</TableCell>
                  <TableCell className="text-center"><Badge>-</Badge></TableCell>
                </TableRow>
              </TableBody>
            </Table>
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
            <Badge variant="outline" className="font-bold text-slate-500 bg-white dark:bg-slate-900">{filteredCountries.length} pays trouvés</Badge>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                <TableRow className="bg-slate-50/30 dark:bg-slate-900/10 text-xs">
                  <TableHead className="font-bold text-center w-[80px]">ISO Num</TableHead>
                  <TableHead className="font-bold text-center w-[100px]">ISO Alpha 3</TableHead>
                  <TableHead className="font-bold">Nom du Pays</TableHead>
                  <TableHead className="font-bold text-center w-[120px]">GAFI (Dominant)</TableHead>
                  <TableHead className="font-bold text-center w-[120px]">Corruption CPI</TableHead>
                  <TableHead className="font-bold text-center w-[120px]">Paradis fiscal</TableHead>
                  <TableHead className="font-bold text-center w-[120px]">Terrorisme GTI</TableHead>
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
                    <TableCell className="text-center font-bold">{c.gafi ? "🔴 Oui" : "—"}</TableCell>
                    <TableCell className="text-center font-bold">{c.corruption ? "🔶 CPI < 30" : "—"}</TableCell>
                    <TableCell className="text-center font-bold">{c.oecd ? "🌴 Oui" : "—"}</TableCell>
                    <TableCell className="text-center font-bold">{c.terrorism ? "⚠️ GTI > 6" : "—"}</TableCell>
                    <TableCell className="text-slate-500 italic max-w-[200px] truncate">{c.other || "—"}</TableCell>
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
            <Badge variant="outline" className="font-bold text-slate-500 bg-white dark:bg-slate-900">{filteredGovs.length} gouvernorats</Badge>
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
                    <TableCell className="text-center font-bold">{g.border ? "🛡️ Oui" : "—"}</TableCell>
                    <TableCell className="text-center font-bold">{g.port ? "⚓ Oui" : "—"}</TableCell>
                    <TableCell className="text-center font-bold">{g.airport ? "✈️ Oui" : "—"}</TableCell>
                    <TableCell className="text-center font-bold">{g.market ? "💸 Oui" : "—"}</TableCell>
                    <TableCell className="text-slate-500 italic max-w-[200px] truncate">{g.other || "—"}</TableCell>
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
            <Badge variant="outline" className="font-bold text-slate-500 bg-white dark:bg-slate-900">{filteredProducts.length} contrats</Badge>
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
                    <TableCell className="text-center">{p.liquid ? "💧 Oui" : "—"}</TableCell>
                    <TableCell className="text-center">{p.forex ? "💵 Oui" : "—"}</TableCell>
                    <TableCell className="text-center">{p.highValue ? "💰 Oui" : "—"}</TableCell>
                    <TableCell className="text-center">{p.fraud ? "🚨 Oui" : "—"}</TableCell>
                    <TableCell className="text-center">{p.cap ? "📈 Épargne" : "—"}</TableCell>
                    <TableCell className="text-slate-500 italic max-w-[200px] truncate">{p.comment || "—"}</TableCell>
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
            <CardHeader className="pb-4 px-6 pt-5 bg-slate-50/50 dark:bg-slate-900/20 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Canaux de Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/30 dark:bg-slate-900/10 text-xs">
                    <TableHead className="font-bold text-center w-[80px]">Code</TableHead>
                    <TableHead className="font-bold">Canal</TableHead>
                    <TableHead className="font-bold text-center">Difficulté Contrôle</TableHead>
                    <TableHead className="font-bold text-center">Non-soumission</TableHead>
                    <TableHead className="font-bold text-center w-[100px]">Risque</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {DISTRIBUTION_DATA.map(d => (
                    <TableRow key={d.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                      <TableCell className="text-center text-slate-500">{d.code}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white">{d.name}</TableCell>
                      <TableCell className="text-center">{d.complex ? "⚠️ Oui" : "—"}</TableCell>
                      <TableCell className="text-center">{d.nonCompliance ? "🔴 Oui" : "—"}</TableCell>
                      <TableCell className="text-center">{renderBadge(d.risk)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Techniques de vente */}
          <Card className="border-none bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 px-6 pt-5 bg-slate-50/50 dark:bg-slate-900/20 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Technique de Vente</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/30 dark:bg-slate-900/10 text-xs">
                    <TableHead className="font-bold text-center w-[80px]">Code</TableHead>
                    <TableHead className="font-bold">Voie de distribution / Vente</TableHead>
                    <TableHead className="font-bold text-center">Pas de contact direct</TableHead>
                    <TableHead className="font-bold text-center">Pas d&apos;originaux</TableHead>
                    <TableHead className="font-bold text-center w-[100px]">Risque</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {SALES_TECHNIQUES_DATA.map(s => (
                    <TableRow key={s.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                      <TableCell className="text-center text-slate-500 font-bold">{s.code}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white">{s.name}</TableCell>
                      <TableCell className="text-center">{s.noContact ? "🌐 Oui" : "—"}</TableCell>
                      <TableCell className="text-center">{s.noOriginals ? "📄 Oui" : "—"}</TableCell>
                      <TableCell className="text-center">{renderBadge(s.risk)}</TableCell>
                    </TableRow>
                  ))}
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
              <p className="text-[10px] text-slate-400 mt-0.5">Cotations réglementaires applicables aux clients personnes morales</p>
            </div>
            <Badge variant="outline" className="font-bold text-slate-500 bg-white dark:bg-slate-900">{filteredMoralActivities.length} activités</Badge>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                <TableRow className="bg-slate-50/30 dark:bg-slate-900/10 text-xs">
                  <TableHead className="font-bold text-center w-[80px]">Code</TableHead>
                  <TableHead className="font-bold">Activité</TableHead>
                  <TableHead className="font-bold text-center">Liquide</TableHead>
                  <TableHead className="font-bold text-center">Objets de valeur</TableHead>
                  <TableHead className="font-bold text-center">Volume</TableHead>
                  <TableHead className="font-bold text-center">Manque Info</TableHead>
                  <TableHead className="font-bold text-center">Complexe</TableHead>
                  <TableHead className="font-bold text-center">Corruption</TableHead>
                  <TableHead className="font-bold">Remarque</TableHead>
                  <TableHead className="font-bold text-center w-[100px]">Risque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredMoralActivities.map(a => (
                  <TableRow key={a.code} className={cn("hover:bg-slate-50/50 dark:hover:bg-slate-900/20", a.risk === "RE" ? "bg-rose-50/10 dark:bg-rose-950/5" : "")}>
                    <TableCell className="text-center text-slate-500">{a.code}</TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white max-w-[240px] truncate" title={a.name}>{a.name}</TableCell>
                    <TableCell className="text-center">{a.cash ? "💵 Oui" : "—"}</TableCell>
                    <TableCell className="text-center">{a.objects ? "💎 Oui" : "—"}</TableCell>
                    <TableCell className="text-center">{a.volume ? "📈 Oui" : "—"}</TableCell>
                    <TableCell className="text-center">{a.noInfo ? "⚠️ Oui" : "—"}</TableCell>
                    <TableCell className="text-center">{a.complexEval ? "🧠 Oui" : "—"}</TableCell>
                    <TableCell className="text-center">{a.corruption ? "🔥 Oui" : "—"}</TableCell>
                    <TableCell className="text-slate-500 italic max-w-[150px] truncate">{a.comment || "—"}</TableCell>
                    <TableCell className="text-center">{renderBadge(a.risk)}</TableCell>
                  </TableRow>
                ))}
                {filteredMoralActivities.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-slate-400 italic font-semibold">Aucune activité trouvée</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 7. Physical Professions */}
      {subTab === "physical" && (
        <Card className="border-none bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 px-6 pt-5 bg-slate-50/50 dark:bg-slate-900/20 border-b flex flex-row justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Risques par Profession (Personnes Physiques)</CardTitle>
              <p className="text-[10px] text-slate-400 mt-0.5">Facteurs et indices de risques appliqués aux professions et branches d&apos;activité des clients PP</p>
            </div>
            <Badge variant="outline" className="font-bold text-slate-500 bg-white dark:bg-slate-900">{filteredPhysicalProfessions.length} professions</Badge>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                <TableRow className="bg-slate-50/30 dark:bg-slate-900/10 text-xs">
                  <TableHead className="font-bold">Domaine / Secteur</TableHead>
                  <TableHead className="font-bold">Profession</TableHead>
                  <TableHead className="font-bold text-center">Liquide</TableHead>
                  <TableHead className="font-bold text-center">Objets précieux</TableHead>
                  <TableHead className="font-bold text-center">Volume</TableHead>
                  <TableHead className="font-bold text-center">Intermédiation</TableHead>
                  <TableHead className="font-bold text-center">Corruption</TableHead>
                  <TableHead className="font-bold text-center w-[100px]">Risque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredPhysicalProfessions.map((p, idx) => (
                  <TableRow key={idx} className={cn("hover:bg-slate-50/50 dark:hover:bg-slate-900/20", p.risk === "RE" ? "bg-rose-50/10 dark:bg-rose-950/5" : "")}>
                    <TableCell className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider">{p.domain}</TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white">{p.name}</TableCell>
                    <TableCell className="text-center">{p.cash ? "💵 Oui" : "—"}</TableCell>
                    <TableCell className="text-center">{p.objects ? "💎 Oui" : "—"}</TableCell>
                    <TableCell className="text-center">{p.volume ? "📈 Oui" : "—"}</TableCell>
                    <TableCell className="text-center">{p.intermediary ? "👥 Oui" : "—"}</TableCell>
                    <TableCell className="text-center">{p.corruption ? "🔥 Oui" : "—"}</TableCell>
                    <TableCell className="text-center">{renderBadge(p.risk)}</TableCell>
                  </TableRow>
                ))}
                {filteredPhysicalProfessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400 italic font-semibold">Aucune profession trouvée</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

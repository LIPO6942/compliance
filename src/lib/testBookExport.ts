import ExcelJS from "exceljs";
import { TestCase, Anomaly, TestBookMetadata, TestBookStats } from "@/types/testBook";

// ════════════════════════════════════════════════════════════════════════════
// ── EXPORT EXCEL VIA EXCELJS ──
// ════════════════════════════════════════════════════════════════════════════
export async function exportTestBookExcel(
  testCases: TestCase[],
  anomalies: Anomaly[],
  metadata: TestBookMetadata,
  stats: TestBookStats
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MAE Assurance — Conformité";
  wb.created = new Date();

  // ── FEUILLE 1 : PAGE DE GARDE & SYNTHÈSE ──
  const wsCover = wb.addWorksheet("Page de Garde & Synthèse", {
    views: [{ showGridLines: true }]
  });

  wsCover.columns = [
    { width: 26 },
    { width: 55 }
  ];

  // Titre principal
  wsCover.mergeCells("A1:B1");
  const mainTitleCell = wsCover.getCell("A1");
  mainTitleCell.value = "CAHIER DE RECETTE — REGTOOLS";
  mainTitleCell.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  mainTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
  mainTitleCell.alignment = { vertical: "middle", horizontal: "center" };
  wsCover.getRow(1).height = 42;

  // Métadonnées
  const metaRows = [
    ["Projet", metadata.project],
    ["Éditeur", metadata.editor],
    ["URL", metadata.url],
    ["Environnement", metadata.environment],
    ["Date génération", metadata.generationDate],
    ["Testeur", metadata.tester]
  ];

  let currentRow = 3;
  wsCover.mergeCells(`A${currentRow}:B${currentRow}`);
  const metaHeader = wsCover.getCell(`A${currentRow}`);
  metaHeader.value = "INFORMATIONS DU PROJET";
  metaHeader.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF312E81" } };
  metaHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
  wsCover.getRow(currentRow).height = 24;
  currentRow++;

  metaRows.forEach(([k, v]) => {
    const r = wsCover.getRow(currentRow);
    r.getCell(1).value = k;
    r.getCell(1).font = { bold: true, color: { argb: "FF475569" } };
    r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    r.getCell(2).value = v;
    r.getCell(2).font = { color: { argb: "FF0F172A" } };
    r.height = 20;
    currentRow++;
  });

  currentRow += 2;

  // Synthèse KPI
  wsCover.mergeCells(`A${currentRow}:B${currentRow}`);
  const kpiHeader = wsCover.getCell(`A${currentRow}`);
  kpiHeader.value = "SYNTHÈSE DES RÉSULTATS DE RECETTE";
  kpiHeader.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF1E293B" } };
  kpiHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  wsCover.getRow(currentRow).height = 24;
  currentRow++;

  const kpiData = [
    ["Total cas de test", stats.total],
    ["✅  OK — Conformes", stats.okCount],
    ["❌  KO — Anomalies", stats.koCount],
    ["⏭️  Non encore testé", stats.pendingCount],
    ["🚨 Anomalies critiques", stats.criticalAnomalies],
    ["⚠️ Anomalies hautes", stats.highAnomalies],
    ["📊 Taux de conformité (OK / Total)", `${stats.progressRate}%`],
    ["📈 Taux d'exécution globale", `${stats.executionRate}%`]
  ];

  kpiData.forEach(([k, v]) => {
    const r = wsCover.getRow(currentRow);
    r.getCell(1).value = k;
    r.getCell(1).font = { bold: true };
    r.getCell(2).value = v;
    r.getCell(2).font = { bold: true };
    r.height = 20;
    currentRow++;
  });

  // ── FEUILLE 2 : CAS DE TEST ──
  const wsTests = wb.addWorksheet("Cas de Test", {
    views: [{ showGridLines: true }]
  });

  wsTests.columns = [
    { header: "ID Test", key: "id", width: 12 },
    { header: "Module", key: "module", width: 22 },
    { header: "Titre du test", key: "title", width: 38 },
    { header: "Étapes", key: "steps", width: 45 },
    { header: "Résultat attendu", key: "expectedResult", width: 38 },
    { header: "Statut", key: "status", width: 18 },
    { header: "Anomalie liée", key: "linkedAnomaly", width: 16 },
    { header: "Commentaire / Observé", key: "comment", width: 45 }
  ];

  const testHeaderRow = wsTests.getRow(1);
  testHeaderRow.height = 30;
  testHeaderRow.eachCell(cell => {
    cell.font = { name: "Segoe UI", bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  testCases.forEach((tc) => {
    const row = wsTests.addRow({
      id: tc.id,
      module: tc.module,
      title: tc.title,
      steps: tc.steps,
      expectedResult: tc.expectedResult,
      status: tc.status,
      linkedAnomaly: tc.linkedAnomaly || "-",
      comment: tc.comment || "-"
    });

    row.alignment = { vertical: "middle", wrapText: true };
    row.font = { name: "Segoe UI", size: 9.5 };

    const statusCell = row.getCell(6);
    statusCell.alignment = { vertical: "middle", horizontal: "center" };
    if (tc.status === "OK") {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
      statusCell.font = { bold: true, color: { argb: "FF15803D" } };
    } else if (tc.status === "KO") {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
      statusCell.font = { bold: true, color: { argb: "FFB91C1C" } };
    } else {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      statusCell.font = { bold: true, color: { argb: "FF64748B" } };
    }
  });

  // ── FEUILLE 3 : ANOMALIES SIGNALÉES ──
  const wsAno = wb.addWorksheet("Anomalies Signalées", {
    views: [{ showGridLines: true }]
  });

  wsAno.columns = [
    { header: "ID Anomalie", key: "id", width: 14 },
    { header: "Module", key: "module", width: 24 },
    { header: "Description de l'anomalie", key: "description", width: 50 },
    { header: "Impact métier", key: "businessImpact", width: 45 },
    { header: "Priorité", key: "priority", width: 16 },
    { header: "Statut", key: "status", width: 16 },
    { header: "Test lié", key: "linkedTest", width: 18 }
  ];

  const anoHeaderRow = wsAno.getRow(1);
  anoHeaderRow.height = 30;
  anoHeaderRow.eachCell(cell => {
    cell.font = { name: "Segoe UI", bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE11D48" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  anomalies.forEach((ano) => {
    const isResolved = ano.status === "RESOLUE";
    const row = wsAno.addRow({
      id: ano.id,
      module: ano.module,
      description: ano.description,
      businessImpact: ano.businessImpact,
      priority: ano.priority,
      status: isResolved ? "RÉSOLUE" : "OUVERTE",
      linkedTest: ano.linkedTest
    });

    row.alignment = { vertical: "middle", wrapText: true };
    row.font = { name: "Segoe UI", size: 9.5 };

    const prioCell = row.getCell(5);
    prioCell.alignment = { vertical: "middle", horizontal: "center" };
    if (ano.priority === "CRITIQUE") {
      prioCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } };
      prioCell.font = { bold: true, color: { argb: "FFE11D48" } };
    } else if (ano.priority === "HAUTE") {
      prioCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEDD5" } };
      prioCell.font = { bold: true, color: { argb: "FFC2410C" } };
    }

    const statusCell = row.getCell(6);
    statusCell.alignment = { vertical: "middle", horizontal: "center" };
    if (isResolved) {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
      statusCell.font = { bold: true, color: { argb: "FF15803D" } };
    } else {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
      statusCell.font = { bold: true, color: { argb: "FFB91C1C" } };
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Cahier_Recette_RegTools_MAE_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════════════════════════════════════
// ── EXPORT PDF / PRINT CERTIFIÉ MAE ──
// ════════════════════════════════════════════════════════════════════════════
export function exportTestBookPDF(
  testCases: TestCase[],
  anomalies: Anomaly[],
  metadata: TestBookMetadata,
  stats: TestBookStats
): void {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Cahier de Recette — RegTools — MAE</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    @page {
      size: A4 landscape;
      margin: 12mm 14mm 12mm 14mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 10.5px;
      line-height: 1.4;
    }

    .page-break {
      page-break-before: always;
      break-before: page;
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }

    .logo-box {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo-img {
      height: 52px;
      object-fit: contain;
    }

    .company-title {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.3px;
    }

    .company-sub {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .doc-badge {
      display: inline-block;
      padding: 6px 14px;
      background: #e0e7ff;
      color: #3730a3;
      border-radius: 16px;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .cover-container {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 175mm;
    }

    .title-banner {
      background: linear-gradient(135deg, #312e81 0%, #4338ca 100%);
      color: #ffffff;
      padding: 24px 30px;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 4px 12px rgba(49, 46, 129, 0.15);
    }

    .title-banner h1 {
      margin: 0 0 6px 0;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .title-banner p {
      margin: 0;
      font-size: 12px;
      opacity: 0.9;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }

    .info-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      padding: 14px 18px;
    }

    .info-card h3 {
      margin: 0 0 10px 0;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #4338ca;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 10px;
    }

    .info-label {
      font-weight: 700;
      color: #64748b;
    }

    .info-val {
      font-weight: 600;
      color: #0f172a;
    }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }

    .kpi-card {
      border-radius: 10px;
      padding: 12px 14px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }

    .kpi-card.ok { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
    .kpi-card.ko { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
    .kpi-card.pending { background: #f8fafc; border-color: #e2e8f0; color: #475569; }
    .kpi-card.critical { background: #fff1f2; border-color: #ffe4e6; color: #e11d48; }

    .kpi-num {
      font-size: 20px;
      font-weight: 900;
      line-height: 1;
      margin-bottom: 4px;
    }

    .kpi-label {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 9.5px;
    }

    th {
      background: #312e81;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 7px 9px;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border: 1px solid #282568;
    }

    th.center, td.center { text-align: center; }

    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    tr:nth-child(even) {
      background: #f8fafc;
    }

    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 10px;
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .badge-ok { background: #dcfce7; color: #15803d; }
    .badge-ko { background: #fee2e2; color: #b91c1c; }
    .badge-pending { background: #f1f5f9; color: #64748b; }
    .badge-critique { background: #ffe4e6; color: #e11d48; border: 1px solid #fecdd3; }
    .badge-haute { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }

    .footer-note {
      text-align: center;
      font-size: 8.5px;
      color: #94a3b8;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-top: 14px;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
    }
  </style>
</head>
<body>

  <!-- ════════ PAGE 1 : COUVERTURE & SYNTHÈSE ════════ -->
  <div class="cover-container">
    <div>
      <div class="header-bar">
        <div class="logo-box">
          <img src="${origin}/mae_logo.png" alt="MAE Logo" class="logo-img" onerror="this.style.display='none'" />
          <div>
            <div class="company-title">MAE ASSURANCE</div>
            <div class="company-sub">Direction Conformité & Contrôle Interne</div>
          </div>
        </div>
        <div>
          <span class="doc-badge">Cahier de Recette Officiel</span>
        </div>
      </div>

      <div class="title-banner">
        <h1>Cahier de Recette — RegTools</h1>
        <p>Bilan de la campagne de tests d'homologation de conformité & analyse des écarts</p>
      </div>

      <div class="meta-grid">
        <div class="info-card">
          <h3>Fiche d'Information Projet</h3>
          <div class="info-row">
            <span class="info-label">Projet :</span>
            <span class="info-val">${metadata.project}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Éditeur / Client :</span>
            <span class="info-val">${metadata.editor}</span>
          </div>
          <div class="info-row">
            <span class="info-label">URL Cible :</span>
            <span class="info-val">${metadata.url}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Environnement :</span>
            <span class="info-val">${metadata.environment}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date d'édition :</span>
            <span class="info-val">${metadata.generationDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Testeur :</span>
            <span class="info-val">${metadata.tester}</span>
          </div>
        </div>

        <div class="info-card">
          <h3>Légende des Statuts d'Exécution</h3>
          <div class="info-row">
            <span class="badge badge-ok">✅ OK</span>
            <span class="info-val">Test réussi — comportement conforme aux spécifications</span>
          </div>
          <div class="info-row">
            <span class="badge badge-ko">❌ KO</span>
            <span class="info-val">Anomalie confirmée — comportement non conforme à corriger</span>
          </div>
          <div class="info-row">
            <span class="badge badge-pending">⏭️ Non testé</span>
            <span class="info-val">Non exécuté — planifié pour la prochaine campagne</span>
          </div>
          <div class="info-row">
            <span class="badge badge-critique">CRITIQUE</span>
            <span class="info-val">Bloquant réglementaire ou risque légal direct</span>
          </div>
          <div class="info-row">
            <span class="badge badge-haute">HAUTE</span>
            <span class="info-val">Impact métier significatif / perte de traçabilité</span>
          </div>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi-card ok">
          <div class="kpi-num">${stats.okCount}</div>
          <div class="kpi-label">Tests Conformes (OK)</div>
        </div>
        <div class="kpi-card ko">
          <div class="kpi-num">${stats.koCount}</div>
          <div class="kpi-label">Anomalies Détectées (KO)</div>
        </div>
        <div class="kpi-card pending">
          <div class="kpi-num">${stats.pendingCount}</div>
          <div class="kpi-label">En Attente / Non Testés</div>
        </div>
        <div class="kpi-card critical">
          <div class="kpi-num">${stats.criticalAnomalies}</div>
          <div class="kpi-label">Anomalies Critiques</div>
        </div>
      </div>
    </div>

    <div class="footer-note">
      MAE ASSURANCE — CAHIER DE RECETTE REGTOOLS | DOCUMENT OFFICIEL DE CONFORMITÉ
    </div>
  </div>

  <!-- ════════ PAGE 2 : CAS DE TEST ════════ -->
  <div class="page-break"></div>

  <div class="header-bar">
    <div class="logo-box">
      <div>
        <div class="company-title">MAE ASSURANCE — REGTOOLS</div>
        <div class="company-sub">Tableau des Cas de Test d'Homologation</div>
      </div>
    </div>
    <span class="doc-badge">Détail des ${testCases.length} Cas de Test</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 7%;">ID</th>
        <th style="width: 14%;">Module</th>
        <th style="width: 22%;">Titre du Test</th>
        <th style="width: 25%;">Étapes de Reproduction</th>
        <th style="width: 20%;">Résultat Attendu</th>
        <th class="center" style="width: 12%;">Statut</th>
      </tr>
    </thead>
    <tbody>
      ${testCases.map(tc => `
        <tr>
          <td style="font-weight: 800; font-family: monospace;">${tc.id}</td>
          <td style="font-weight: 700; color: #4338ca;">${tc.module}</td>
          <td style="font-weight: 600;">
            ${tc.title}
            ${tc.linkedAnomaly ? `<div style="font-size: 8px; color: #b91c1c; font-weight: 700; margin-top: 2px;">⚠️ Anomalie : ${tc.linkedAnomaly}</div>` : ''}
            ${tc.comment ? `<div style="font-size: 8px; color: #64748b; font-style: italic; margin-top: 2px;">💬 ${tc.comment}</div>` : ''}
          </td>
          <td style="white-space: pre-line; font-size: 8.5px; color: #475569;">${tc.steps}</td>
          <td style="font-size: 8.5px; color: #0f172a;">${tc.expectedResult}</td>
          <td class="center">
            <span class="badge ${tc.status === 'OK' ? 'badge-ok' : tc.status === 'KO' ? 'badge-ko' : 'badge-pending'}">
              ${tc.status === 'OK' ? '✅ OK' : tc.status === 'KO' ? '❌ KO' : '⏭️ Non testé'}
            </span>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- ════════ PAGE 3 : ANOMALIES SIGNALÉES ════════ -->
  <div class="page-break"></div>

  <div class="header-bar">
    <div class="logo-box">
      <div>
        <div class="company-title">MAE ASSURANCE — REGTOOLS</div>
        <div class="company-sub">Registre des Anomalies & Impacts Métier</div>
      </div>
    </div>
    <span class="doc-badge" style="background: #ffe4e6; color: #e11d48;">${anomalies.length} Anomalies Signalées</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 10%;">ID</th>
        <th style="width: 16%;">Module</th>
        <th style="width: 32%;">Description de l'Anomalie</th>
        <th style="width: 28%;">Impact Métier & Risque</th>
        <th class="center" style="width: 14%;">Priorité</th>
      </tr>
    </thead>
    <tbody>
      ${anomalies.map(ano => `
        <tr>
          <td style="font-weight: 900; font-family: monospace; color: #b91c1c;">${ano.id}</td>
          <td style="font-weight: 700; color: #334155;">${ano.module}</td>
          <td style="font-size: 9px; font-weight: 500;">
            ${ano.description}
            <div style="font-size: 8px; color: #64748b; margin-top: 2px;">🔗 Test lié : <b>${ano.linkedTest}</b></div>
          </td>
          <td style="font-size: 9px; color: #475569;">${ano.businessImpact || '-'}</td>
          <td class="center">
            <span class="badge ${ano.priority === 'CRITIQUE' ? 'badge-critique' : 'badge-haute'}">
              ${ano.priority === 'CRITIQUE' ? '🚨 CRITIQUE' : '⚠️ HAUTE'}
            </span>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer-note">
    MAE ASSURANCE — RAPPORT D'HOMOLOGATION & CAHIER DE RECETTE | FIN DU DOCUMENT
  </div>

</body>
</html>`;

  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 3000);
    }, 600);
  } catch (err) {
    console.error("Erreur impression :", err);
    window.print();
  }
}

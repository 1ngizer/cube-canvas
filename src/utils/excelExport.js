import * as XLSX from "xlsx";
import {
  calculateBccMetrics,
  calculateLoanAmortizationSchedule,
  calculateEquityValuation,
} from "./finance";

/**
 * Genera y descarga un libro de Excel (.xlsx) estructurado con el modelo BCC completo.
 */
export function exportCanvasToExcel(state) {
  const metrics = calculateBccMetrics(state);
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // 1. HOJA RESUMEN BCC
  // -------------------------------------------------------------
  const totalCash =
    (state.cashData?.cashOnHand || 0) +
    (state.cashData?.bankAccounts || 0) +
    (state.cashData?.platforms || 0);

  const summaryData = [
    ["BUSINESS CUBE COMMANDS (BCC) - REPORTE EJECUTIVO DE CRECIMIENTO"],
    ["Generado por iNGIZER Capital Stack Engine", "", "", new Date().toLocaleDateString()],
    [],
    ["1. FICHA DEL NEGOCIO", ""],
    ["Nombre de la Empresa", state.name || "Sin nombre"],
    ["North Star Metric (NSM)", `${state.nsmMetricName || "Ventas"} (Meta: ${state.nsmGoal || "10X"})`],
    ["Segmento Objetivo", state.targetCustomer || "No especificado"],
    ["Propuesta de Valor", state.valueProposition || "No especificada"],
    [],
    ["2. INDICADORES CLAVE DE VIABILIDAD Y CAPITAL STACK", ""],
    ["Disponibilidad de Caja Actual", totalCash],
    ["Caja Menor / Efectivo", state.cashData?.cashOnHand || 0],
    ["Cuentas Bancarias", state.cashData?.bankAccounts || 0],
    ["Pasarelas de Pago (Wompi, Bold, etc.)", state.cashData?.platforms || 0],
    ["Cartera por Cobrar (Clientes)", state.cashData?.receivables || 0],
    [],
    ["Inversión Capex en Activos / Maquinaria (A)", metrics.totalCapexNeeded],
    ["Ventas Proyectadas Mensuales (P1..P9)", metrics.totalProductSales],
    ["Costos Directos (COGS)", metrics.totalCogs],
    ["Gastos Operacionales Mensuales (W)", metrics.totalOpexW],
    ["Utilidad Operacional Proyectada (EBITDA)", metrics.operatingProfit],
    [],
    ["Servicio de Deuda Total Mensual", metrics.totalMonthlyDebtService],
    ["- Cuota Financista de Activo [4B]", metrics.monthlyAssetDebtService],
    ["- Cuota Crédito Bancario [4C]", metrics.monthlyBankDebtService],
    ["Flujo de Caja Libre Mensual", metrics.netFreeCashFlow],
    ["Ratio de Cobertura de Deuda (DSCR)", metrics.coverageRatio],
    ["Estado de Viabilidad", metrics.coverageRatio >= 1.25 ? "Saludable (Verde)" : metrics.coverageRatio >= 1.0 ? "Ajustado (Amarillo)" : "Riesgo de Asfixia (Rojo)"],
    ["Runway Actual (Meses)", metrics.runwayMonths],
    ["Quemado Neto Mensual (Burn Rate)", metrics.monthlyBurnRate],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 42 }, { wch: 25 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen BCC");

  // -------------------------------------------------------------
  // 2. HOJA REQUERIMIENTOS 2C (W, A, SS)
  // -------------------------------------------------------------
  const reqHeaders = ["Área Funcional", "Trabajo (W) - Mensual", "Activos Capex (A)", "Capital de Trabajo (SS)", "Total Área"];
  const areas = [
    { key: "production", label: "Producción & Cocina (Horno, etc.)" },
    { key: "marketing", label: "Marketing & Ventas" },
    { key: "support", label: "Soporte & Clientes" },
    { key: "administration", label: "Administración & Legal" },
    { key: "development", label: "Desarrollo & Tecnología" },
  ];

  const reqRows = areas.map((a) => {
    const data = state.requirements?.[a.key] || { w: 0, a: 0, ss: 0 };
    const tot = (data.w || 0) + (data.a || 0) + (data.ss || 0);
    return [a.label, data.w || 0, data.a || 0, data.ss || 0, tot];
  });

  reqRows.push([
    "TOTAL REQUERIMIENTOS",
    metrics.totalOpexW,
    metrics.totalCapexNeeded,
    metrics.totalWorkingCapitalNeeded,
    metrics.totalOpexW + metrics.totalCapexNeeded + metrics.totalWorkingCapitalNeeded,
  ]);

  const wsReq = XLSX.utils.aoa_to_sheet([["DESGLOSE DE REQUERIMIENTOS DE INVERSIÓN [2C]"], [], reqHeaders, ...reqRows]);
  wsReq["!cols"] = [{ wch: 35 }, { wch: 24 }, { wch: 20 }, { wch: 22 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsReq, "Requerimientos 2C");

  // -------------------------------------------------------------
  // 3. HOJA PRODUCTOS & VENTAS 1D
  // -------------------------------------------------------------
  const prodHeaders = ["Código", "Producto / Línea de Negocio", "Ventas Proyectadas ($/mes)", "Consumo / Unidades", "Crecimiento Estimado (%)"];
  const prodRows = (state.products || []).map((p) => [
    p.id,
    p.name,
    p.income || 0,
    p.consumption || 0,
    `${p.growth || 0}%`,
  ]);

  prodRows.push(["TOTAL", "Suma de Líneas de Producto", metrics.totalProductSales, "", ""]);

  const wsProd = XLSX.utils.aoa_to_sheet([["PROYECCIÓN DE PRODUCTOS Y VENTAS [1D]"], [], prodHeaders, ...prodRows]);
  wsProd["!cols"] = [{ wch: 10 }, { wch: 35 }, { wch: 25 }, { wch: 20 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsProd, "Productos 1D");

  // -------------------------------------------------------------
  // 4. HOJA CAPITAL STACK & AMORTIZACIÓN BANCARIA [4C]
  // -------------------------------------------------------------
  const bankLoan = state.fundingSources?.bankLoan || 0;
  const bankRateEA = state.fundingSources?.bankRateEA || 20;
  const bankTermMonths = state.fundingSources?.bankTermMonths || 36;
  const bankSchedule = calculateLoanAmortizationSchedule(bankLoan, bankRateEA, bankTermMonths, bankTermMonths);

  const equityVal = calculateEquityValuation(
    state.fundingSources?.equityInvestorCapital || 0,
    state.fundingSources?.equityOfferedPercent || 0
  );

  const capitalStackData = [
    ["ESTRUCTURA DE CAPITAL Y FUENTES DE FINANCIACIÓN (CAPITAL STACK)"],
    [],
    ["FUENTES DE BOOTSTRAPPING (TRACCIÓN INTERNA)", ""],
    ["Aporte de Fundador / Master [3A]", state.fundingSources?.masterEquity || 0],
    ["Aportes del Equipo / Colaboradores [3C]", state.fundingSources?.teamContributions || 0],
    [],
    ["FUENTES DE BLITZSCALING (FINANCIAMIENTO EXTERNO)", ""],
    ["Inversionista de Equity [4A] (Capital)", state.fundingSources?.equityInvestorCapital || 0],
    ["Participación Ofrecida (%)", `${state.fundingSources?.equityOfferedPercent || 0}%`],
    ["Valoración Post-Money Implícita", equityVal.postMoney],
    ["Valoración Pre-Money Implícita", equityVal.preMoney],
    [],
    ["Inversionista de Activo / Deuda Privada [4B]", state.fundingSources?.assetInvestorCapital || 0],
    ["Plazo de Retorno (Meses)", state.fundingSources?.assetInvestorTermMonths || 24],
    ["Tasa de Rendimiento Pactada (%)", `${state.fundingSources?.assetInvestorReturnPercent || 15}%`],
    ["Cuota Mensual Comprometida", metrics.monthlyAssetDebtService],
    [],
    ["Crédito Bancario Tradicional [4C]", bankLoan],
    ["Tasa de Interés Efectiva Anual (E.A.)", `${bankRateEA}%`],
    ["Plazo de Amortización (Meses)", bankTermMonths],
    ["Cuota Fija Mensual (Fórmula Francesa)", metrics.monthlyBankDebtService],
    [],
    ["TABLA DE AMORTIZACIÓN MENSUAL DEL CRÉDITO BANCARIO [4C]"],
    ["Mes", "Saldo Inicial", "Cuota Fija", "Intereses", "Abono Capital", "Saldo Final"],
    ...bankSchedule.map((row) => [
      row.month,
      row.startingBalance,
      row.payment,
      row.interest,
      row.principal,
      row.endingBalance,
    ]),
  ];

  const wsStack = XLSX.utils.aoa_to_sheet(capitalStackData);
  wsStack["!cols"] = [{ wch: 38 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsStack, "Capital Stack & Amortización");

  // Descargar archivo Excel
  const safeName = (state.name || "simulacion").toLowerCase().replace(/[^a-z0-9]/g, "_");
  XLSX.writeFile(wb, `bcc_cube_canvas_${safeName}.xlsx`);
}

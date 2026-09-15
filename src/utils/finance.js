/**
 * Utilidades financieras y motor de cálculo de flujo de caja para Cube Canvas.
 */

/**
 * Formatea valores numéricos a formato de moneda (COP/USD).
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) return "$ 0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calcula la cuota mensual fija de un crédito mediante el sistema de amortización francés.
 * @param {number} principal - Monto del préstamo
 * @param {number} rateEA - Tasa de interés Efectiva Anual (ej. 20 para 20%)
 * @param {number} months - Plazo en meses (ej. 36)
 * @returns {number} Cuota mensual
 */
export function calculateLoanMonthlyPayment(principal, rateEA, months) {
  const p = Number(principal) || 0;
  const n = Number(months) || 1;
  const ea = (Number(rateEA) || 0) / 100;

  if (p <= 0 || n <= 0) return 0;
  if (ea <= 0) return Math.round(p / n);

  // Conversión de Tasa Efectiva Anual a Tasa Periódica Mensual
  const i = Math.pow(1 + ea, 1 / 12) - 1;
  const payment = (p * i) / (1 - Math.pow(1 + i, -n));
  return Math.round(payment);
}

/**
 * Genera la tabla de amortización francesa mes a mes.
 * @param {number} principal 
 * @param {number} rateEA 
 * @param {number} months 
 * @param {number} maxRows 
 * @returns {Array<{month: number, payment: number, interest: number, principalPaid: number, balance: number}>}
 */
export function calculateLoanAmortizationSchedule(principal, rateEA, months, maxRows = 12) {
  const p = Number(principal) || 0;
  const n = Number(months) || 1;
  const ea = (Number(rateEA) || 0) / 100;

  if (p <= 0 || n <= 0) return [];
  const i = ea > 0 ? Math.pow(1 + ea, 1 / 12) - 1 : 0;
  const payment = i > 0 ? (p * i) / (1 - Math.pow(1 + i, -n)) : p / n;

  let balance = p;
  const schedule = [];
  const totalMonths = Math.min(n, maxRows);

  for (let m = 1; m <= totalMonths; m++) {
    const interest = balance * i;
    const principalPaid = payment - interest;
    balance = Math.max(0, balance - principalPaid);
    schedule.push({
      month: m,
      payment: Math.round(payment),
      interest: Math.round(interest),
      principalPaid: Math.round(principalPaid),
      balance: Math.round(balance),
    });
  }
  return schedule;
}

/**
 * Calcula valoración pre-money y post-money según el ticket y la participación ofrecida.
 * @param {number} ticket 
 * @param {number} percentOffered 
 * @returns {{postMoney: number, preMoney: number, dilution: number}}
 */
export function calculateEquityValuation(ticket, percentOffered) {
  const t = Number(ticket) || 0;
  const pct = Number(percentOffered) || 0;

  if (t <= 0 || pct <= 0 || pct >= 100) {
    return { postMoney: 0, preMoney: 0, dilution: 0 };
  }

  const postMoney = Math.round(t / (pct / 100));
  const preMoney = postMoney - t;
  return { postMoney, preMoney, dilution: pct };
}

/**
 * Motor central de cálculo para el Business Cube Commands Canvas (BCC).
 * @param {Object} state - Estado completo de la simulación
 * @returns {Object} Resultados calculados, balances y diagnóstico
 */
export function calculateBccMetrics(state) {
  const {
    products = [],
    cashData = {},
    requirements = {},
    fundingSources = {},
    cogsData = {},
    nsmGoal = "10X",
  } = state || {};

  // =========================================================================
  // 1. ESTRATEGIA DE CRECIMIENTO E INGRESOS [1D] (BLOQUE SUPERIOR VERDE)
  // =========================================================================
  let totalProductSales = 0;
  const calculatedProducts = (products || []).map((prod, idx) => {
    const inc = Number(prod.income) || 0;
    const custom = Number(prod.custom) || 0;
    const consumption = Number(prod.consumption) || 0;
    const engagement = Number(prod.engagement) || 0;
    const growth = Number(prod.growth) || 0;
    const experience = Number(prod.experience) || 0;

    // Subtotal por producto [1D]
    const subtotal = inc + custom;
    totalProductSales += subtotal;

    return {
      id: prod.id || `P${idx + 1}`,
      code: `P${idx + 1}`,
      name: prod.name || `Producto ${idx + 1}`,
      income: inc,
      custom,
      consumption,
      engagement,
      growth,
      experience,
      subtotal,
    };
  });

  // =========================================================================
  // 2. DISPONIBILIDAD DE FONDOS Y CARTERA [1C / 1B]
  // =========================================================================
  const cashOnHand = Number(cashData.cashOnHand) || 0;
  const bankAccounts = Number(cashData.bankAccounts) || 0;
  const platforms = Number(cashData.platforms) || 0; // Pasarelas (Wompi, Bold, etc.)
  const otherCash = Number(cashData.otherCash) || 0;
  const receivables = Number(cashData.receivables) || 0; // Cuentas por cobrar [1B]

  const totalCashAvailable = cashOnHand + bankAccounts + platforms + otherCash; // [1C]
  const totalLiquidity = totalCashAvailable + receivables;

  // =========================================================================
  // 3. REQUERIMIENTOS DE CRECIMIENTO (W, A, SS) [2C] (BLOQUE INFERIOR AZUL)
  // =========================================================================
  const areaKeys = ["production", "marketing", "support", "administration", "development"];
  const areaLabels = {
    production: "AREA PRODUCTION",
    marketing: "MARKETING AREA",
    support: "SUPPORT AREA",
    administration: "ADMINISTRATION AREA",
    development: "DEVELOPMENT AREA",
  };

  let totalW = 0; // Trabajo / Nómina
  let totalA = 0; // Activos / CAPEX (Horno, maquinaria)
  let totalSS = 0; // Capital de Trabajo / Suministros
  let totalSGA = 0;

  const calculatedAreas = areaKeys.map((key) => {
    const area = requirements[key] || {};
    const w = Number(area.w) || 0;
    const a = Number(area.a) || 0;
    const ss = Number(area.ss) || 0;
    const areaTotal = w + a + ss;

    totalW += w;
    totalA += a;
    totalSS += ss;
    totalSGA += areaTotal;

    return {
      key,
      label: areaLabels[key],
      w,
      a,
      ss,
      total: areaTotal,
    };
  });

  // Costos de ventas variables (COGS) por producto
  let totalCOGS = 0;
  calculatedProducts.forEach((p) => {
    const cogsVal = Number(cogsData[p.code] || cogsData[p.id]) || 0;
    totalCOGS += cogsVal;
  });

  // Costos operativos mensuales corrientes
  const monthlyOperatingSGA = totalW + totalSS;
  const totalMonthlyOperatingCosts = monthlyOperatingSGA + totalCOGS;

  // Utilidad Operacional Mensual (EBITDA preliminar con la nueva capacidad)
  const operatingProfit = totalProductSales - totalMonthlyOperatingCosts;
  const operatingMarginPercent =
    totalProductSales > 0 ? (operatingProfit / totalProductSales) * 100 : 0;

  // Total Inversión Requerida para crecer (CAPEX: Horno/Activos + Fondo inicial)
  const totalCapexNeeded = totalA;
  const totalInvestmentNeeded = totalA + totalSS;

  // =========================================================================
  // 4. FUENTES DE FINANCIACIÓN (BOOTSTRAPPING VS BLITZSCALING)
  // =========================================================================
  const {
    masterEquity = 0, // [3A] Recursos propios del fundador
    volunteerHoursValue = 0, // [3B] Aportes en especie / mentoría
    teamContributions = 0, // [3C] Aportes del equipo
    bankLoan = 0, // [4C] Crédito bancario
    bankRateEA = 20, // Tasa bancaria EA %
    bankTermMonths = 36, // Plazo meses
    assetInvestorCapital = 0, // [4B] Inversionista que financia el horno/activo
    assetInvestorTermMonths = 24, // Plazo pactado
    assetInvestorReturnPercent = 15, // Retorno anual pactado o margen
    equityInvestorCapital = 0, // [4A] Inversionista de Equity (acciones)
    equityOfferedPercent = 0, // % de la empresa entregado
  } = fundingSources || {};

  // Cuota mensual del crédito bancario
  const monthlyBankPayment = calculateLoanMonthlyPayment(
    bankLoan,
    bankRateEA,
    bankTermMonths
  );

  // Cuota mensual del inversionista de activo (ej. horno de $150M a 24 meses)
  const monthlyAssetPayment = calculateLoanMonthlyPayment(
    assetInvestorCapital,
    assetInvestorReturnPercent,
    assetInvestorTermMonths
  );

  // Total cuotas mensuales comprometidas por deudas/inversionistas de activo
  const totalMonthlyDebtService = monthlyBankPayment + monthlyAssetPayment;

  // Flujo de Caja Libre Mensual (después de pagar cuotas a financistas)
  const netFreeCashFlow = operatingProfit - totalMonthlyDebtService;

  // Cobertura del Servicio de la Deuda (DSCR)
  const coverageRatio =
    totalMonthlyDebtService > 0 ? operatingProfit / totalMonthlyDebtService : 99;

  // Total fondos levantados
  const totalFundsRaised =
    Number(masterEquity) +
    Number(teamContributions) +
    Number(bankLoan) +
    Number(assetInvestorCapital) +
    Number(equityInvestorCapital);

  // Brecha de financiamiento (cuánto falta para cubrir el horno y el capital de trabajo)
  const fundingGap = totalInvestmentNeeded - totalFundsRaised;

  // =========================================================================
  // 5. RUNWAY & BURN RATE [1A / 2A]
  // =========================================================================
  const monthlyBurnRate = totalMonthlyOperatingCosts + totalMonthlyDebtService;
  const netMonthlyBurn = monthlyBurnRate - totalProductSales;
  const runwayMonths =
    netMonthlyBurn > 0
      ? totalCashAvailable / netMonthlyBurn
      : totalCashAvailable > 0
      ? 99 // Genera superávit continuo
      : 0;

  // =========================================================================
  // 6. DIAGNÓSTICO Y SEMÁFORO DE VIABILIDAD
  // =========================================================================
  let status = "healthy";
  let statusTitle = "Plan Viable con Capacidad de Pago Sólida";
  let statusDesc =
    "Tu utilidad operacional proyectada cubre con holgura todas las cuotas de crédito e inversionistas, dejando flujo de caja libre positivo.";
  let statusIcon = "🟢";

  if (operatingProfit <= 0) {
    status = "danger";
    statusTitle = "Operación Inviable (Margen Operativo Negativo)";
    statusDesc =
      "Los ingresos proyectados no cubren los costos operativos mínimos. Se requiere mayor volumen de ventas o recortar gastos.";
    statusIcon = "🔴";
  } else if (coverageRatio < 1.0) {
    status = "danger";
    statusTitle = "Déficit de Cobertura de Deuda (Asfixia de Caja)";
    statusDesc = `La cuota mensual comprometida (${formatCurrency(
      totalMonthlyDebtService
    )}) supera la utilidad mensual (${formatCurrency(
      operatingProfit
    )}). Entrarás en mora o agotarás la caja en poco tiempo.`;
    statusIcon = "🔴";
  } else if (coverageRatio < 1.25) {
    status = "warning";
    statusTitle = "Alerta: Margen de Cobertura Muy Ajustado";
    statusDesc = `La utilidad cubre las cuotas con margen ajustado (DSCR ${coverageRatio.toFixed(
      2
    )}x). Cualquier variación imprevista generará presión sobre la caja.`;
    statusIcon = "🟡";
  }

  // Payback estimado para la inversión total (meses)
  const paybackMonths =
    operatingProfit > 0 ? Math.round(totalInvestmentNeeded / operatingProfit) : 0;

  return {
    // 1. Estrategia & Ventas [1D]
    nsmGoal,
    products: calculatedProducts,
    totalProductSales,

    // 2. Disponibilidad [1C / 1B]
    cashOnHand,
    bankAccounts,
    platforms,
    otherCash,
    receivables,
    totalCashAvailable,
    totalLiquidity,

    // 3. Requerimientos W, A, SS [2C]
    areas: calculatedAreas,
    totalW,
    totalA,
    totalSS,
    totalCapexNeeded,
    totalInvestmentNeeded,
    totalSGA,
    totalCOGS,
    monthlyOperatingSGA,
    totalMonthlyOperatingCosts,
    operatingProfit,
    operatingMarginPercent: Math.round(operatingMarginPercent * 10) / 10,

    // 4. Fuentes de Financiamiento
    fundingSources: {
      masterEquity: Number(masterEquity),
      volunteerHoursValue: Number(volunteerHoursValue),
      teamContributions: Number(teamContributions),
      bankLoan: Number(bankLoan),
      bankRateEA: Number(bankRateEA),
      bankTermMonths: Number(bankTermMonths),
      monthlyBankPayment,
      assetInvestorCapital: Number(assetInvestorCapital),
      assetInvestorTermMonths: Number(assetInvestorTermMonths),
      assetInvestorReturnPercent: Number(assetInvestorReturnPercent),
      monthlyAssetPayment,
      equityInvestorCapital: Number(equityInvestorCapital),
      equityOfferedPercent: Number(equityOfferedPercent),
      totalFundsRaised,
      fundingGap,
    },

    // 5. Viabilidad y Compromisos
    totalMonthlyDebtService,
    netFreeCashFlow,
    coverageRatio: Math.round(coverageRatio * 100) / 100,
    monthlyBurnRate,
    netMonthlyBurn,
    runwayMonths: Math.round(runwayMonths * 10) / 10,
    paybackMonths,

    // 6. Diagnóstico
    status,
    statusTitle,
    statusDesc,
    statusIcon,
  };
}

// Compatibilidad retroactiva
export function calculateCashImpact(formData) {
  const mockState = {
    cashData: {
      cashOnHand: formData.initialCash || 0,
      bankAccounts: 0,
      platforms: 0,
      receivables: 0,
    },
    products: [
      { id: "P1", name: "Línea Principal", income: formData.projectedSales || 0 },
    ],
    requirements: {
      production: { w: formData.fixedCosts || 0, a: 0, ss: 0 },
    },
    cogsData: {
      P1: formData.variableCosts || 0,
    },
    fundingSources: {
      bankLoan: formData.debtPayment ? formData.debtPayment * 30 : 0,
    },
  };
  const bcc = calculateBccMetrics(mockState);
  return {
    initialCash: formData.initialCash || 0,
    debtPayment: formData.debtPayment || 0,
    projectedSales: formData.projectedSales || 0,
    fixedCosts: formData.fixedCosts || 0,
    variableCosts: formData.variableCosts || 0,
    totalOperatingCosts: bcc.totalMonthlyOperatingCosts,
    operatingCashFlow: bcc.operatingProfit,
    finalCash: (formData.initialCash || 0) + bcc.operatingProfit - (formData.debtPayment || 0),
    netCashDelta: bcc.operatingProfit - (formData.debtPayment || 0),
    operatingMarginPercent: bcc.operatingMarginPercent,
    status: bcc.status,
    statusTitle: bcc.statusTitle,
    statusDesc: bcc.statusDesc,
    statusIcon: bcc.statusIcon,
  };
}

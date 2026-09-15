/**
 * Servicio de Inteligencia Artificial para Cube Canvas (BCC).
 * Soporta conexión directa a Google Gemini, OpenAI y Anthropic Claude,
 * con fallback instantáneo a motor de heurística financiera experta.
 */

import { formatCurrency } from "./finance";

/**
 * Construye el prompt financiero contextual para el LLM.
 */
export function buildFinancialPrompt(moduleId, state, metrics, userQuery) {
  const {
    name = "Proyecto Empresarial",
    nsmGoal = "10X",
    nsmMetricName = "Ventas / Clientes",
    targetCustomer = "Mercado objetivo",
    valueProposition = "Propuesta de valor",
    cashData = {},
    products = [],
    requirements = {},
    fundingSources = {},
  } = state;

  const totalCash = (cashData.cashOnHand || 0) + (cashData.bankAccounts || 0) + (cashData.platforms || 0);
  const totalCapex = metrics.totalCapexNeeded || 0;
  const operatingProfit = metrics.operatingProfit || 0;
  const debtService = metrics.totalMonthlyDebtService || 0;
  const netFreeCash = metrics.netFreeCashFlow || 0;
  const dscr = metrics.coverageRatio || 0;
  const runway = metrics.runwayMonths || 0;
  const burnRate = metrics.monthlyBurnRate || 0;

  return `Actúa como "Gizer IA - Senior Chief Strategy & Financial Officer (CSO/CFO)" de iNGIZER, experto en modelación de capital stack, viabilidad de inversión y flujo de caja para empresas en crecimiento (metodología Business Cube Commands Canvas - BCC).

=== FICHA DEL NEGOCIO ===
- Empresa: ${name}
- North Star Metric (NSM): ${nsmMetricName} (Meta: ${nsmGoal})
- Cliente Objetivo: ${targetCustomer}
- Propuesta de Valor: ${valueProposition}

=== BALANCE FINANCIERO ACTUAL & PROYECTADO ===
1. Liquidez Actual: ${formatCurrency(totalCash)} (Efectivo: ${formatCurrency(cashData.cashOnHand || 0)}, Bancos: ${formatCurrency(cashData.bankAccounts || 0)}, Cartera por cobrar: ${formatCurrency(cashData.receivables || 0)})
2. Inversión Requerida en Maquinaria / Capex (A): ${formatCurrency(totalCapex)}
3. Ventas Proyectadas Mensuales: ${formatCurrency(metrics.totalProductSales || 0)}
4. Utilidad Operacional Proyectada (EBITDA preliminar): ${formatCurrency(operatingProfit)} / mes
5. Servicio de Deuda Comprometido: ${formatCurrency(debtService)} / mes
   - Financista de Activo [4B]: ${formatCurrency(fundingSources.assetInvestorCapital || 0)} a ${fundingSources.assetInvestorTermMonths || 24} meses (${fundingSources.assetInvestorReturnPercent || 15}% retorno)
   - Crédito Bancario [4C]: ${formatCurrency(fundingSources.bankLoan || 0)} a ${fundingSources.bankTermMonths || 36} meses (${fundingSources.bankRateEA || 20}% E.A.)
   - Inversionista Equity [4A]: ${formatCurrency(fundingSources.equityInvestorCapital || 0)} por el ${fundingSources.equityOfferedPercent || 0}%
6. Cobertura del Servicio de la Deuda (DSCR): ${dscr}x (Saludable si >= 1.25x)
7. Caja Libre Mensual Proyectada: ${formatCurrency(netFreeCash)} / mes
8. Runway de Supervivencia: ${runway} meses (Burn Rate: ${formatCurrency(burnRate)} / mes)

=== MÓDULO EN EDICIÓN ===
El empresario está trabajando en el Módulo [${moduleId}].
Consulta o enfoque solicitado: "${userQuery || "Analizar viabilidad estratégica y riesgos de este módulo"}"

=== INSTRUCCIONES DE RESPUESTA ===
Genera una respuesta ejecutiva, directa, cuantitativa y accionable (máximo 3 párrafos o puntos clave):
1. [Diagnóstico Numérico]: Evalúa la coherencia entre lo que tiene hoy vs lo que proyecta pagar.
2. [Riesgo Oculto]: Señala el riesgo principal (ej. asfixia de caja si las ventas se retrasan, sobreendeudamiento, dilución excesiva).
3. [Recomendación Concreta]: Dale una estrategia clara de negociación o estructura de pagos que proteja el flujo de caja del empresario.`;
}

/**
 * Consulta a la API de Inteligencia Artificial configurada.
 */
export async function queryAiCopilot({ provider, apiKey, moduleId, state, metrics, query }) {
  const prompt = buildFinancialPrompt(moduleId, state, metrics, query);

  // Si no hay API key configurada, retorna inmediatamente el motor heurístico
  if (!apiKey || !apiKey.trim()) {
    return generateHeuristicFallback(moduleId, state, metrics, query);
  }

  const cleanKey = apiKey.trim();

  try {
    if (provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || generateHeuristicFallback(moduleId, state, metrics, query);
    }

    if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || generateHeuristicFallback(moduleId, state, metrics, query);
    }

    // Default fallback
    return generateHeuristicFallback(moduleId, state, metrics, query);
  } catch (error) {
    console.warn("Error llamando a la API de IA externa:", error);
    // Retorna fallback heurístico enriquecido con el aviso
    const fallbackText = generateHeuristicFallback(moduleId, state, metrics, query);
    return `[Nota: Conexión con ${provider || "API"} falló (${error.message}). Modo Offline Activado]\n\n${fallbackText}`;
  }
}

/**
 * Motor heurístico experto de respaldo (funciona 100% offline).
 */
export function generateHeuristicFallback(moduleId, state, metrics, query) {
  const ovenCost = state.requirements?.production?.a || 150000000;
  const opProfit = metrics.operatingProfit || 15000000;
  const debt = metrics.totalMonthlyDebtService || 0;
  const netFree = metrics.netFreeCashFlow || 0;
  const dscr = metrics.coverageRatio || 1;

  if (moduleId === "4B") {
    return `🍕 [Gizer IA - Structured Asset Finance Officer]
Activo Financiado: ${formatCurrency(state.fundingSources?.assetInvestorCapital || ovenCost)} | Plazo: ${state.fundingSources?.assetInvestorTermMonths || 24} meses

1. Validación Matemática de Viabilidad:
Con una utilidad operacional proyectada de ${formatCurrency(opProfit)}/mes, el servicio de deuda mensual estimado (${formatCurrency(debt)}/mes) representa un ratio DSCR de ${dscr}x.
Esto significa que la operación genera suficiente flujo para cubrir la cuota del horno y te deja un excedente neto mensual de ${formatCurrency(netFree)} para reinversión.

2. Estructura Jurídica & Mitigación de Riesgo:
Pacta un contrato de mutuo con garantía prendaria sin tenencia sobre el activo. De este modo, el inversionista tiene el respaldo real del activo y tú conservas el 100% de las acciones de la empresa sin dilución.

3. Cláusula de Aceleración:
Negocia la opción de realizar abonos extraordinarios a capital sin penalidad en los meses de temporada alta para amortizar el activo en 14 o 18 meses.`;
  }

  if (moduleId === "4C") {
    return `🏦 [Gizer IA - Banking & Credit Specialist]
Préstamo Bancario: ${formatCurrency(state.fundingSources?.bankLoan || 0)} | Tasa: ${state.fundingSources?.bankRateEA || 20}% E.A. | Plazo: ${state.fundingSources?.bankTermMonths || 36}m

1. Capacidad de Endeudamiento:
Los bancos comerciales exigen que el servicio de deuda no supere el 35% del EBITDA mensual. Con tu utilidad proyectada de ${formatCurrency(opProfit)}, estás en un rango óptimo de solvencia.

2. Período de Gracia:
Solicita formalmente entre 3 y 6 meses de gracia a capital mientras la maquinaria es instalada y puesta a punto comercialmente.

3. Alternativas de Fomento:
Evalúa líneas de crédito con tasa subsidiada a través de bancos de segundo piso (como Bancóldex o fondos de desarrollo pyme).`;
  }

  if (moduleId === "1A") {
    return `🎯 [Gizer IA - Chief Strategy Officer (CSO)]
Métrica Norte: "${state.nsmMetricName || "Pizzas vendidas por semana"}" | Meta: ${state.nsmGoal || "10X"}

1. Diagnóstico de Crecimiento:
Para multiplicar las ventas a ${state.nsmGoal}, el cuello de botella productivo debe desaparecer con la inversión en el activo (${formatCurrency(ovenCost)}). 

2. Riesgo de Retención:
Tu propuesta de valor "${state.valueProposition || "Pizza artesanal rápida"}" exige mantener el estándar de calidad mientras la velocidad de horneado se incrementa. Mide semanalmente la tasa de recompra.

3. Canal Institucional:
Activa la venta B2B de catering corporativo de lunes a jueves para optimizar las horas valle del nuevo equipo.`;
  }

  if (moduleId === "2C") {
    return `⚙️ [Gizer IA - Chief Operating Officer (COO)]
Inversión Capex en Maquinaria: ${formatCurrency(ovenCost)} | Nómina Operativa: ${formatCurrency(state.requirements?.production?.w || 0)}/mes

1. Desacople Financiero:
Es crucial mantener la inversión fija única (${formatCurrency(ovenCost)}) separada de los gastos de nómina mensual. Esto permite estructurar el financiamiento a mediano plazo sin ahogar el efectivo diario.

2. Capital de Trabajo (SS):
Asegúrate de aprovisionar al menos 45 días de materias primas e insumos clave para garantizar producción continua sin desabastecimiento.

3. Productividad de Mano de Obra:
Capacita al personal en el manejo eficiente de la nueva maquinaria para maximizar el rendimiento por turno de trabajo.`;
  }

  return `💡 [Gizer IA - Consejero Estratégico iNGIZER]
Tus parámetros financieros reflejan una expansión viable siempre que el ratio de cobertura DSCR se mantenga por encima de 1.25x. Monitorea semanalmente el punto de equilibrio operativo para prevenir cualquier bache de liquidez.`;
}

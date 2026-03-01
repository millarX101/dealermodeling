import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import ReportGenerator from "../components/ReportGenerator";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine,
  ComposedChart
} from "recharts";

const fmt = (n) => n == null ? "—" : new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
const fmtK = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(2)}M` : n >= 1000 ? `$${(n/1000).toFixed(1)}k` : fmt(n);
const fmtN = (n) => new Intl.NumberFormat("en-AU", { maximumFractionDigits: 1 }).format(n);

// === CLEAN PROFESSIONAL PALETTE ===
const BLUE = "#2563EB";
const GREEN = "#059669";
const ORANGE = "#D97706";
const RED = "#DC2626";
const PURPLE = "#7C3AED";
const NAVY = "#1E3A5F";
const BG_PAGE = "#F5F5F5";
const BG_CARD = "#FFFFFF";
const BG_HEADER = "#F9FAFB";
const BORDER = "#D1D5DB";
const BORDER_LT = "#E5E7EB";
const TEXT1 = "#111827";
const TEXT2 = "#374151";
const TEXT3 = "#6B7280";

const SliderInput = ({ label, value, onChange, min, max, step = 1, prefix = "", suffix = "", format = "number" }) => {
  const display = format === "currency" ? fmt(value) : format === "pct" ? `${value}%` : `${prefix}${value}${suffix}`;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: TEXT2, fontSize: 12 }}>{label}</span>
        <span style={{ color: BLUE, fontSize: 13, fontWeight: 700 }}>{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", cursor: "pointer", height: 4 }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ color: TEXT3, fontSize: 10 }}>{prefix}{min}{suffix}</span>
        <span style={{ color: TEXT3, fontSize: 10 }}>{prefix}{max}{suffix}</span>
      </div>
    </div>
  );
};

const NumberInput = ({ label, value, onChange, prefix = "", suffix = "" }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ color: TEXT2, fontSize: 12, display: "block", marginBottom: 6 }}>{label}</label>
    <div style={{ position: "relative" }}>
      {prefix && <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: TEXT3, fontSize: 13 }}>{prefix}</span>}
      <input
        type="number" value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: "100%", background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 4,
          color: TEXT1, padding: `8px ${suffix ? "36px" : "12px"} 8px ${prefix ? "28px" : "12px"}`,
          fontSize: 13, outline: "none", boxSizing: "border-box"
        }}
      />
      {suffix && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: TEXT3, fontSize: 13 }}>{suffix}</span>}
    </div>
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 4, padding: 20,
    ...style
  }}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 style={{ fontSize: 15, fontWeight: 600, color: TEXT1, margin: "0 0 12px", borderBottom: `1px solid ${BORDER_LT}`, paddingBottom: 8 }}>
    {children}
  </h2>
);

const MetricCard = ({ label, value, sub, color = GREEN, large = false }) => (
  <div style={{
    background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 4, padding: "12px 16px",
  }}>
    <div style={{ color: TEXT3, fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500 }}>{label}</div>
    <div style={{ color, fontWeight: 700, fontSize: large ? 24 : 20 }}>{value}</div>
    {sub && <div style={{ color: TEXT3, fontSize: 11, marginTop: 4 }}>{sub}</div>}
  </div>
);

// Keys that represent dollar amounts (format as currency)
const CURRENCY_KEYS = new Set([
  "mxRevenue", "dealerRevenue", "cumMxRevenue", "cumDealerRevenue",
  "carsalesCost", "cumCarsalesCost", "mxCost", "directIncome", "trailIncome",
]);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "10px 14px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
      <div style={{ color: TEXT2, fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Month {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: 12, marginBottom: 3 }}>
          {p.name}: {CURRENCY_KEYS.has(p.dataKey) ? fmtK(p.value) : fmtN(p.value)}
        </div>
      ))}
    </div>
  );
};

// Shared info box style
const infoBox = () => ({
  padding: "10px 14px",
  background: BG_HEADER,
  borderRadius: 4,
  border: `1px solid ${BORDER_LT}`,
  fontSize: 11, color: TEXT2, lineHeight: 1.6,
});

// Shared stat row style
const statRow = (isLast = false) => ({
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "8px 0", borderBottom: isLast ? "none" : `1px solid ${BORDER_LT}`,
});

export default function MXDealerEstimator() {
  // === VEHICLE & FINANCE INPUTS ===
  const [carPrice, setCarPrice] = useState(65000);
  const lvrPct = 100; // Car price = net amount financed (before on-roads)
  const [dealMixPct, setDealMixPct] = useState(50);

  // === REFERRAL MODEL ===
  const mxReferralRate = 3;
  const dealerSharePct = 30;

  // === DEALER FINANCE MODEL ===
  const [dealerBrokeragePct, setDealerBrokeragePct] = useState(4);
  const mxFeePerDeal = 500;

  // === DEALER FINANCE COSTS ===
  const [bmCommission, setBmCommission] = useState(300);
  const [otherCosts, setOtherCosts] = useState(0);

  // === DEALER ADD-ONS ===
  const [aftermarketMargin, setAftermarketMargin] = useState(0);
  const [insuranceMargin, setInsuranceMargin] = useState(200);
  const [dealMargin, setDealMargin] = useState(1200);
  const [newSalesPct, setNewSalesPct] = useState(60);

  // === GROWTH MODEL ===
  const [monthlyIntros, setMonthlyIntros] = useState(5);
  const [avgEmployees, setAvgEmployees] = useState(20);
  const [additionalNLRate, setAdditionalNLRate] = useState(3);
  const [repeatRate, setRepeatRate] = useState(70);
  const [hotLeadRate, setHotLeadRate] = useState(80);

  // === ACTIVE TAB ===
  const [activeTab, setActiveTab] = useState("deal");
  const [showReport, setShowReport] = useState(false);

  // ========================
  // CALCULATIONS (unchanged)
  // ========================
  const calc = useMemo(() => {
    const netFinanced = carPrice * (lvrPct / 100);
    const referralMix = dealMixPct / 100;
    const dealerFinanceMix = 1 - referralMix;

    const ref_mxGross = netFinanced * (mxReferralRate / 100);
    const ref_dealerShare = ref_mxGross * (dealerSharePct / 100);
    const ref_mxNet = ref_mxGross - ref_dealerShare;

    const df_dealerBrokerage = netFinanced * (dealerBrokeragePct / 100);
    const df_mxFeeInclGST = mxFeePerDeal * 1.1;

    const metalMarginWeighted = dealMargin * (newSalesPct / 100);
    const totalAddOns = aftermarketMargin + insuranceMargin + metalMarginWeighted;

    const totalDealerFinanceCosts = bmCommission + otherCosts + df_mxFeeInclGST;
    const df_dealerNet = df_dealerBrokerage + totalAddOns - totalDealerFinanceCosts;

    const dealerRevenue_newIntro = referralMix * (ref_dealerShare + totalAddOns) + dealerFinanceMix * df_dealerNet;
    const mxRevenue_newIntro     = referralMix * ref_mxNet + dealerFinanceMix * df_mxFeeInclGST;

    // New employer acquisition decay — controls how many deals come from NEW employers
    // (adding fresh employees to the pool). Dealer deal volume stays constant.
    // Y1=70%, Y2=40%, Y3=30%, Y4-Y5=20% (gradual market saturation)
    const yearlyNewEmployerRate = [0.70, 0.40, 0.30, 0.20, 0.20];
    const monthlyChurnRate = 0.10 / 12;
    const employerLagMonths = 6; // months before new employer employees start converting
    const months = 60;
    const data = [];
    let activeEmployeeBase = 0;
    let activeLeases = 0;
    // Pipeline: employees waiting to become active (6-month lag)
    const employeePipeline = new Array(employerLagMonths).fill(0);

    for (let m = 1; m <= months; m++) {
      const yearIdx = Math.min(Math.floor((m - 1) / 12), 4);
      const newEmployerRate = yearlyNewEmployerRate[yearIdx];

      // Dealer does constant deal volume every month
      const newDeals = monthlyIntros;
      // Only a portion come from NEW employers (adding employees to pool)
      const newEmployerDeals = monthlyIntros * newEmployerRate;
      const newEmployeesThisMonth = newEmployerDeals * avgEmployees;

      // Employees enter pipeline — only become active after 6-month lag
      const employeesNowActive = employeePipeline.shift(); // oldest batch graduates
      employeePipeline.push(newEmployeesThisMonth);         // new batch enters queue

      activeEmployeeBase = activeEmployeeBase * (1 - monthlyChurnRate) + employeesNowActive;

      const organicDeals = activeEmployeeBase * (additionalNLRate / 100);
      const trailTierRate = organicDeals <= 5 ? 0.10 : organicDeals <= 10 ? 0.125 : 0.15;
      const dealerRevenue_trail = organicDeals * (trailTierRate * ref_mxGross);
      const mxRevenue_trail     = organicDeals * ref_mxNet;

      activeLeases = activeLeases * (1 - monthlyChurnRate) + newDeals + organicDeals;
      // Lease term split: 15% short-term (1-2yr, avg 18mo), 85% standard (32mo)
      const shortTermPct = 0.15;
      const shortTermLag = 18; // avg months for 1-2yr leases
      const standardLag = 32;  // standard lease term
      // Maturing deals from each cohort
      const maturingShort = m > shortTermLag ? data[m - shortTermLag - 1].totalDeals * shortTermPct : 0;
      const maturingStd   = m > standardLag  ? data[m - standardLag - 1].totalDeals * (1 - shortTermPct) : 0;
      const maturingDeals = maturingShort + maturingStd;
      const repeatDeals = maturingDeals * (repeatRate / 100);
      // Hot leads = maturing leases × hot lead rate (both short-term and standard)
      const hotLeadsThisMonth = maturingDeals * (hotLeadRate / 100);
      const dealerRevenue_repeat = repeatDeals * (trailTierRate * ref_mxGross);
      const mxRevenue_repeat     = repeatDeals * ref_mxNet;

      const totalDeals   = newDeals + organicDeals + repeatDeals;
      const dealerRevenue = (newDeals * dealerRevenue_newIntro) + dealerRevenue_trail + dealerRevenue_repeat;
      const mxRevenue     = (newDeals * mxRevenue_newIntro) + mxRevenue_trail + mxRevenue_repeat;

      data.push({
        month: m,
        newDeals: Math.round(newDeals * 10) / 10,
        additionalDeals: Math.round(organicDeals * 10) / 10,
        repeatDeals: Math.round(repeatDeals * 10) / 10,
        totalDeals: Math.round(totalDeals * 10) / 10,
        mxRevenue: Math.round(mxRevenue),
        dealerRevenue: Math.round(dealerRevenue),
        directIncome: Math.round(newDeals * dealerRevenue_newIntro),
        trailIncome: Math.round(dealerRevenue_trail + dealerRevenue_repeat),
        employeeBase: Math.round(activeEmployeeBase),
        trailTierPct: Math.round(trailTierRate * 100 * 10) / 10,
        hotLeads: Math.round(hotLeadsThisMonth * 10) / 10,
        mxLeadsTotal: Math.round((newDeals + organicDeals + repeatDeals) * 10) / 10,
        mxNewIntroLeads: Math.round(newDeals * 10) / 10,
        mxRepeatLeads: Math.round((organicDeals + repeatDeals) * 10) / 10,
        mxClosedDeals: Math.round((newDeals + organicDeals + repeatDeals) * 0.8 * 10) / 10,
        carsalesLeadsNeeded: Math.round(((newDeals + organicDeals + repeatDeals) * 0.8 / 0.2) * 10) / 10,
        carsalesCost: Math.round((newDeals + organicDeals + repeatDeals) * 0.8 / 0.2 * 100),
        mxCost: 0,
        cumHotLeads: 0, cumMxRevenue: 0, cumDealerRevenue: 0, cumCarsalesCost: 0,
      });
    }

    let cumMX = 0, cumDealer = 0, cumLeads = 0, cumCarsales = 0;
    data.forEach(d => {
      cumMX += d.mxRevenue; cumDealer += d.dealerRevenue; cumLeads += d.hotLeads; cumCarsales += d.carsalesCost;
      d.cumMxRevenue = cumMX; d.cumDealerRevenue = cumDealer; d.cumHotLeads = Math.round(cumLeads); d.cumCarsalesCost = cumCarsales;
    });

    const years = [1, 2, 3, 4, 5].map(y => {
      const slice = data.slice((y - 1) * 12, y * 12);
      return {
        year: y,
        totalDeals: slice.reduce((a, b) => a + b.totalDeals, 0),
        mxRevenue: slice.reduce((a, b) => a + b.mxRevenue, 0),
        dealerRevenue: slice.reduce((a, b) => a + b.dealerRevenue, 0),
        hotLeads: Math.round(slice.reduce((a, b) => a + b.hotLeads, 0)),
        mxLeads: Math.round(slice.reduce((a, b) => a + b.mxLeadsTotal, 0)),
        mxClosed: Math.round(slice.reduce((a, b) => a + b.mxClosedDeals, 0)),
        carsalesLeads: Math.round(slice.reduce((a, b) => a + b.carsalesLeadsNeeded, 0)),
        carsalesCost: Math.round(slice.reduce((a, b) => a + b.carsalesCost, 0)),
      };
    });

    const chartData = data.map(d => ({ ...d, label: d.month % 6 === 0 || d.month === 1 ? `M${d.month}` : "" }));

    return {
      netFinanced, ref_mxGross, ref_dealerShare, ref_mxNet,
      df_dealerBrokerage, df_mxFeeInclGST, totalAddOns,
      dealerRevenue_newIntro, mxRevenue_newIntro, df_dealerNet, totalDealerFinanceCosts,
      data: chartData, years,
      totalMX5yr: data[59].cumMxRevenue, totalDealer5yr: data[59].cumDealerRevenue,
      totalHotLeads5yr: data[59].cumHotLeads, hotLeadsMonth60: data[59].hotLeads,
      mxMonth1: data[0].mxRevenue, mxMonth60: data[59].mxRevenue,
      totalCarsalesCost5yr: data[59].cumCarsalesCost, carsalesCostMonth60: data[59].carsalesCost,
      mxLeadsMonth60: data[59].mxLeadsTotal, mxClosedMonth60: data[59].mxClosedDeals,
      carsalesLeadsMonth60: data[59].carsalesLeadsNeeded,
    };
  }, [carPrice, dealMixPct, dealerBrokeragePct,
    aftermarketMargin, insuranceMargin, dealMargin, monthlyIntros, avgEmployees,
    additionalNLRate, repeatRate, bmCommission, otherCosts, hotLeadRate, newSalesPct]);

  // === AUTO-SAVE TO SUPABASE (debounced) ===
  const { session } = useAuth();
  const sessionIdRef = useRef(null);
  const saveTimer = useRef(null);

  const saveToSupabase = useCallback(async () => {
    if (!session?.user) return;
    const payload = {
      user_id: session.user.id,
      user_email: session.user.email,
      updated_at: new Date().toISOString(),
      inputs: {
        carPrice, dealMixPct, dealerBrokeragePct, bmCommission, otherCosts,
        aftermarketMargin, insuranceMargin, dealMargin, newSalesPct,
        monthlyIntros, avgEmployees, additionalNLRate, repeatRate, hotLeadRate,
      },
      results: {
        revenueMonth1: calc.data?.[0]?.dealerRevenue,
        revenueMonth12: calc.data?.[11]?.dealerRevenue,
        revenueMonth60: calc.data?.[59]?.dealerRevenue,
        avgMonthlyRevenue: Math.round(calc.totalDealer5yr / 60),
        totalDealer5yr: calc.totalDealer5yr,
        hotLeadsMonth60: calc.hotLeadsMonth60,
        perDealReferral: Math.round(calc.ref_dealerShare + calc.totalAddOns),
        perDealDealerFinance: Math.round(calc.df_dealerNet),
      },
    };
    try {
      if (sessionIdRef.current) {
        await supabase.from("estimator_sessions").update(payload).eq("id", sessionIdRef.current);
      } else {
        const { data } = await supabase.from("estimator_sessions").insert(payload).select("id").single();
        if (data) sessionIdRef.current = data.id;
      }
    } catch (e) { /* silent — don't break the UI */ }
  }, [session, carPrice, dealMixPct, dealerBrokeragePct, bmCommission, otherCosts,
    aftermarketMargin, insuranceMargin, dealMargin, newSalesPct,
    monthlyIntros, avgEmployees, additionalNLRate, repeatRate, hotLeadRate, calc]);

  useEffect(() => {
    if (!session?.user) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveToSupabase, 2000);
    return () => clearTimeout(saveTimer.current);
  }, [saveToSupabase, session]);

  const tabs = [
    { id: "deal", label: "Deal Structure" },
    { id: "growth", label: "Growth Model" },
    { id: "projection", label: "5-Year Projection" },
  ];

  // Shared chart axis/grid props
  const gridProps = { strokeDasharray: "3 3", stroke: "#E5E7EB" };
  const axisTickProps = { fill: "#6B7280", fontSize: 10 };
  const refLineProps = { stroke: "#9CA3AF", strokeDasharray: "4 4" };

  return (
    <div style={{ minHeight: "100vh", background: BG_PAGE, color: TEXT1 }}>
      <style>{`
        input[type=range] { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; background: #D1D5DB; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #2563EB; cursor: pointer; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        input[type=number] { -webkit-appearance: textfield; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        * { box-sizing: border-box; }
      `}</style>

      {/* HEADER */}
      <div style={{ padding: "24px 40px 0", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 6, background: NAVY,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 15, color: "white",
              }}>MX</div>
              <div>
                <div style={{ fontSize: 11, color: TEXT3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>MX Dealer Advantage</div>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: TEXT1, lineHeight: 1.1 }}>
                  Earnings Estimator
                </h1>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: TEXT3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>AVG MONTHLY REVENUE</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: GREEN }}>{fmt(Math.round(calc.totalDealer5yr / 60))}</div>
              <div style={{ color: TEXT3, fontSize: 11 }}>Over 60 Months</div>
            </div>
            <button
              onClick={() => setShowReport(true)}
              style={{
                padding: "10px 20px", borderRadius: 6, border: "none", cursor: "pointer",
                background: BLUE, color: "white",
                fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
              }}
            >
              Generate Report
            </button>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginTop: 20, borderBottom: `1px solid ${BORDER}`, paddingBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 20px", fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? BLUE : TEXT3,
              borderBottom: activeTab === t.id ? `2px solid ${BLUE}` : "2px solid transparent",
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ padding: "24px 40px", maxWidth: 1280, margin: "0 auto" }}>

        {/* ===================== TAB: DEAL STRUCTURE ===================== */}
        {activeTab === "deal" && (
          <div>
            {/* Summary Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              <MetricCard label="Dealer — Referral Deal" value={fmt(calc.ref_dealerShare)} sub="Finance referral revenue" color={BLUE} />
              <MetricCard label="Dealer — Referral + Add-ons" value={fmt(calc.ref_dealerShare + calc.totalAddOns)} sub="Finance share + dealer add-ons" color={GREEN} />
              <MetricCard label="Dealer — Finance Deal" value={fmt(calc.df_dealerBrokerage)} sub={`${dealerBrokeragePct}% brokerage`} color={ORANGE} />
              <MetricCard label="Dealer — Finance (net)" value={fmt(calc.df_dealerNet)} sub="After BM commission & costs" color={calc.df_dealerNet >= 0 ? GREEN : RED} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {/* Vehicle & Finance */}
              <Card>
                <SectionTitle>Vehicle & Finance</SectionTitle>
                <SliderInput label="Average Car Price (before on-roads)" value={carPrice} onChange={setCarPrice} min={20000} max={150000} step={1000} format="currency" />
                <div style={{ padding: "10px 14px", background: BG_HEADER, borderRadius: 4, border: `1px solid ${BORDER_LT}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: TEXT3, fontSize: 12 }}>Net Amount Financed</span>
                    <span style={{ color: GREEN, fontSize: 14, fontWeight: 600 }}>{fmt(carPrice)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: TEXT3, fontSize: 12 }}>Deal Mix (Referral/Dealer)</span>
                    <span style={{ color: BLUE, fontSize: 12 }}>{dealMixPct}% / {100-dealMixPct}%</span>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <SliderInput label="Referral Deals ← → Dealer Finance Deals" value={dealMixPct} onChange={setDealMixPct} min={0} max={100} step={5} format="pct" />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: -8, marginBottom: 8 }}>
                    <span style={{ color: TEXT3, fontSize: 10 }}>0% = All Dealer Finance</span>
                    <span style={{ color: TEXT3, fontSize: 10 }}>100% = All Referral</span>
                  </div>
                </div>
              </Card>

              {/* Referral Model */}
              <Card>
                <SectionTitle>Referral Model</SectionTitle>

                <div style={{ marginBottom: 16 }}>
                  <div style={statRow()}>
                    <span style={{ color: TEXT3, fontSize: 12 }}>MX Margin (fixed)</span>
                    <span style={{ color: TEXT2, fontSize: 13, fontWeight: 600 }}>3% of net financed</span>
                  </div>
                  <div style={statRow()}>
                    <span style={{ color: TEXT3, fontSize: 12 }}>Your Share (fixed)</span>
                    <span style={{ color: TEXT2, fontSize: 13, fontWeight: 600 }}>30% of that margin</span>
                  </div>
                  <div style={statRow(true)}>
                    <span style={{ color: TEXT3, fontSize: 12 }}>Net Financed</span>
                    <span style={{ color: GREEN, fontSize: 13, fontWeight: 600 }}>{fmt(calc.netFinanced)}</span>
                  </div>
                </div>

                <div style={{ padding: "14px 16px", background: BG_HEADER, borderRadius: 4, border: `1px solid ${BORDER_LT}` }}>
                  <div style={{ color: TEXT2, fontSize: 11, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Your Earnings Per Deal</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: TEXT3, fontSize: 12 }}>Finance Referral Revenue</span>
                    <span style={{ color: GREEN, fontSize: 13 }}>{fmt(calc.ref_dealerShare)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: TEXT3, fontSize: 12 }}>Dealer Add-ons</span>
                    <span style={{ color: TEXT2, fontSize: 13 }}>{fmt(calc.totalAddOns)}</span>
                  </div>
                  <div style={{ borderTop: `1px solid ${BORDER_LT}`, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: TEXT3, fontSize: 12 }}>Total Dealer Revenue</span>
                    <span style={{ color: BLUE, fontSize: 14, fontWeight: 600 }}>{fmt(calc.ref_dealerShare + calc.totalAddOns)}</span>
                  </div>
                </div>
              </Card>

              {/* Dealer Finance Model */}
              <Card>
                <SectionTitle>Dealer Finance Model</SectionTitle>
                <SliderInput label="Dealer Brokerage Rate" value={dealerBrokeragePct} onChange={setDealerBrokeragePct} min={1} max={8} step={0.25} suffix="%" />

                <div style={{ borderTop: `1px solid ${BORDER_LT}`, paddingTop: 16, marginTop: 4, marginBottom: 4 }}>
                  <div style={{ color: RED, fontSize: 11, letterSpacing: "0.04em", marginBottom: 12, fontWeight: 600 }}>DEALER COSTS — FINANCE DEALS ONLY</div>
                  <SliderInput label="BM Commission (per settled deal)" value={bmCommission} onChange={setBmCommission} min={0} max={1000} step={50} format="currency" />
                  <SliderInput label="Other Costs (per deal)" value={otherCosts} onChange={setOtherCosts} min={0} max={1000} step={50} format="currency" />
                </div>

                <div style={{ padding: "14px 16px", background: BG_HEADER, borderRadius: 4, border: `1px solid ${BORDER_LT}` }}>
                  <div style={{ color: TEXT2, fontSize: 11, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Your Earnings Per Deal</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: TEXT3, fontSize: 12 }}>Finance Brokerage ({dealerBrokeragePct}%)</span>
                    <span style={{ color: GREEN, fontSize: 13 }}>{fmt(calc.df_dealerBrokerage)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: TEXT3, fontSize: 12 }}>Dealer Add-ons</span>
                    <span style={{ color: TEXT2, fontSize: 13 }}>{fmt(calc.totalAddOns)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: RED, fontSize: 12 }}>MX Fee ($500+GST)</span>
                    <span style={{ color: RED, fontSize: 13 }}>({fmt(calc.df_mxFeeInclGST)})</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: RED, fontSize: 12 }}>BM Commission</span>
                    <span style={{ color: RED, fontSize: 13 }}>({fmt(bmCommission)})</span>
                  </div>
                  {otherCosts > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: RED, fontSize: 12 }}>Other Costs</span>
                      <span style={{ color: RED, fontSize: 13 }}>({fmt(otherCosts)})</span>
                    </div>
                  )}
                  <div style={{ borderTop: `1px solid ${BORDER_LT}`, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: TEXT3, fontSize: 12 }}>Net Dealer Revenue</span>
                    <span style={{ color: calc.df_dealerNet >= 0 ? GREEN : RED, fontSize: 14, fontWeight: 600 }}>{fmt(calc.df_dealerNet)}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Dealer Add-Ons */}
            <Card style={{ marginTop: 16 }}>
              <SectionTitle>Dealer Controlled Add-Ons</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                <div>
                  <SliderInput label="Aftermarket Margin" value={aftermarketMargin} onChange={setAftermarketMargin} min={0} max={2000} step={50} format="currency" />
                </div>
                <div>
                  <SliderInput label="Comprehensive Insurance" value={insuranceMargin} onChange={setInsuranceMargin} min={0} max={500} step={25} format="currency" />
                </div>
                <div>
                  <SliderInput label="Metal Margin" value={dealMargin} onChange={setDealMargin} min={-1500} max={5000} step={100} format="currency" />
                  <div style={{ ...infoBox(), marginTop: -8 }}>
                    Only earned on <span style={{ color: ORANGE, fontWeight: 600 }}>new car sales</span> — not on conversions, refinances, or existing vehicle leases.
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <SliderInput label="New Sales vs Conversions" value={newSalesPct} onChange={setNewSalesPct} min={0} max={100} step={5} format="pct" />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: -10, marginBottom: 8 }}>
                      <span style={{ color: TEXT3, fontSize: 10 }}>0% = All conversions</span>
                      <span style={{ color: TEXT3, fontSize: 10 }}>100% = All new cars</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: BG_HEADER, borderRadius: 4, border: `1px solid ${BORDER_LT}` }}>
                      <span style={{ color: TEXT3, fontSize: 11 }}>Effective Metal Margin</span>
                      <span style={{ color: ORANGE, fontSize: 12, fontWeight: 600 }}>{fmt(dealMargin * (newSalesPct / 100))}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 20px", background: BG_HEADER, borderRadius: 4, border: `1px solid ${BORDER_LT}`, marginTop: 8 }}>
                <span style={{ color: TEXT2, fontSize: 12, fontWeight: 600 }}>TOTAL ADD-ONS PER DEAL</span>
                <span style={{ color: GREEN, fontSize: 22, fontWeight: 700 }}>{fmt(calc.totalAddOns)}</span>
                <span style={{ color: TEXT3, fontSize: 11, marginLeft: "auto" }}>Available in both referral and dealer finance models</span>
              </div>
            </Card>
          </div>
        )}

        {/* ===================== TAB: GROWTH MODEL ===================== */}
        {activeTab === "growth" && (
          <>
          {/* Top KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            <MetricCard label="5-Year Dealer Revenue" value={fmtK(calc.totalDealer5yr)} sub="Cumulative earnings" color={GREEN} large />
            <MetricCard label="Total Deals (5yr)" value={fmtN(calc.years.reduce((a, b) => a + b.totalDeals, 0))} sub="New + organic + repeat" color={BLUE} />
            <MetricCard label="Hot Leads / Month (Yr 5)" value={fmtN(calc.hotLeadsMonth60)} sub="Warm return customers" color={ORANGE} />
            <MetricCard label="5-Year Hot Leads" value={fmtN(calc.totalHotLeads5yr)} sub={`${hotLeadRate}% of maturing leases`} color={ORANGE} />
          </div>

          <div>
            <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
              <div>
                <Card>
                  <SectionTitle>Growth Assumptions</SectionTitle>
                  <SliderInput label="New Deals Introduced / Month" value={monthlyIntros} onChange={setMonthlyIntros} min={1} max={50} step={1} />
                  <SliderInput label="Avg Employees Per Introduced Employer" value={avgEmployees} onChange={setAvgEmployees} min={20} max={1000} step={20} />
                  <SliderInput label="Organic Conversion Rate (monthly)" value={additionalNLRate} onChange={setAdditionalNLRate} min={0.5} max={10} step={0.25} suffix="%" />

                  <div style={{ borderTop: `1px solid ${BORDER_LT}`, paddingTop: 16, marginTop: 8, marginBottom: 16 }}>
                    <div style={{ color: ORANGE, fontSize: 12, letterSpacing: "0.04em", marginBottom: 12, fontWeight: 600 }}>REPEAT BUSINESS</div>
                    <SliderInput label="Repeat / Refinance / Trade-Up Rate" value={repeatRate} onChange={setRepeatRate} min={30} max={95} step={5} format="pct" />
                    <div style={infoBox()}>
                      <span style={{ color: ORANGE, fontWeight: 600 }}>{repeatRate}%</span> of maturing leases return via refinance, trade-ups, and new NL applications.
                      Split: <span style={{ color: ORANGE, fontWeight: 600 }}>15%</span> short-term (1–2yr, mature ~month 18) + <span style={{ color: ORANGE, fontWeight: 600 }}>85%</span> standard (mature ~month 32).
                    </div>
                  </div>
                </Card>

                <Card style={{ marginTop: 12 }}>
                  <div style={{ color: RED, fontSize: 11, letterSpacing: "0.04em", marginBottom: 12, fontWeight: 600 }}>BAKED-IN REALITY CHECKS</div>
                  <div style={{ fontSize: 11, color: TEXT3 }}>
                    {[
                      { l: "Deals from new employers — Yr 1", v: "70%", c: TEXT2 },
                      { l: "Deals from new employers — Yr 2", v: "40%", c: TEXT2 },
                      { l: "Deals from new employers — Yr 3", v: "30%", c: TEXT2 },
                      { l: "Deals from new employers — Yr 4–5", v: "20%", c: TEXT2 },
                      { l: "Dealer deal volume", v: "Constant", c: GREEN },
                      { l: "New employer → first conversions", v: "6 month lag", c: ORANGE },
                      { l: "Short-term leases (1–2yr)", v: "15%", c: ORANGE },
                      { l: "Short-term maturity", v: "~18 months", c: ORANGE },
                      { l: "Standard lease maturity", v: "~32 months", c: TEXT2 },
                      { l: "Book churn (annual)", v: "−10% / year", c: RED },
                    ].map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 9 ? `1px solid ${BORDER_LT}` : "none" }}>
                        <span>{r.l}</span>
                        <span style={{ color: r.c, fontWeight: 500, flexShrink: 0, marginLeft: 12 }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card style={{ marginTop: 12 }}>
                  <SectionTitle>Trail Income Tiers</SectionTitle>
                  <div style={{ color: TEXT3, fontSize: 11, marginBottom: 14, lineHeight: 1.6 }}>
                    Organic conversions & repeat deals — MX originates, dealer earns trail on 3% NAF margin only.
                  </div>
                  <div style={{ fontSize: 11, color: TEXT3 }}>
                    {[
                      { l: "≤ 5 organic deals/mo", v: "10%", highlight: false },
                      { l: "6–10 organic deals/mo", v: "12.5%", highlight: false },
                      { l: "11+ organic deals/mo", v: "15%", highlight: true },
                    ].map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: r.highlight ? "#F0FDF4" : BG_HEADER, borderRadius: 4, marginBottom: i < 2 ? 6 : 0, border: `1px solid ${r.highlight ? "#BBF7D0" : BORDER_LT}` }}>
                        <span>{r.l}</span>
                        <span style={{ color: r.highlight ? GREEN : TEXT2, fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>{r.v} of MX margin</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ ...infoBox(), marginTop: 12 }}>
                    Intro deals you control always earn the full rate — 30% of NAF margin or your brokerage, plus all add-ons.
                  </div>
                </Card>
              </div>

              <div>
                {/* Year by Year */}
                <Card style={{ marginBottom: 16 }}>
                  <SectionTitle>Annual Summary</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                    {calc.years.map(y => (
                      <div key={y.year} style={{
                        padding: "14px 12px", background: BG_HEADER, borderRadius: 4,
                        border: `1px solid ${y.year === 5 ? BLUE : BORDER_LT}`,
                      }}>
                        <div style={{ color: TEXT3, fontSize: 10, marginBottom: 6, textTransform: "uppercase", fontWeight: 500 }}>Year {y.year}</div>
                        <div style={{ color: GREEN, fontWeight: 700, fontSize: 18, marginBottom: 2 }}>{fmtK(y.dealerRevenue)}</div>
                        <div style={{ color: TEXT3, fontSize: 10, marginBottom: 8 }}>Dealer Revenue</div>
                        <div style={{ borderTop: `1px solid ${BORDER_LT}`, paddingTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                          <div>
                            <div style={{ color: TEXT2, fontSize: 11 }}>{fmtN(y.totalDeals)}</div>
                            <div style={{ color: TEXT3, fontSize: 9 }}>deals</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ color: ORANGE, fontSize: 11 }}>{fmtN(y.hotLeads)}</div>
                            <div style={{ color: TEXT3, fontSize: 9 }}>hot leads</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Deal Volume Chart */}
                <Card>
                  <SectionTitle>Monthly Deal Volume — 60 Months</SectionTitle>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={calc.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="month" tick={axisTickProps} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                      <YAxis tick={axisTickProps} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine x={32} {...refLineProps} label={{ value: "Repeat →", fill: "#6B7280", fontSize: 10 }} />
                      <Area type="monotone" dataKey="newDeals" name="New Deals" stroke={BLUE} fill={BLUE} fillOpacity={0.12} strokeWidth={2} />
                      <Area type="monotone" dataKey="additionalDeals" name="Organic Growth" stroke={GREEN} fill={GREEN} fillOpacity={0.12} strokeWidth={2} />
                      <Area type="monotone" dataKey="repeatDeals" name="Repeat/Trade-Up" stroke={ORANGE} fill={ORANGE} fillOpacity={0.12} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <div style={{ height: 12 }} />

                {/* Monthly Income Breakdown Chart */}
                <Card>
                  <SectionTitle>Monthly Income — Total & Breakdown</SectionTitle>
                  <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 11 }}>
                    <span style={{ color: GREEN }}>● Total Monthly Income</span>
                    <span style={{ color: BLUE }}>■ Dealer Originated</span>
                    <span style={{ color: ORANGE }}>■ Trail / MX System</span>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={calc.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="month" tick={axisTickProps} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                      <YAxis tick={axisTickProps} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const direct = payload.find(p => p.dataKey === "directIncome")?.value || 0;
                        const trail = payload.find(p => p.dataKey === "trailIncome")?.value || 0;
                        const total = direct + trail;
                        const directPct = total > 0 ? Math.round(direct / total * 100) : 0;
                        const trailPct = total > 0 ? 100 - directPct : 0;
                        return (
                          <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "10px 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
                            <div style={{ color: TEXT2, fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Month {label}</div>
                            <div style={{ color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6, borderBottom: `1px solid ${BORDER_LT}`, paddingBottom: 6 }}>
                              Total: {fmtK(total)}
                            </div>
                            <div style={{ color: BLUE, fontSize: 12, marginBottom: 3 }}>
                              Dealer Originated: {fmtK(direct)} ({directPct}%)
                            </div>
                            <div style={{ color: ORANGE, fontSize: 12 }}>
                              Trail / MX System: {fmtK(trail)} ({trailPct}%)
                            </div>
                          </div>
                        );
                      }} />
                      <ReferenceLine x={32} {...refLineProps} label={{ value: "Repeat →", fill: "#6B7280", fontSize: 10 }} />
                      <Area type="monotone" dataKey="directIncome" name="Dealer Originated" stroke="none" fill={BLUE} fillOpacity={0.15} stackId="income" />
                      <Area type="monotone" dataKey="trailIncome" name="Trail / MX System" stroke="none" fill={ORANGE} fillOpacity={0.15} stackId="income" />
                      <Line type="monotone" dataKey="dealerRevenue" name="Total Monthly Income" stroke={GREEN} strokeWidth={2.5} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </div>
          </div>

          {/* HOT LEADS HERO — full width */}
          <Card style={{ marginTop: 16, borderColor: ORANGE, borderLeftWidth: 3 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "center" }}>
              <div>
                <div style={{ color: ORANGE, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Hot New Car Leads Pipeline</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT1, margin: "0 0 8px" }}>
                  Every retained lease is a future car sale.
                </h2>
                <p style={{ color: TEXT2, fontSize: 13, margin: "0 0 20px", lineHeight: 1.7, maxWidth: 560 }}>
                  Customers nearing lease-end or upgrade cycle are warm, pre-qualified introductions sent directly back to your dealership floor. This is your pipeline — not cold leads.
                </p>
                <div style={{ maxWidth: 420 }}>
                  <SliderInput label="% of Maturing Leases Returning as Hot Leads" value={hotLeadRate} onChange={setHotLeadRate} min={30} max={100} step={5} format="pct" />
                </div>
              </div>
              <div style={{ textAlign: "center", minWidth: 200 }}>
                <div style={{ color: TEXT3, fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500 }}>By Year 5</div>
                <div style={{ fontSize: 48, fontWeight: 700, color: ORANGE, lineHeight: 1 }}>
                  {fmtN(calc.hotLeadsMonth60)}
                </div>
                <div style={{ color: TEXT2, fontSize: 13, marginTop: 6 }}>hot leads / month</div>
                <div style={{ marginTop: 12, padding: "10px 16px", background: BG_HEADER, borderRadius: 4, border: `1px solid ${BORDER_LT}` }}>
                  <div style={{ color: TEXT3, fontSize: 10, marginBottom: 4, textTransform: "uppercase", fontWeight: 500 }}>5-Year Total</div>
                  <div style={{ color: ORANGE, fontSize: 24, fontWeight: 700 }}>{fmtN(calc.totalHotLeads5yr)}</div>
                  <div style={{ color: TEXT3, fontSize: 10, marginTop: 2 }}>warm introductions</div>
                </div>
              </div>
            </div>
          </Card>

          {/* ====== LEAD FARMING vs CARSALES ====== */}
          <Card style={{ marginTop: 16 }}>
            <div style={{ color: GREEN, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Lead Farming — MX vs Buying Leads</div>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT1, margin: "0 0 6px" }}>
              Stop paying for cold leads. MX farms them for free.
            </h2>
            <p style={{ color: TEXT2, fontSize: 12, margin: "0 0 20px", lineHeight: 1.7, maxWidth: 680 }}>
              MX automatically delivers new employer intros and repeat customer leads directly to your floor — pre-qualified, warm, and at zero cost.
              Compare that to buying cold leads from Carsales at <span style={{ color: RED, fontWeight: 600 }}>$100/lead</span> with a <span style={{ color: RED, fontWeight: 600 }}>20% close rate</span>.
              MX leads close at <span style={{ color: GREEN, fontWeight: 600 }}>80%</span>.
            </p>

            {/* KPI comparison cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "#F0FDF4", border: `1px solid #BBF7D0`, borderRadius: 4, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ color: TEXT3, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, fontWeight: 500 }}>MX Leads / Month (Yr 5)</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: GREEN }}>{fmtN(calc.mxLeadsMonth60)}</div>
                <div style={{ color: GREEN, fontSize: 11, marginTop: 4, fontWeight: 600 }}>$0 cost</div>
              </div>
              <div style={{ background: "#FEF2F2", border: `1px solid #FECACA`, borderRadius: 4, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ color: TEXT3, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, fontWeight: 500 }}>Carsales Leads Needed</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: RED }}>{fmtN(calc.carsalesLeadsMonth60)}</div>
                <div style={{ color: RED, fontSize: 11, marginTop: 4, fontWeight: 600 }}>{fmtK(calc.carsalesCostMonth60)}/mo</div>
              </div>
              <div style={{ background: "#FEF2F2", border: `1px solid #FECACA`, borderRadius: 4, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ color: TEXT3, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, fontWeight: 500 }}>5-Year Carsales Cost</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: RED }}>{fmtK(calc.totalCarsalesCost5yr)}</div>
                <div style={{ color: TEXT2, fontSize: 11, marginTop: 4 }}>to match MX output</div>
              </div>
              <div style={{ background: "#F0FDF4", border: `1px solid #BBF7D0`, borderRadius: 4, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ color: TEXT3, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, fontWeight: 500 }}>You Save</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: GREEN }}>{fmtK(calc.totalCarsalesCost5yr)}</div>
                <div style={{ color: GREEN, fontSize: 11, marginTop: 4, fontWeight: 600 }}>MX leads are free</div>
              </div>
            </div>

            {/* Side-by-side comparison */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "#F0FDF4", border: `1px solid #BBF7D0`, borderRadius: 4, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN }} />
                  <span style={{ color: GREEN, fontSize: 13, fontWeight: 600 }}>MX DealerAdvantage</span>
                </div>
                <div style={{ fontSize: 11, color: TEXT2, lineHeight: 2.4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER_LT}`, paddingBottom: 4 }}>
                    <span>Cost per lead</span><span style={{ color: GREEN, fontWeight: 700 }}>$0</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER_LT}`, paddingBottom: 4 }}>
                    <span>Close rate</span><span style={{ color: GREEN, fontWeight: 700 }}>80%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER_LT}`, paddingBottom: 4 }}>
                    <span>Lead source</span><span style={{ color: TEXT1 }}>Auto-farmed to you</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER_LT}`, paddingBottom: 4 }}>
                    <span>New intro leads</span><span style={{ color: GREEN }}>Employer partnerships</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Repeat leads</span><span style={{ color: GREEN }}>Lease-end / trade-ups</span>
                  </div>
                </div>
              </div>
              <div style={{ background: "#FEF2F2", border: `1px solid #FECACA`, borderRadius: 4, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: RED }} />
                  <span style={{ color: RED, fontSize: 13, fontWeight: 600 }}>Carsales (equivalent)</span>
                </div>
                <div style={{ fontSize: 11, color: TEXT2, lineHeight: 2.4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER_LT}`, paddingBottom: 4 }}>
                    <span>Cost per lead</span><span style={{ color: RED, fontWeight: 700 }}>$100</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER_LT}`, paddingBottom: 4 }}>
                    <span>Close rate</span><span style={{ color: RED, fontWeight: 700 }}>20%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER_LT}`, paddingBottom: 4 }}>
                    <span>Lead source</span><span style={{ color: TEXT2 }}>Cold online enquiries</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER_LT}`, paddingBottom: 4 }}>
                    <span>Leads needed / mo (Yr 5)</span><span style={{ color: RED }}>{fmtN(calc.carsalesLeadsMonth60)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Monthly cost (Yr 5)</span><span style={{ color: RED }}>{fmtK(calc.carsalesCostMonth60)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Carsales Cost Chart */}
            <Card style={{ background: BG_HEADER }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <SectionTitle>Monthly Cost to Match MX Lead Output</SectionTitle>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: RED, fontSize: 18, fontWeight: 700 }}>{fmtK(calc.totalCarsalesCost5yr)}</div>
                  <div style={{ color: TEXT3, fontSize: 10 }}>Carsales spend over 5 years</div>
                </div>
              </div>
              <div style={{ color: TEXT3, fontSize: 11, marginBottom: 16 }}>
                What you'd pay Carsales each month ($100/lead, 20% close) to match the same closed deals MX delivers for free (80% close).
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={calc.data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" tick={axisTickProps} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                  <YAxis tick={axisTickProps} tickFormatter={v => fmtK(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={32} {...refLineProps} />
                  <Area type="monotone" dataKey="carsalesCost" name="Carsales Cost/Month" stroke={RED} fill={RED} fillOpacity={0.1} strokeWidth={2.5} />
                  <Area type="monotone" dataKey="mxCost" name="MX Cost/Month" stroke={GREEN} fill={GREEN} fillOpacity={0.05} strokeWidth={2} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Lead volume comparison */}
            <Card style={{ marginTop: 12, background: BG_HEADER }}>
              <SectionTitle>MX Lead Sources vs Carsales Volume Needed</SectionTitle>
              <div style={{ color: TEXT3, fontSize: 11, marginBottom: 16 }}>
                New intro leads + organic repeat leads (free, 80% close) vs the Carsales lead volume needed to match (at 20% close).
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={calc.data.filter(d => d.month % 3 === 0)} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" tick={axisTickProps} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : `M${v}`} />
                  <YAxis tick={axisTickProps} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: TEXT2 }} />
                  <Bar dataKey="mxNewIntroLeads" name="MX New Intros" stackId="mx" fill={BLUE} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="mxRepeatLeads" name="MX Repeat/Organic" stackId="mx" fill={GREEN} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="carsalesLeadsNeeded" name="Carsales Needed" fill="#FECACA" stroke={RED} strokeWidth={1} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Cumulative savings */}
            <Card style={{ marginTop: 12, background: BG_HEADER }}>
              <SectionTitle>Cumulative Savings vs Carsales</SectionTitle>
              <div style={{ color: TEXT3, fontSize: 11, marginBottom: 16 }}>
                Running total of what you'd spend on Carsales to match MX's free lead output. This is money that stays in your pocket.
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={calc.data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" tick={axisTickProps} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                  <YAxis tick={axisTickProps} tickFormatter={v => fmtK(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={32} {...refLineProps} />
                  <Area type="monotone" dataKey="cumCarsalesCost" name="Cumulative Savings" stroke={GREEN} fill={GREEN} fillOpacity={0.1} strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Year-by-year comparison table */}
            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr>
                    {["", "MX Leads", "Close Rate", "Closed Deals", "MX Cost", "Carsales Leads", "Close Rate", "Carsales Cost"].map((h, i) => (
                      <th key={i} style={{
                        padding: "10px 12px", textAlign: i === 0 ? "left" : "right",
                        fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em",
                        color: TEXT3, borderBottom: `2px solid ${BORDER}`, background: BG_HEADER, fontWeight: 600
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calc.years.map(y => (
                    <tr key={y.year}>
                      <td style={{ padding: "10px 12px", color: TEXT2, borderBottom: `1px solid ${BORDER_LT}` }}>Year {y.year}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: GREEN, fontWeight: 600, borderBottom: `1px solid ${BORDER_LT}` }}>{fmtN(y.mxLeads)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: GREEN, borderBottom: `1px solid ${BORDER_LT}` }}>80%</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: TEXT1, fontWeight: 600, borderBottom: `1px solid ${BORDER_LT}` }}>{fmtN(y.mxClosed)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: GREEN, fontWeight: 700, borderBottom: `1px solid ${BORDER_LT}` }}>$0</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: RED, borderBottom: `1px solid ${BORDER_LT}` }}>{fmtN(y.carsalesLeads)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: RED, borderBottom: `1px solid ${BORDER_LT}` }}>20%</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: RED, fontWeight: 700, borderBottom: `1px solid ${BORDER_LT}` }}>{fmtK(y.carsalesCost)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: "10px 12px", color: TEXT1, fontWeight: 700, borderTop: `2px solid ${BORDER}` }}>5-Year Total</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: GREEN, fontWeight: 700, borderTop: `2px solid ${BORDER}` }}>{fmtN(calc.years.reduce((a, b) => a + b.mxLeads, 0))}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: GREEN, borderTop: `2px solid ${BORDER}` }}>80%</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: TEXT1, fontWeight: 700, borderTop: `2px solid ${BORDER}` }}>{fmtN(calc.years.reduce((a, b) => a + b.mxClosed, 0))}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: GREEN, fontWeight: 700, fontSize: 13, borderTop: `2px solid ${BORDER}` }}>$0</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: RED, borderTop: `2px solid ${BORDER}` }}>{fmtN(calc.years.reduce((a, b) => a + b.carsalesLeads, 0))}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: RED, borderTop: `2px solid ${BORDER}` }}>20%</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: RED, fontWeight: 700, fontSize: 13, borderTop: `2px solid ${BORDER}` }}>{fmtK(calc.totalCarsalesCost5yr)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ ...infoBox(), marginTop: 12 }}>
              MX leads include new employer intros and organic repeat business (lease-end, refinance, trade-ups) — all delivered automatically to your dealership at no cost. The Carsales equivalent shows how many cold leads at $100 each (20% close) you'd need to buy to match the same number of closed deals.
            </div>
          </Card>

          </>
        )}

        {/* ===================== TAB: 5-YEAR PROJECTION ===================== */}
        {activeTab === "projection" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              <MetricCard label="5-Year Dealer Revenue" value={fmtK(calc.totalDealer5yr)} sub="Cumulative" color={GREEN} large />
              <MetricCard label="Yr 5 Hot Leads/Month" value={fmtN(calc.hotLeadsMonth60)} sub="New car pipeline" color={ORANGE} />
              <MetricCard label="Month 1 Dealer Revenue" value={fmtK(calc.data[0]?.dealerRevenue)} sub="Starting point" color={BLUE} />
              <MetricCard label="Hot Leads/Month — Yr 5" value={fmtN(calc.hotLeadsMonth60)} sub={`${hotLeadRate}% of maturing leases`} color={ORANGE} />
            </div>

            <Card style={{ marginBottom: 16 }}>
              <SectionTitle>Monthly Income from MX Model — 60 Months</SectionTitle>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={calc.data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" tick={axisTickProps} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : v === 1 ? "M1" : ""} />
                  <YAxis tick={axisTickProps} tickFormatter={v => fmtK(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: TEXT2 }} />
                  <ReferenceLine x={32} {...refLineProps} label={{ value: "Repeat Kicks In", fill: "#6B7280", fontSize: 11, fontWeight: 600, position: "top" }} />
                  <Area type="monotone" dataKey="mxRevenue" name="Income from MX Model" stroke={PURPLE} fill={PURPLE} fillOpacity={0.1} strokeWidth={2.5} />
                  <Area type="monotone" dataKey="dealerRevenue" name="Dealer Revenue" stroke={GREEN} fill={GREEN} fillOpacity={0.08} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card style={{ marginBottom: 16 }}>
              <SectionTitle>Cumulative Revenue</SectionTitle>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={calc.data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" tick={axisTickProps} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                  <YAxis tick={axisTickProps} tickFormatter={v => fmtK(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: TEXT2 }} />
                  <ReferenceLine x={32} {...refLineProps} />
                  <Line type="monotone" dataKey="cumMxRevenue" name="Cumulative MX Model Income" stroke={PURPLE} strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="cumDealerRevenue" name="Cumulative Dealer" stroke={GREEN} strokeWidth={2} dot={false} strokeDasharray="6 3" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <SectionTitle>Hot New Car Leads Pipeline</SectionTitle>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: ORANGE, fontSize: 20, fontWeight: 700 }}>{fmtN(calc.totalHotLeads5yr)}</div>
                  <div style={{ color: TEXT3, fontSize: 10 }}>total leads over 5 years</div>
                </div>
              </div>
              <div style={{ color: TEXT3, fontSize: 11, marginBottom: 16 }}>
                Leases mature from month 18 (short-term) and month 32 (standard) — {hotLeadRate}% of maturing deals return as warm car-buying leads, sent direct to your floor.
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={calc.data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" tick={axisTickProps} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                  <YAxis tick={axisTickProps} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={32} {...refLineProps} />
                  <Area type="monotone" dataKey="hotLeads" name="Hot Leads/Month" stroke={ORANGE} fill={ORANGE} fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionTitle>Active Employee Base</SectionTitle>
              <div style={{ color: TEXT3, fontSize: 11, marginBottom: 16 }}>
                Total employees across all introduced employers — the base from which organic conversions and hot leads are generated.
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={calc.data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" tick={axisTickProps} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                  <YAxis tick={axisTickProps} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="employeeBase" name="Active Employees" stroke={BLUE} fill={BLUE} fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}
      </div>

      {/* Report overlay */}
      {showReport && (
        <ReportGenerator
          calc={calc}
          inputs={{
            carPrice, dealMixPct, dealerBrokeragePct,
            aftermarketMargin, insuranceMargin, dealMargin, newSalesPct,
            monthlyIntros, avgEmployees, additionalNLRate,
            repeatRate, hotLeadRate, bmCommission, otherCosts,
          }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

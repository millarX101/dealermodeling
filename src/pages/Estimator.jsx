import { useState, useMemo } from "react";
import ReportGenerator from "../components/ReportGenerator";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine,
  ComposedChart
} from "recharts";

const fmt = (n) => n == null ? "—" : new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
const fmtK = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(2)}M` : n >= 1000 ? `$${(n/1000).toFixed(1)}k` : fmt(n);
const fmtN = (n) => new Intl.NumberFormat("en-AU", { maximumFractionDigits: 1 }).format(n);

// === SEMI-DARK TECH PALETTE ===
const PURPLE = "#A78BFA";
const PINK = "#F472B6";
const TEAL = "#2DD4BF";
const GOLD = "#FBBF24";
const INDIGO = "#818CF8";
const DARK = "#151827";
const CARD = "#1E2235";
const CARD_SOLID = "#1E2235";
const BORDER = "rgba(255,255,255,0.12)";
const TEXT1 = "#F8FAFC";
const TEXT2 = "#CBD5E1";
const TEXT3 = "#8892A8";
const GLOW_PURPLE = "0 0 20px rgba(167,139,250,0.25)";
const GLOW_PINK = "0 0 20px rgba(244,114,182,0.25)";
const GLOW_TEAL = "0 0 20px rgba(45,212,191,0.25)";

const SliderInput = ({ label, value, onChange, min, max, step = 1, prefix = "", suffix = "", format = "number" }) => {
  const display = format === "currency" ? fmt(value) : format === "pct" ? `${value}%` : `${prefix}${value}${suffix}`;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: TEXT2, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{label}</span>
        <span style={{ color: TEAL, fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: PURPLE, cursor: "pointer", height: 4 }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ color: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>{prefix}{min}{suffix}</span>
        <span style={{ color: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>{prefix}{max}{suffix}</span>
      </div>
    </div>
  );
};

const NumberInput = ({ label, value, onChange, prefix = "", suffix = "" }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ color: TEXT2, fontSize: 12, fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 6 }}>{label}</label>
    <div style={{ position: "relative" }}>
      {prefix && <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: TEXT3, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{prefix}</span>}
      <input
        type="number" value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: "100%", background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, borderRadius: 8,
          color: TEAL, padding: `8px ${suffix ? "36px" : "12px"} 8px ${prefix ? "28px" : "12px"}`,
          fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none", boxSizing: "border-box"
        }}
      />
      {suffix && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: TEXT3, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{suffix}</span>}
    </div>
  </div>
);

const Card = ({ children, style = {}, glow = false }) => (
  <div style={{
    background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24,
    boxShadow: glow ? GLOW_PURPLE : "0 2px 12px rgba(0,0,0,0.2)",
    ...style
  }}>
    {children}
  </div>
);

const SectionTitle = ({ children, color = PURPLE }) => (
  <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
    {children}
  </h2>
);

const MetricCard = ({ label, value, sub, color = TEAL, large = false }) => (
  <div style={{
    background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px",
    position: "relative", overflow: "hidden"
  }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
    <div style={{ color: TEXT3, fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
    <div style={{ color, fontFamily: "'DM Serif Display', serif", fontSize: large ? 28 : 22, letterSpacing: "-0.02em" }}>{value}</div>
    {sub && <div style={{ color: TEXT3, fontSize: 11, fontFamily: "'DM Mono', monospace", marginTop: 4 }}>{sub}</div>}
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
    <div style={{ background: "#1A1E33", border: `1px solid rgba(167,139,250,0.3)`, borderRadius: 12, padding: "12px 16px", fontFamily: "'DM Mono', monospace", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
      <div style={{ color: TEXT2, fontSize: 11, marginBottom: 8 }}>Month {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: 12, marginBottom: 3 }}>
          {p.name}: {CURRENCY_KEYS.has(p.dataKey) ? fmtK(p.value) : fmtN(p.value)}
        </div>
      ))}
    </div>
  );
};

// Shared info box style
const infoBox = (accentColor, opacity = 0.08) => ({
  padding: "10px 14px",
  background: accentColor ? `${accentColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}` : "rgba(255,255,255,0.08)",
  borderRadius: 10,
  border: `1px solid ${accentColor ? accentColor + "30" : BORDER}`,
  fontSize: 11, fontFamily: "'DM Mono', monospace", color: TEXT2, lineHeight: 1.6,
});

// Shared stat row style
const statRow = (isLast = false) => ({
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "10px 14px", background: "rgba(255,255,255,0.08)", borderRadius: 8,
  marginBottom: isLast ? 0 : 8,
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
    // Y1=70% from new employers, Y2-Y5=20% (market saturates, most deals from existing employers)
    const yearlyNewEmployerRate = [0.70, 0.20, 0.20, 0.20, 0.20];
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
      // Repeat deals = leases maturing this month (from ~32 months ago) × repeat rate
      // Only the cohort that originated ~32 months ago is up for renewal, not the whole book
      const maturingDeals = m > 32 ? data[m - 33].totalDeals : 0;
      const repeatDeals = maturingDeals * (repeatRate / 100);
      // Hot leads = leases maturing from ~32 months ago — customers returning at lease-end
      const hotLeadsThisMonth = m > 32 ? (data[m - 33].totalDeals) * (hotLeadRate / 100) : 0;
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

  const tabs = [
    { id: "deal", label: "Deal Structure" },
    { id: "growth", label: "Growth Model" },
    { id: "projection", label: "5-Year Projection" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: DARK, color: TEXT1,
      fontFamily: "'Inter', 'DM Sans', sans-serif",
    }}>
      {/* Ambient background glows */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20%", left: "10%", width: "40%", height: "40%", background: "radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: "20%", right: "5%", width: "30%", height: "30%", background: "radial-gradient(circle, rgba(244,114,182,0.06) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "30%", width: "40%", height: "30%", background: "radial-gradient(circle, rgba(45,212,191,0.05) 0%, transparent 70%)" }} />
      </div>

      {/* Google Fonts + Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Inter:wght@300;400;500;600;700&display=swap');
        :root { --purple: #A78BFA; --pink: #F472B6; --teal: #2DD4BF; }
        input[type=range] { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.15); outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: linear-gradient(135deg, #A78BFA, #F472B6); cursor: pointer; box-shadow: 0 0 12px rgba(167,139,250,0.6), 0 0 4px rgba(244,114,182,0.4); }
        input[type=number] { -webkit-appearance: textfield; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        * { box-sizing: border-box; }
        .tab-btn { transition: all 0.2s; }
        .tab-btn:hover { opacity: 0.9; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.3); border-radius: 3px; }
      `}</style>

      {/* HEADER */}
      <div style={{ position: "relative", zIndex: 1, padding: "32px 40px 0", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #A78BFA, #F472B6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 15, color: "white",
                boxShadow: "0 0 20px rgba(167,139,250,0.4)"
              }}>MX</div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: TEXT3, letterSpacing: "0.12em" }}>MXDEALERADVANTAGE</span>
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 34, margin: 0, letterSpacing: "-0.03em", background: "linear-gradient(135deg, #F1F5F9 0%, #A78BFA 60%, #F472B6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Earnings Estimator
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: TEXT3, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>AVG MONTHLY REVENUE</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: TEAL, textShadow: `0 0 20px rgba(45,212,191,0.4)` }}>{fmt(Math.round(calc.totalDealer5yr / 60))}</div>
              <div style={{ color: TEXT3, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>Over 60 Months</div>
            </div>
            <button
              onClick={() => setShowReport(true)}
              style={{
                padding: "12px 24px", borderRadius: 12, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #A78BFA, #F472B6)", color: "white",
                fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600,
                letterSpacing: "0.05em", whiteSpace: "nowrap",
                boxShadow: "0 4px 20px rgba(167,139,250,0.4), 0 0 40px rgba(244,114,182,0.15)",
                transition: "all 0.2s",
              }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(167,139,250,0.5), 0 0 60px rgba(244,114,182,0.2)"; }}
              onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(167,139,250,0.4), 0 0 40px rgba(244,114,182,0.15)"; }}
            >
              Generate Report
            </button>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginTop: 24, borderBottom: `1px solid ${BORDER}`, paddingBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.id} className="tab-btn" onClick={() => setActiveTab(t.id)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 20px", fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: "0.05em",
              color: activeTab === t.id ? PURPLE : TEXT3,
              borderBottom: activeTab === t.id ? `2px solid ${PURPLE}` : "2px solid transparent",
              marginBottom: -1, transition: "all 0.15s",
              textShadow: activeTab === t.id ? `0 0 12px rgba(167,139,250,0.5)` : "none",
            }}>{t.label.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ position: "relative", zIndex: 1, padding: "32px 40px", maxWidth: 1280, margin: "0 auto" }}>

        {/* ===================== TAB: DEAL STRUCTURE ===================== */}
        {activeTab === "deal" && (
          <div>
            {/* Summary Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
              <MetricCard label="Dealer — Referral Deal" value={fmt(calc.ref_dealerShare)} sub="Finance referral revenue" color={PURPLE} />
              <MetricCard label="Dealer — Referral + Add-ons" value={fmt(calc.ref_dealerShare + calc.totalAddOns)} sub="Finance share + dealer add-ons" color={TEAL} />
              <MetricCard label="Dealer — Finance Deal" value={fmt(calc.df_dealerBrokerage)} sub={`${dealerBrokeragePct}% brokerage`} color={PINK} />
              <MetricCard label="Dealer — Finance (net)" value={fmt(calc.df_dealerNet)} sub="After BM commission & costs" color={GOLD} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
              {/* Vehicle & Finance */}
              <Card>
                <SectionTitle color={PURPLE}>Vehicle & Finance</SectionTitle>
                <SliderInput label="Average Car Price (before on-roads)" value={carPrice} onChange={setCarPrice} min={20000} max={150000} step={1000} format="currency" />
                <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.08)", borderRadius: 10, border: `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: TEXT3, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>Net Amount Financed</span>
                    <span style={{ color: TEAL, fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{fmt(carPrice)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: TEXT3, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>Deal Mix (Referral/Dealer)</span>
                    <span style={{ color: PURPLE, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{dealMixPct}% / {100-dealMixPct}%</span>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <SliderInput label="Referral Deals ← → Dealer Finance Deals" value={dealMixPct} onChange={setDealMixPct} min={0} max={100} step={5} format="pct" />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: -8, marginBottom: 8 }}>
                    <span style={{ color: PINK, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>0% = All Dealer Finance</span>
                    <span style={{ color: PURPLE, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>100% = All Referral</span>
                  </div>
                </div>
              </Card>

              {/* Referral Model */}
              <Card style={{ borderColor: `${PURPLE}40` }} glow>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: PURPLE, boxShadow: `0 0 8px ${PURPLE}` }} />
                  <SectionTitle color={PURPLE}>Referral Model</SectionTitle>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={statRow()}>
                    <span style={{ color: TEXT3, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>MX Margin (fixed)</span>
                    <span style={{ color: TEXT2, fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>3% of net financed</span>
                  </div>
                  <div style={statRow()}>
                    <span style={{ color: TEXT3, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>Your Share (fixed)</span>
                    <span style={{ color: TEXT2, fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>30% of that margin</span>
                  </div>
                  <div style={statRow(true)}>
                    <span style={{ color: TEXT3, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>Net Financed</span>
                    <span style={{ color: TEAL, fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{fmt(calc.netFinanced)}</span>
                  </div>
                </div>

                <div style={{ padding: "14px 16px", background: `${PURPLE}14`, borderRadius: 10, border: `1px solid ${PURPLE}30` }}>
                  <div style={{ color: TEXT2, fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Your Earnings Per Deal</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: TEXT3, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>Finance Referral Revenue</span>
                    <span style={{ color: TEAL, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{fmt(calc.ref_dealerShare)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: TEXT3, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>Dealer Add-ons</span>
                    <span style={{ color: TEXT2, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{fmt(calc.totalAddOns)}</span>
                  </div>
                  <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: TEXT3, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>Total Dealer Revenue</span>
                    <span style={{ color: PURPLE, fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{fmt(calc.ref_dealerShare + calc.totalAddOns)}</span>
                  </div>
                </div>
              </Card>

              {/* Dealer Finance Model */}
              <Card style={{ borderColor: `${PINK}40` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: PINK, boxShadow: `0 0 8px ${PINK}` }} />
                  <SectionTitle color={PINK}>Dealer Finance Model</SectionTitle>
                </div>
                <SliderInput label="Dealer Brokerage Rate" value={dealerBrokeragePct} onChange={setDealerBrokeragePct} min={1} max={8} step={0.25} suffix="%" />

                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginTop: 4, marginBottom: 4 }}>
                  <div style={{ color: "#EF4444", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em", marginBottom: 12 }}>DEALER COSTS — FINANCE DEALS ONLY</div>
                  <SliderInput label="BM Commission (per settled deal)" value={bmCommission} onChange={setBmCommission} min={0} max={1000} step={50} format="currency" />
                  <SliderInput label="Other Costs (per deal)" value={otherCosts} onChange={setOtherCosts} min={0} max={1000} step={50} format="currency" />
                </div>

                <div style={{ padding: "14px 16px", background: `${PINK}14`, borderRadius: 10, border: `1px solid ${PINK}30` }}>
                  <div style={{ color: TEXT2, fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Your Earnings Per Deal</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: TEXT3, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>Finance Brokerage ({dealerBrokeragePct}%)</span>
                    <span style={{ color: TEAL, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{fmt(calc.df_dealerBrokerage)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: TEXT3, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>Dealer Add-ons</span>
                    <span style={{ color: TEXT2, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{fmt(calc.totalAddOns)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#EF4444", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>MX Fee ($500+GST)</span>
                    <span style={{ color: "#EF4444", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>({fmt(calc.df_mxFeeInclGST)})</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#EF4444", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>BM Commission</span>
                    <span style={{ color: "#EF4444", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>({fmt(bmCommission)})</span>
                  </div>
                  {otherCosts > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: "#EF4444", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>Other Costs</span>
                      <span style={{ color: "#EF4444", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>({fmt(otherCosts)})</span>
                    </div>
                  )}
                  <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: TEXT3, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>Net Dealer Revenue</span>
                    <span style={{ color: calc.df_dealerNet >= 0 ? PINK : "#EF4444", fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{fmt(calc.df_dealerNet)}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Dealer Add-Ons */}
            <Card style={{ marginTop: 20 }}>
              <SectionTitle color={GOLD}>Dealer Controlled Add-Ons</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                <div>
                  <SliderInput label="Aftermarket Margin" value={aftermarketMargin} onChange={setAftermarketMargin} min={0} max={2000} step={50} format="currency" />
                </div>
                <div>
                  <SliderInput label="Comprehensive Insurance" value={insuranceMargin} onChange={setInsuranceMargin} min={0} max={500} step={25} format="currency" />
                </div>
                <div>
                  <SliderInput label="Metal Margin" value={dealMargin} onChange={setDealMargin} min={-1500} max={5000} step={100} format="currency" />
                  <div style={{ ...infoBox(GOLD, 0.06), marginTop: -8 }}>
                    Only earned on <span style={{ color: GOLD }}>new car sales</span> — not on conversions, refinances, or existing vehicle leases.
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <SliderInput label="New Sales vs Conversions" value={newSalesPct} onChange={setNewSalesPct} min={0} max={100} step={5} format="pct" />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: -10, marginBottom: 8 }}>
                      <span style={{ color: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>0% = All conversions</span>
                      <span style={{ color: GOLD, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>100% = All new cars</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.08)", borderRadius: 8 }}>
                      <span style={{ color: TEXT3, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>Effective Metal Margin</span>
                      <span style={{ color: GOLD, fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{fmt(dealMargin * (newSalesPct / 100))}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 20px", background: `${GOLD}14`, borderRadius: 10, border: `1px solid ${GOLD}30`, marginTop: 8 }}>
                <span style={{ color: TEXT2, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>TOTAL ADD-ONS PER DEAL</span>
                <span style={{ color: GOLD, fontFamily: "'DM Serif Display', serif", fontSize: 24, letterSpacing: "-0.02em", textShadow: `0 0 16px rgba(251,191,36,0.3)` }}>{fmt(calc.totalAddOns)}</span>
                <span style={{ color: TEXT3, fontSize: 11, fontFamily: "'DM Mono', monospace", marginLeft: "auto" }}>Available in both referral and dealer finance models</span>
              </div>
            </Card>
          </div>
        )}

        {/* ===================== TAB: GROWTH MODEL ===================== */}
        {activeTab === "growth" && (
          <>
          {/* Top KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            <MetricCard label="5-Year Dealer Revenue" value={fmtK(calc.totalDealer5yr)} sub="Cumulative earnings" color={TEAL} large />
            <MetricCard label="Total Deals (5yr)" value={fmtN(calc.years.reduce((a, b) => a + b.totalDeals, 0))} sub="New + organic + repeat" color={PURPLE} />
            <MetricCard label="Hot Leads / Month (Yr 5)" value={fmtN(calc.hotLeadsMonth60)} sub="Warm return customers" color={GOLD} />
            <MetricCard label="5-Year Hot Leads" value={fmtN(calc.totalHotLeads5yr)} sub={`${hotLeadRate}% of maturing leases`} color={PINK} />
          </div>

          <div>
            <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20 }}>
              <div>
                <Card>
                  <SectionTitle color={TEAL}>Growth Assumptions</SectionTitle>
                  <SliderInput label="New Deals Introduced / Month" value={monthlyIntros} onChange={setMonthlyIntros} min={1} max={50} step={1} />
                  <SliderInput label="Avg Employees Per Introduced Employer" value={avgEmployees} onChange={setAvgEmployees} min={20} max={1000} step={20} />
                  <SliderInput label="Organic Conversion Rate (monthly)" value={additionalNLRate} onChange={setAdditionalNLRate} min={0.5} max={10} step={0.25} suffix="%" />

                  <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginTop: 8, marginBottom: 16 }}>
                    <div style={{ color: PINK, fontSize: 12, fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em", marginBottom: 12 }}>REPEAT BUSINESS (Month 32+)</div>
                    <SliderInput label="Repeat / Refinance / Trade-Up Rate" value={repeatRate} onChange={setRepeatRate} min={30} max={95} step={5} format="pct" />
                    <div style={infoBox(PINK)}>
                      From month 32, <span style={{ color: PINK }}>{repeatRate}%</span> of maturing leases (32-month term) return via refinance, trade-ups, and new NL applications.
                    </div>
                  </div>
                </Card>

                <Card style={{ marginTop: 16, borderColor: "#EF444440" }}>
                  <div style={{ color: "#EF4444", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em", marginBottom: 12 }}>BAKED-IN REALITY CHECKS</div>
                  <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: TEXT3 }}>
                    {[
                      { l: "Deals from new employers — Yr 1", v: "70%", c: TEXT2 },
                      { l: "Deals from new employers — Yr 2–5", v: "20%", c: TEXT2 },
                      { l: "Dealer deal volume", v: "Constant", c: TEAL },
                      { l: "New employer → first conversions", v: "6 month lag", c: GOLD },
                      { l: "Book churn (annual)", v: "−10% / year", c: "#EF4444" },
                    ].map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 4 ? `1px solid ${BORDER}` : "none" }}>
                        <span>{r.l}</span>
                        <span style={{ color: r.c, fontWeight: 500, flexShrink: 0, marginLeft: 12 }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card style={{ marginTop: 16 }}>
                  <SectionTitle color={PURPLE}>Trail Income Tiers</SectionTitle>
                  <div style={{ color: TEXT3, fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 14, lineHeight: 1.6 }}>
                    Organic conversions & repeat deals — MX originates, dealer earns trail on 3% NAF margin only.
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: TEXT3 }}>
                    {[
                      { l: "≤ 5 organic deals/mo", v: "10%", c: TEXT2 },
                      { l: "6–10 organic deals/mo", v: "12.5%", c: TEXT2 },
                      { l: "11+ organic deals/mo", v: "15%", c: TEAL },
                    ].map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: i === 2 ? `${TEAL}10` : "rgba(255,255,255,0.08)", borderRadius: 8, marginBottom: i < 2 ? 6 : 0, border: i === 2 ? `1px solid ${TEAL}25` : `1px solid ${BORDER}` }}>
                        <span>{r.l}</span>
                        <span style={{ color: r.c, fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>{r.v} of MX margin</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ ...infoBox(PURPLE), marginTop: 12 }}>
                    Intro deals you control always earn the full rate — 30% of NAF margin or your brokerage, plus all add-ons.
                  </div>
                </Card>
              </div>

              <div>
                {/* Year by Year */}
                <Card style={{ marginBottom: 20 }}>
                  <SectionTitle color={PURPLE}>Annual Summary</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                    {calc.years.map(y => (
                      <div key={y.year} style={{
                        padding: "16px 14px", background: "rgba(255,255,255,0.08)", borderRadius: 12,
                        border: `1px solid ${y.year === 5 ? PURPLE + "60" : BORDER}`,
                        position: "relative", overflow: "hidden"
                      }}>
                        {y.year === 5 && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #A78BFA, #F472B6)" }} />}
                        <div style={{ color: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace", marginBottom: 6, textTransform: "uppercase" }}>Year {y.year}</div>
                        <div style={{ color: TEAL, fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: 2 }}>{fmtK(y.dealerRevenue)}</div>
                        <div style={{ color: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>Dealer Revenue</div>
                        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                          <div>
                            <div style={{ color: TEXT2, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{fmtN(y.totalDeals)}</div>
                            <div style={{ color: TEXT3, fontSize: 9, fontFamily: "'DM Mono', monospace" }}>deals</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ color: GOLD, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{fmtN(y.hotLeads)}</div>
                            <div style={{ color: TEXT3, fontSize: 9, fontFamily: "'DM Mono', monospace" }}>hot leads</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Deal Volume Chart */}
                <Card>
                  <SectionTitle color={TEAL}>Monthly Deal Volume — 60 Months</SectionTitle>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={calc.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gNew" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={PURPLE} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gAdd" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={TEAL} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gRep" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={PINK} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={PINK} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="month" tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                      <YAxis tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine x={32} stroke={PINK} strokeDasharray="4 4" label={{ value: "Repeat →", fill: PINK, fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
                      <Area type="monotone" dataKey="newDeals" name="New Deals" stroke={PURPLE} fill="url(#gNew)" strokeWidth={2} />
                      <Area type="monotone" dataKey="additionalDeals" name="Organic Growth" stroke={TEAL} fill="url(#gAdd)" strokeWidth={2} />
                      <Area type="monotone" dataKey="repeatDeals" name="Repeat/Trade-Up" stroke={PINK} fill="url(#gRep)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <div style={{ height: 16 }} />

                {/* Monthly Income Breakdown Chart */}
                <Card>
                  <SectionTitle color={TEAL}>Monthly Income — Total & Breakdown</SectionTitle>
                  <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
                    <span style={{ color: TEAL }}>● Total Monthly Income</span>
                    <span style={{ color: PURPLE }}>■ Dealer Originated</span>
                    <span style={{ color: GOLD }}>■ Trail / MX System</span>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={calc.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gDirect" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={PURPLE} stopOpacity={0.6} />
                          <stop offset="100%" stopColor={PURPLE} stopOpacity={0.15} />
                        </linearGradient>
                        <linearGradient id="gTrail" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={GOLD} stopOpacity={0.6} />
                          <stop offset="100%" stopColor={GOLD} stopOpacity={0.15} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="month" tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                      <YAxis tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const direct = payload.find(p => p.dataKey === "directIncome")?.value || 0;
                        const trail = payload.find(p => p.dataKey === "trailIncome")?.value || 0;
                        const total = direct + trail;
                        const directPct = total > 0 ? Math.round(direct / total * 100) : 0;
                        const trailPct = total > 0 ? 100 - directPct : 0;
                        return (
                          <div style={{ background: "#1A1E33", border: `1px solid rgba(167,139,250,0.3)`, borderRadius: 12, padding: "12px 16px", fontFamily: "'DM Mono', monospace", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                            <div style={{ color: TEXT2, fontSize: 11, marginBottom: 8 }}>Month {label}</div>
                            <div style={{ color: TEAL, fontSize: 13, fontWeight: 700, marginBottom: 6, borderBottom: `1px solid ${BORDER}`, paddingBottom: 6 }}>
                              Total: {fmtK(total)}
                            </div>
                            <div style={{ color: PURPLE, fontSize: 12, marginBottom: 3 }}>
                              Dealer Originated: {fmtK(direct)} ({directPct}%)
                            </div>
                            <div style={{ color: GOLD, fontSize: 12 }}>
                              Trail / MX System: {fmtK(trail)} ({trailPct}%)
                            </div>
                          </div>
                        );
                      }} />
                      <ReferenceLine x={32} stroke={PINK} strokeDasharray="4 4" label={{ value: "Repeat →", fill: "#F8FAFC", fontSize: 12, fontWeight: 600, fontFamily: "'DM Mono', monospace" }} />
                      <Area type="monotone" dataKey="directIncome" name="Dealer Originated" stroke="none" fill="url(#gDirect)" stackId="income" />
                      <Area type="monotone" dataKey="trailIncome" name="Trail / MX System" stroke="none" fill="url(#gTrail)" stackId="income" />
                      <Line type="monotone" dataKey="dealerRevenue" name="Total Monthly Income" stroke={TEAL} strokeWidth={2.5} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </div>
          </div>

          {/* HOT LEADS HERO — full width */}
          <div style={{
            marginTop: 20,
            background: "linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(251,191,36,0.03) 50%, rgba(167,139,250,0.06) 100%)",
            border: `1px solid rgba(251,191,36,0.3)`,
            borderRadius: 20, padding: "28px 32px",
            position: "relative", overflow: "hidden"
          }}>
            <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: GOLD, boxShadow: `0 0 12px ${GOLD}` }} />
                  <span style={{ color: GOLD, fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>Hot New Car Leads Pipeline</span>
                </div>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: TEXT1, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
                  Every retained lease is a future car sale.
                </h2>
                <p style={{ color: TEXT2, fontSize: 13, fontFamily: "'Inter', sans-serif", margin: "0 0 20px", lineHeight: 1.7, maxWidth: 560 }}>
                  Customers nearing lease-end or upgrade cycle are warm, pre-qualified introductions sent directly back to your dealership floor. This is your pipeline — not cold leads.
                </p>
                <div style={{ maxWidth: 420 }}>
                  <SliderInput label="% of Maturing Leases Returning as Hot Leads" value={hotLeadRate} onChange={setHotLeadRate} min={30} max={100} step={5} format="pct" />
                </div>
              </div>
              <div style={{ textAlign: "center", minWidth: 220 }}>
                <div style={{ color: TEXT3, fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>By Year 5</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 72, color: GOLD, lineHeight: 1, letterSpacing: "-0.04em", textShadow: `0 0 40px rgba(251,191,36,0.4)` }}>
                  {fmtN(calc.hotLeadsMonth60)}
                </div>
                <div style={{ color: TEXT2, fontSize: 13, fontFamily: "'DM Mono', monospace", marginTop: 6 }}>hot leads / month</div>
                <div style={{ marginTop: 16, padding: "10px 16px", background: "rgba(0,0,0,0.2)", borderRadius: 10, border: `1px solid rgba(251,191,36,0.2)` }}>
                  <div style={{ color: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace", marginBottom: 4, textTransform: "uppercase" }}>5-Year Total</div>
                  <div style={{ color: GOLD, fontFamily: "'DM Serif Display', serif", fontSize: 28, letterSpacing: "-0.02em" }}>{fmtN(calc.totalHotLeads5yr)}</div>
                  <div style={{ color: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>warm introductions</div>
                </div>
              </div>
            </div>
          </div>

          {/* ====== LEAD FARMING vs CARSALES ====== */}
          <div style={{
            marginTop: 20,
            background: `linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(45,212,191,0.06) 100%)`,
            border: `1px solid ${BORDER}`, borderRadius: 20,
            padding: "32px 32px 28px", position: "relative", overflow: "hidden"
          }}>
            <div style={{ position: "absolute", top: -80, left: -80, width: 200, height: 200, background: "radial-gradient(circle, rgba(45,212,191,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: TEAL, boxShadow: `0 0 12px ${TEAL}` }} />
              <span style={{ color: TEAL, fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>Lead Farming — MX vs Buying Leads</span>
            </div>

            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: TEXT1, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
              Stop paying for cold leads. MX farms them for free.
            </h2>
            <p style={{ color: TEXT2, fontSize: 12, fontFamily: "'Inter', sans-serif", margin: "0 0 24px", lineHeight: 1.7, maxWidth: 680 }}>
              MX automatically delivers new employer intros and repeat customer leads directly to your floor — pre-qualified, warm, and at zero cost.
              Compare that to buying cold leads from Carsales at <span style={{ color: "#EF4444", fontWeight: 600 }}>$100/lead</span> with a <span style={{ color: "#EF4444", fontWeight: 600 }}>20% close rate</span>.
              MX leads close at <span style={{ color: TEAL, fontWeight: 600 }}>80%</span>.
            </p>

            {/* KPI comparison cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              <div style={{ background: `${TEAL}14`, border: `1px solid ${TEAL}40`, borderRadius: 12, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ color: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>MX Leads / Month (Yr 5)</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: TEAL }}>{fmtN(calc.mxLeadsMonth60)}</div>
                <div style={{ color: TEAL, fontSize: 11, fontFamily: "'DM Mono', monospace", marginTop: 4 }}>$0 cost</div>
              </div>
              <div style={{ background: "rgba(239,68,68,0.06)", border: `1px solid rgba(239,68,68,0.25)`, borderRadius: 12, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ color: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Carsales Leads Needed</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: "#EF4444" }}>{fmtN(calc.carsalesLeadsMonth60)}</div>
                <div style={{ color: "#EF4444", fontSize: 11, fontFamily: "'DM Mono', monospace", marginTop: 4 }}>{fmtK(calc.carsalesCostMonth60)}/mo</div>
              </div>
              <div style={{ background: `${PURPLE}14`, border: `1px solid ${PURPLE}30`, borderRadius: 12, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ color: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>5-Year Carsales Cost</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: "#EF4444" }}>{fmtK(calc.totalCarsalesCost5yr)}</div>
                <div style={{ color: TEXT2, fontSize: 11, fontFamily: "'DM Mono', monospace", marginTop: 4 }}>to match MX output</div>
              </div>
              <div style={{ background: `${TEAL}1A`, border: `1px solid ${TEAL}50`, borderRadius: 12, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ color: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>You Save</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: TEAL, textShadow: `0 0 16px rgba(45,212,191,0.3)` }}>{fmtK(calc.totalCarsalesCost5yr)}</div>
                <div style={{ color: TEAL, fontSize: 11, fontFamily: "'DM Mono', monospace", marginTop: 4 }}>MX leads are free</div>
              </div>
            </div>

            {/* Side-by-side comparison */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ background: `${TEAL}0A`, border: `1px solid ${TEAL}30`, borderRadius: 14, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: TEAL, boxShadow: `0 0 8px ${TEAL}` }} />
                  <span style={{ color: TEAL, fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>MX DealerAdvantage</span>
                </div>
                <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: TEXT2, lineHeight: 2.4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 4 }}>
                    <span>Cost per lead</span><span style={{ color: TEAL, fontWeight: 700 }}>$0</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 4 }}>
                    <span>Close rate</span><span style={{ color: TEAL, fontWeight: 700 }}>80%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 4 }}>
                    <span>Lead source</span><span style={{ color: TEXT1 }}>Auto-farmed to you</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 4 }}>
                    <span>New intro leads</span><span style={{ color: TEAL }}>Employer partnerships</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Repeat leads</span><span style={{ color: TEAL }}>Lease-end / trade-ups</span>
                  </div>
                </div>
              </div>
              <div style={{ background: "rgba(239,68,68,0.04)", border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 14, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />
                  <span style={{ color: "#EF4444", fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>Carsales (equivalent)</span>
                </div>
                <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: TEXT2, lineHeight: 2.4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 4 }}>
                    <span>Cost per lead</span><span style={{ color: "#EF4444", fontWeight: 700 }}>$100</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 4 }}>
                    <span>Close rate</span><span style={{ color: "#EF4444", fontWeight: 700 }}>20%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 4 }}>
                    <span>Lead source</span><span style={{ color: TEXT2 }}>Cold online enquiries</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 4 }}>
                    <span>Leads needed / mo (Yr 5)</span><span style={{ color: "#EF4444" }}>{fmtN(calc.carsalesLeadsMonth60)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Monthly cost (Yr 5)</span><span style={{ color: "#EF4444" }}>{fmtK(calc.carsalesCostMonth60)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Carsales Cost Chart */}
            <Card style={{ background: "rgba(0,0,0,0.15)", borderColor: BORDER }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <SectionTitle color={TEAL}>Monthly Cost to Match MX Lead Output</SectionTitle>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#EF4444", fontFamily: "'DM Serif Display', serif", fontSize: 20 }}>{fmtK(calc.totalCarsalesCost5yr)}</div>
                  <div style={{ color: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Carsales spend over 5 years</div>
                </div>
              </div>
              <div style={{ color: TEXT3, fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>
                What you'd pay Carsales each month ($100/lead, 20% close) to match the same closed deals MX delivers for free (80% close).
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={calc.data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gCarsales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                  <YAxis tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => fmtK(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={32} stroke={PINK} strokeDasharray="4 4" label={{ value: "Repeat →", fill: PINK, fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
                  <Area type="monotone" dataKey="carsalesCost" name="Carsales Cost/Month" stroke="#EF4444" fill="url(#gCarsales)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="mxCost" name="MX Cost/Month" stroke={TEAL} fill={TEAL} fillOpacity={0.1} strokeWidth={2} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Lead volume comparison */}
            <Card style={{ marginTop: 16, background: "rgba(0,0,0,0.15)", borderColor: BORDER }}>
              <SectionTitle color={PURPLE}>MX Lead Sources vs Carsales Volume Needed</SectionTitle>
              <div style={{ color: TEXT3, fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>
                New intro leads + organic repeat leads (free, 80% close) vs the Carsales lead volume needed to match (at 20% close).
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={calc.data.filter(d => d.month % 3 === 0)} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : `M${v}`} />
                  <YAxis tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: TEXT2 }} />
                  <Bar dataKey="mxNewIntroLeads" name="MX New Intros" stackId="mx" fill={PURPLE} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="mxRepeatLeads" name="MX Repeat/Organic" stackId="mx" fill={TEAL} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="carsalesLeadsNeeded" name="Carsales Needed" fill="#EF444460" stroke="#EF4444" strokeWidth={1} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Cumulative savings */}
            <Card style={{ marginTop: 16, background: "rgba(0,0,0,0.15)", borderColor: BORDER }}>
              <SectionTitle color={TEAL}>Cumulative Savings vs Carsales</SectionTitle>
              <div style={{ color: TEXT3, fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>
                Running total of what you'd spend on Carsales to match MX's free lead output. This is money that stays in your pocket.
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={calc.data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gCumSave" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={TEAL} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                  <YAxis tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => fmtK(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={32} stroke={PINK} strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="cumCarsalesCost" name="Cumulative Savings" stroke={TEAL} fill="url(#gCumSave)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Year-by-year comparison table */}
            <div style={{ marginTop: 16, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
                <thead>
                  <tr>
                    {["", "MX Leads", "Close Rate", "Closed Deals", "MX Cost", "Carsales Leads", "Close Rate", "Carsales Cost"].map((h, i) => (
                      <th key={i} style={{
                        padding: "10px 12px", textAlign: i === 0 ? "left" : "right",
                        fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em",
                        color: TEXT3, borderBottom: `2px solid ${BORDER}`, background: "rgba(0,0,0,0.15)"
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calc.years.map(y => (
                    <tr key={y.year}>
                      <td style={{ padding: "10px 12px", color: TEXT2, borderBottom: `1px solid ${BORDER}` }}>Year {y.year}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: TEAL, fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>{fmtN(y.mxLeads)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: TEAL, borderBottom: `1px solid ${BORDER}` }}>80%</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: TEXT1, fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>{fmtN(y.mxClosed)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: TEAL, fontWeight: 700, borderBottom: `1px solid ${BORDER}` }}>$0</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#EF4444", borderBottom: `1px solid ${BORDER}` }}>{fmtN(y.carsalesLeads)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#EF4444", borderBottom: `1px solid ${BORDER}` }}>20%</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#EF4444", fontWeight: 700, borderBottom: `1px solid ${BORDER}` }}>{fmtK(y.carsalesCost)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: "10px 12px", color: TEXT1, fontWeight: 700, borderTop: `2px solid ${BORDER}` }}>5-Year Total</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: TEAL, fontWeight: 700, borderTop: `2px solid ${BORDER}` }}>{fmtN(calc.years.reduce((a, b) => a + b.mxLeads, 0))}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: TEAL, borderTop: `2px solid ${BORDER}` }}>80%</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: TEXT1, fontWeight: 700, borderTop: `2px solid ${BORDER}` }}>{fmtN(calc.years.reduce((a, b) => a + b.mxClosed, 0))}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: TEAL, fontWeight: 700, fontSize: 13, borderTop: `2px solid ${BORDER}` }}>$0</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#EF4444", borderTop: `2px solid ${BORDER}` }}>{fmtN(calc.years.reduce((a, b) => a + b.carsalesLeads, 0))}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#EF4444", borderTop: `2px solid ${BORDER}` }}>20%</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#EF4444", fontWeight: 700, fontSize: 13, borderTop: `2px solid ${BORDER}` }}>{fmtK(calc.totalCarsalesCost5yr)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ ...infoBox(TEAL), marginTop: 16 }}>
              MX leads include new employer intros and organic repeat business (lease-end, refinance, trade-ups) — all delivered automatically to your dealership at no cost. The Carsales equivalent shows how many cold leads at $100 each (20% close) you'd need to buy to match the same number of closed deals.
            </div>
          </div>

          </>
        )}

        {/* ===================== TAB: 5-YEAR PROJECTION ===================== */}
        {activeTab === "projection" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              <MetricCard label="5-Year Dealer Revenue" value={fmtK(calc.totalDealer5yr)} sub="Cumulative" color={TEAL} large />
              <MetricCard label="Yr 5 Hot Leads/Month" value={fmtN(calc.hotLeadsMonth60)} sub="New car pipeline" color={PURPLE} />
              <MetricCard label="Month 1 Dealer Revenue" value={fmtK(calc.data[0]?.dealerRevenue)} sub="Starting point" color={INDIGO} />
              <MetricCard label="Hot Leads/Month — Yr 5" value={fmtN(calc.hotLeadsMonth60)} sub={`${hotLeadRate}% of maturing leases`} color={GOLD} />
            </div>

            <Card style={{ marginBottom: 20 }}>
              <SectionTitle color={PURPLE}>Monthly Income from MX Model — 60 Months</SectionTitle>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={calc.data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradMX" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PURPLE} stopOpacity={0.5} />
                      <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradDealer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={TEAL} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : v === 1 ? "M1" : ""} />
                  <YAxis tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => fmtK(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: TEXT2 }} />
                  <ReferenceLine x={32} stroke={PINK} strokeDasharray="4 4" label={{ value: "Repeat Kicks In", fill: "#F8FAFC", fontSize: 12, fontWeight: 600, fontFamily: "'DM Mono', monospace", position: "top" }} />
                  <Area type="monotone" dataKey="mxRevenue" name="Income from MX Model" stroke={PURPLE} fill="url(#gradMX)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="dealerRevenue" name="Dealer Revenue" stroke={TEAL} fill="url(#gradDealer)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card style={{ marginBottom: 20 }}>
              <SectionTitle color={TEAL}>Cumulative Revenue</SectionTitle>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={calc.data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                  <YAxis tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => fmtK(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: TEXT2 }} />
                  <ReferenceLine x={32} stroke={PINK} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="cumMxRevenue" name="Cumulative MX Model Income" stroke={PURPLE} strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="cumDealerRevenue" name="Cumulative Dealer" stroke={TEAL} strokeWidth={2} dot={false} strokeDasharray="6 3" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card style={{ marginBottom: 20, borderColor: `${GOLD}40` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <SectionTitle color={GOLD}>Hot New Car Leads Pipeline</SectionTitle>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: GOLD, fontFamily: "'DM Serif Display', serif", fontSize: 22, textShadow: `0 0 12px rgba(251,191,36,0.3)` }}>{fmtN(calc.totalHotLeads5yr)}</div>
                  <div style={{ color: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>total leads over 5 years</div>
                </div>
              </div>
              <div style={{ color: TEXT3, fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>
                Leases mature from month 32 — {hotLeadRate}% of maturing deals return as warm car-buying leads, sent direct to your floor. Slow ramp reflects real book maturity.
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={calc.data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GOLD} stopOpacity={0.5} />
                      <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                  <YAxis tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={32} stroke={PINK} strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="hotLeads" name="Hot Leads/Month" stroke={GOLD} fill="url(#gradLeads)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionTitle color={INDIGO}>Active Employee Base</SectionTitle>
              <div style={{ color: TEXT3, fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>
                Total employees across all introduced employers — the base from which organic conversions and hot leads are generated.
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={calc.data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradEmp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={INDIGO} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={INDIGO} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                  <YAxis tick={{ fill: TEXT3, fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="employeeBase" name="Active Employees" stroke={INDIGO} fill="url(#gradEmp)" strokeWidth={2} />
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

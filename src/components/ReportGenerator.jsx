import { useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine, Cell
} from "recharts";

const fmt = (n) => n == null ? "—" : new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
const fmtK = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(2)}M` : n >= 1000 ? `$${(n/1000).toFixed(1)}k` : fmt(n);
const fmtN = (n) => new Intl.NumberFormat("en-AU", { maximumFractionDigits: 1 }).format(n);

const PURPLE = "#8B5CF6";
const PINK = "#EC4899";
const TEAL = "#14B8A6";
const GOLD = "#F59E0B";
const INDIGO = "#6366F1";

export default function ReportGenerator({ calc, inputs, onClose }) {
  const reportRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric", month: "long", year: "numeric"
  });

  // Monthly milestones for the journey section
  const milestones = [1, 3, 6, 12, 24, 36, 48, 60].map(m => {
    const d = calc.data[m - 1];
    return d ? { month: m, deals: d.totalDeals, revenue: d.dealerRevenue, hotLeads: d.hotLeads, cumRevenue: d.cumDealerRevenue } : null;
  }).filter(Boolean);

  // First 12 months detailed
  const first12 = calc.data.slice(0, 12);

  // Year-end monthly snapshots (Month 12, 24, 36, 48, 60)
  const yearEndMonths = [11, 23, 35, 47, 59].map(i => calc.data[i]).filter(Boolean);

  return (
    <div className="report-overlay">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Inter:wght@300;400;500;600;700&display=swap');

        .report-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: #f4f4f8;
          overflow-y: auto;
          font-family: 'Inter', system-ui, sans-serif;
          color: #1a1a2e;
        }

        .report-toolbar {
          position: sticky; top: 0; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 32px;
          background: #0F0F1A;
          border-bottom: 1px solid #2A2A45;
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        }
        .report-toolbar span { color: #9CA3AF; font-size: 13px; font-family: 'DM Mono', monospace; }
        .toolbar-btns { display: flex; gap: 10px; }
        .btn-print {
          padding: 8px 24px; border-radius: 8px; border: none; cursor: pointer;
          font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 600;
          background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white;
          transition: opacity 0.15s;
        }
        .btn-print:hover { opacity: 0.85; }
        .btn-close-report {
          padding: 8px 20px; border-radius: 8px; cursor: pointer;
          font-family: 'DM Mono', monospace; font-size: 13px;
          background: transparent; color: #9CA3AF;
          border: 1px solid #2A2A45;
          transition: all 0.15s;
        }
        .btn-close-report:hover { border-color: #9CA3AF; color: #E5E7EB; }

        .report-page {
          max-width: 900px; margin: 32px auto; padding: 56px 64px;
          background: white; border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          line-height: 1.6;
        }

        /* ---- Print styles ---- */
        @media print {
          /* Hide ALL app content — only the report prints */
          body * { visibility: hidden !important; }
          .report-overlay, .report-overlay * { visibility: visible !important; }
          .report-overlay {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white; overflow: visible; z-index: 99999;
          }
          .report-toolbar { display: none !important; }
          .report-page {
            margin: 0; padding: 40px 48px; box-shadow: none; border-radius: 0;
            max-width: 100%;
          }
          .page-break { page-break-before: always; }
          .no-print { display: none !important; }
          @page { margin: 0.6in; size: A4; }
        }

        /* ---- Report typography ---- */
        .rpt-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 2px solid #E5E7EB; }
        .rpt-logo { display: flex; align-items: center; gap: 12px; }
        .rpt-logo-box {
          width: 40px; height: 40px; border-radius: 10px;
          background: linear-gradient(135deg, #8B5CF6, #EC4899);
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Mono', monospace; font-weight: 700; font-size: 15px; color: white;
        }
        .rpt-brand { font-family: 'DM Mono', monospace; font-size: 11px; color: #9CA3AF; letter-spacing: 0.1em; }
        .rpt-title { font-family: 'DM Serif Display', serif; font-size: 28px; color: #1a1a2e; margin: 4px 0 0; letter-spacing: -0.02em; }
        .rpt-meta { text-align: right; font-family: 'DM Mono', monospace; font-size: 11px; color: #9CA3AF; line-height: 1.8; }

        .rpt-section { margin-bottom: 32px; }
        .rpt-section-title {
          font-family: 'DM Serif Display', serif; font-size: 18px; letter-spacing: -0.02em;
          margin: 0 0 16px; padding-bottom: 8px;
          border-bottom: 1px solid #E5E7EB;
        }

        /* Monthly hero — big impact numbers */
        .rpt-monthly-hero {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 12px;
        }
        .rpt-month-card {
          padding: 20px; border-radius: 12px; text-align: center;
        }
        .rpt-month-card.primary { background: linear-gradient(135deg, #8B5CF6, #6D28D9); color: white; }
        .rpt-month-card.growth { background: linear-gradient(135deg, #0D9488, #059669); color: white; }
        .rpt-month-card.mature { background: linear-gradient(135deg, #D97706, #B45309); color: white; }
        .rpt-month-label { font-family: 'DM Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.75; margin-bottom: 6px; }
        .rpt-month-value { font-family: 'DM Serif Display', serif; font-size: 36px; letter-spacing: -0.03em; }
        .rpt-month-sub { font-family: 'DM Mono', monospace; font-size: 10px; opacity: 0.6; margin-top: 4px; }
        .rpt-month-deals { font-family: 'DM Mono', monospace; font-size: 11px; opacity: 0.8; margin-top: 2px; }

        /* Arrow growth row */
        .rpt-growth-arrow {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px; margin-bottom: 24px;
          font-family: 'DM Mono', monospace; font-size: 12px; color: #6B7280;
        }
        .rpt-growth-arrow .arrow { color: ${TEAL}; font-size: 18px; font-weight: 700; }
        .rpt-growth-arrow .pct { color: ${TEAL}; font-weight: 700; }

        .rpt-hero-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
        .rpt-hero-card {
          padding: 20px; border-radius: 12px; text-align: center;
        }
        .rpt-hero-card.primary { background: linear-gradient(135deg, #8B5CF6, #6D28D9); color: white; }
        .rpt-hero-card.secondary { background: #F0FDF4; border: 1px solid #BBF7D0; }
        .rpt-hero-card.accent { background: #FFFBEB; border: 1px solid #FDE68A; }
        .rpt-hero-label { font-family: 'DM Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.7; margin-bottom: 6px; }
        .rpt-hero-value { font-family: 'DM Serif Display', serif; font-size: 32px; letter-spacing: -0.03em; }
        .rpt-hero-sub { font-family: 'DM Mono', monospace; font-size: 10px; opacity: 0.6; margin-top: 4px; }

        .rpt-table { width: 100%; border-collapse: collapse; font-size: 12px; font-family: 'DM Mono', monospace; }
        .rpt-table th {
          text-align: left; padding: 8px 12px; font-size: 10px; text-transform: uppercase;
          letter-spacing: 0.06em; color: #6B7280; border-bottom: 2px solid #E5E7EB;
          background: #F9FAFB;
        }
        .rpt-table th.right, .rpt-table td.right { text-align: right; }
        .rpt-table td { padding: 8px 12px; border-bottom: 1px solid #F3F4F6; color: #374151; }
        .rpt-table tr:last-child td { border-bottom: none; }
        .rpt-table .total-row td { font-weight: 700; border-top: 2px solid #E5E7EB; border-bottom: none; color: #1a1a2e; }
        .rpt-table .highlight { color: #8B5CF6; font-weight: 600; }
        .rpt-table .teal { color: #0D9488; }
        .rpt-table .gold { color: #D97706; }

        .rpt-kv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; }
        .rpt-kv { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F3F4F6; }
        .rpt-kv-label { font-family: 'DM Mono', monospace; font-size: 11px; color: #6B7280; }
        .rpt-kv-value { font-family: 'DM Mono', monospace; font-size: 12px; color: #1a1a2e; font-weight: 600; }

        .rpt-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

        .rpt-deal-card {
          padding: 20px; border-radius: 12px; border: 1px solid #E5E7EB;
        }
        .rpt-deal-card h4 {
          font-family: 'DM Mono', monospace; font-size: 12px; text-transform: uppercase;
          letter-spacing: 0.06em; margin: 0 0 12px; padding-bottom: 8px;
          border-bottom: 1px solid #E5E7EB;
        }
        .rpt-deal-line { display: flex; justify-content: space-between; margin-bottom: 6px; font-family: 'DM Mono', monospace; font-size: 11px; }
        .rpt-deal-total { display: flex; justify-content: space-between; padding-top: 8px; border-top: 2px solid #E5E7EB; margin-top: 8px; font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 700; }

        .rpt-chart-wrapper { margin: 16px 0; }

        .rpt-note {
          font-family: 'DM Mono', monospace; font-size: 10px; color: #9CA3AF;
          margin-top: 8px; line-height: 1.6; padding: 10px 14px;
          background: #F9FAFB; border-radius: 8px; border: 1px solid #F3F4F6;
        }

        .rpt-footer {
          margin-top: 40px; padding-top: 20px; border-top: 2px solid #E5E7EB;
          display: flex; justify-content: space-between; align-items: center;
        }
        .rpt-footer-left { font-family: 'DM Mono', monospace; font-size: 10px; color: #9CA3AF; line-height: 1.8; }
        .rpt-footer-right { text-align: right; }
        .rpt-confidential {
          display: inline-block; padding: 4px 12px; border-radius: 4px;
          background: #FEF2F2; border: 1px solid #FECACA;
          font-family: 'DM Mono', monospace; font-size: 10px; color: #DC2626;
          letter-spacing: 0.1em; text-transform: uppercase;
        }
      `}</style>

      {/* TOOLBAR — hidden on print */}
      <div className="report-toolbar no-print">
        <span>Dealer Revenue Report Preview</span>
        <div className="toolbar-btns">
          <button className="btn-close-report" onClick={onClose}>Close</button>
          <button className="btn-print" onClick={handlePrint}>Print / Save PDF</button>
        </div>
      </div>

      {/* ====== PAGE 1: Monthly Earnings Focus ====== */}
      <div className="report-page" ref={reportRef}>

        {/* Header */}
        <div className="rpt-header">
          <div>
            <div className="rpt-logo">
              <div className="rpt-logo-box">MX</div>
              <div>
                <div className="rpt-brand">MXDEALERADVANTAGE</div>
                <div className="rpt-title">Your Monthly Earnings & Long Term Modeling</div>
              </div>
            </div>
          </div>
          <div className="rpt-meta">
            <div>Generated: {today}</div>
            <div>Long Term Model: 60 Months</div>
            <div>Currency: AUD</div>
          </div>
        </div>

        {/* === MONTHLY HERO — The headline: what you earn per month === */}
        <div className="rpt-section">
          <div className="rpt-monthly-hero">
            <div className="rpt-month-card primary">
              <div className="rpt-month-label">Month 1 — You Earn</div>
              <div className="rpt-month-value">{fmt(calc.data[0]?.dealerRevenue)}</div>
              <div className="rpt-month-deals">{fmtN(calc.data[0]?.totalDeals)} deals</div>
              <div className="rpt-month-sub">from day one</div>
            </div>
            <div className="rpt-month-card growth">
              <div className="rpt-month-label">Month 12 — You Earn</div>
              <div className="rpt-month-value">{fmt(calc.data[11]?.dealerRevenue)}</div>
              <div className="rpt-month-deals">{fmtN(calc.data[11]?.totalDeals)} deals</div>
              <div className="rpt-month-sub">as organic kicks in</div>
            </div>
            <div className="rpt-month-card mature">
              <div className="rpt-month-label">Month 60 — You Earn</div>
              <div className="rpt-month-value">{fmt(calc.data[59]?.dealerRevenue)}</div>
              <div className="rpt-month-deals">{fmtN(calc.data[59]?.totalDeals)} deals</div>
              <div className="rpt-month-sub">fully mature book</div>
            </div>
          </div>
          <div className="rpt-growth-arrow">
            <span>Month 1: {fmt(calc.data[0]?.dealerRevenue)}</span>
            <span className="arrow">→</span>
            <span>Month 60: {fmt(calc.data[59]?.dealerRevenue)}</span>
            <span className="arrow">=</span>
            <span className="pct">{calc.data[0]?.dealerRevenue > 0 ? `${Math.round(((calc.data[59]?.dealerRevenue / calc.data[0]?.dealerRevenue) - 1) * 100)}% growth` : "—"}</span>
          </div>
        </div>

        {/* What You Earn Per Deal */}
        <div className="rpt-section">
          <h2 className="rpt-section-title" style={{ color: PURPLE }}>What You Earn Per Deal</h2>
          <div className="rpt-2col">
            {/* Referral Model */}
            <div className="rpt-deal-card" style={{ borderColor: `${PURPLE}40` }}>
              <h4 style={{ color: PURPLE }}>Referral Model</h4>
              <div className="rpt-deal-line">
                <span style={{ color: "#6B7280" }}>Net Amount Financed</span>
                <span>{fmt(calc.netFinanced)}</span>
              </div>
              <div className="rpt-deal-line">
                <span style={{ color: "#6B7280" }}>MX Margin (3% NAF)</span>
                <span>{fmt(calc.ref_mxGross)}</span>
              </div>
              <div className="rpt-deal-line">
                <span style={{ color: "#6B7280" }}>Your Share (30%)</span>
                <span style={{ color: PURPLE, fontWeight: 600 }}>{fmt(calc.ref_dealerShare)}</span>
              </div>
              <div className="rpt-deal-line">
                <span style={{ color: "#6B7280" }}>Dealer Add-ons</span>
                <span>{fmt(calc.totalAddOns)}</span>
              </div>
              <div className="rpt-deal-total">
                <span>Total Per Deal</span>
                <span style={{ color: PURPLE }}>{fmt(calc.ref_dealerShare + calc.totalAddOns)}</span>
              </div>
            </div>

            {/* Dealer Finance Model */}
            <div className="rpt-deal-card" style={{ borderColor: `${PINK}40` }}>
              <h4 style={{ color: PINK }}>Dealer Finance Model</h4>
              <div className="rpt-deal-line">
                <span style={{ color: "#6B7280" }}>Net Amount Financed</span>
                <span>{fmt(calc.netFinanced)}</span>
              </div>
              <div className="rpt-deal-line">
                <span style={{ color: "#6B7280" }}>Finance Brokerage ({inputs.dealerBrokeragePct}%)</span>
                <span>{fmt(calc.df_dealerBrokerage)}</span>
              </div>
              <div className="rpt-deal-line">
                <span style={{ color: "#6B7280" }}>Dealer Add-ons</span>
                <span>{fmt(calc.totalAddOns)}</span>
              </div>
              <div className="rpt-deal-line">
                <span style={{ color: "#EF4444" }}>Less: MX Fee ($500+GST)</span>
                <span style={{ color: "#EF4444" }}>({fmt(calc.df_mxFeeInclGST)})</span>
              </div>
              <div className="rpt-deal-line">
                <span style={{ color: "#EF4444" }}>Less: BM Commission</span>
                <span style={{ color: "#EF4444" }}>({fmt(inputs.bmCommission)})</span>
              </div>
              {inputs.otherCosts > 0 && (
                <div className="rpt-deal-line">
                  <span style={{ color: "#EF4444" }}>Less: Other Costs</span>
                  <span style={{ color: "#EF4444" }}>({fmt(inputs.otherCosts)})</span>
                </div>
              )}
              <div className="rpt-deal-total">
                <span>Net Per Deal</span>
                <span style={{ color: PINK }}>{fmt(calc.df_dealerNet)}</span>
              </div>
            </div>
          </div>

          <div className="rpt-note">
            Deal mix: {inputs.dealMixPct}% Referral / {100 - inputs.dealMixPct}% Dealer Finance &nbsp;|&nbsp;
            Blended revenue per new intro: <strong style={{ color: PURPLE }}>{fmt(calc.dealerRevenue_newIntro)}</strong> &nbsp;|&nbsp;
            Avg car price (before on-roads): {fmt(inputs.carPrice)}
          </div>
        </div>

        {/* Add-ons Breakdown */}
        <div className="rpt-section">
          <h2 className="rpt-section-title" style={{ color: GOLD }}>Dealer Add-On Breakdown</h2>
          <div className="rpt-kv-grid" style={{ gridTemplateColumns: "1fr" }}>
            <div className="rpt-kv">
              <span className="rpt-kv-label">Aftermarket Margin</span>
              <span className="rpt-kv-value">{fmt(inputs.aftermarketMargin)}</span>
            </div>
            <div className="rpt-kv">
              <span className="rpt-kv-label">Comprehensive Insurance</span>
              <span className="rpt-kv-value">{fmt(inputs.insuranceMargin)}</span>
            </div>
            <div className="rpt-kv">
              <span className="rpt-kv-label">Metal Margin (weighted at {inputs.newSalesPct}% new sales)</span>
              <span className="rpt-kv-value">{fmt(inputs.dealMargin * (inputs.newSalesPct / 100))}</span>
            </div>
            <div className="rpt-kv" style={{ borderBottom: "2px solid #E5E7EB" }}>
              <span className="rpt-kv-label" style={{ fontWeight: 700, color: "#1a1a2e" }}>Total Add-Ons Per Deal</span>
              <span className="rpt-kv-value" style={{ color: GOLD, fontSize: 14 }}>{fmt(calc.totalAddOns)}</span>
            </div>
          </div>
          <div className="rpt-note">
            Metal margin of {fmt(inputs.dealMargin)} only applies to new car sales ({inputs.newSalesPct}% of deals). Conversions, refinances, and existing vehicle NL applications do not generate metal margin.
          </div>
        </div>

        {/* PAGE BREAK before monthly detail */}
        <div className="page-break" />

        {/* === MONTH-BY-MONTH: First 12 Months === */}
        <div className="rpt-section">
          <h2 className="rpt-section-title" style={{ color: TEAL }}>Your First 12 Months — Monthly Breakdown</h2>
          <table className="rpt-table">
            <thead>
              <tr>
                <th>Month</th>
                <th className="right">Deals</th>
                <th className="right">Your Revenue</th>
                <th className="right">Cumulative</th>
                <th className="right">Hot Leads</th>
              </tr>
            </thead>
            <tbody>
              {first12.map((d, i) => (
                <tr key={i} style={i === 11 ? { background: "#F0FDF4" } : {}}>
                  <td style={i === 11 ? { fontWeight: 700 } : {}}>Month {d.month}</td>
                  <td className="right">{fmtN(d.totalDeals)}</td>
                  <td className="right teal" style={{ fontWeight: i === 11 ? 700 : 600 }}>{fmt(d.dealerRevenue)}</td>
                  <td className="right" style={{ color: "#6B7280" }}>{fmtK(d.cumDealerRevenue)}</td>
                  <td className="right gold">{fmtN(d.hotLeads)}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>Year 1 Total</td>
                <td className="right">{fmtN(first12.reduce((a, b) => a + b.totalDeals, 0))}</td>
                <td className="right" style={{ color: TEAL }}>{fmtK(first12.reduce((a, b) => a + b.dealerRevenue, 0))}</td>
                <td className="right">{fmtK(calc.data[11]?.cumDealerRevenue)}</td>
                <td className="right" style={{ color: GOLD }}>{fmtN(first12.reduce((a, b) => a + b.hotLeads, 0))}</td>
              </tr>
            </tbody>
          </table>
          <div className="rpt-note">
            New employer employees enter the pipeline immediately but take 6 months to convert to their first organic deal. You'll see organic revenue begin building from around Month 7.
          </div>
        </div>

        {/* === Monthly Revenue at Each Year-End === */}
        <div className="rpt-section">
          <h2 className="rpt-section-title" style={{ color: PURPLE }}>Long Term Modeling — Monthly Earnings at Each Year-End</h2>
          <table className="rpt-table">
            <thead>
              <tr>
                <th>Milestone</th>
                <th className="right">Monthly Deals</th>
                <th className="right">Monthly Revenue</th>
                <th className="right">Cumulative Earned</th>
                <th className="right">Hot Leads / Mo</th>
              </tr>
            </thead>
            <tbody>
              {yearEndMonths.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>End of Year {i + 1} <span style={{ color: "#9CA3AF", fontWeight: 400 }}>(Mo {d.month})</span></td>
                  <td className="right">{fmtN(d.totalDeals)}</td>
                  <td className="right teal" style={{ fontWeight: 700, fontSize: 13 }}>{fmt(d.dealerRevenue)}</td>
                  <td className="right" style={{ color: "#6B7280" }}>{fmtK(d.cumDealerRevenue)}</td>
                  <td className="right gold">{fmtN(d.hotLeads)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="rpt-note">
            These are your actual monthly earnings at the end of each year — not annual totals. This shows what's hitting your account each month as the book matures.
          </div>
        </div>

        {/* PAGE BREAK before all charts */}
        <div className="page-break" />

        {/* Monthly Revenue Chart */}
        <div className="rpt-section">
          <h2 className="rpt-section-title" style={{ color: TEAL }}>Long Term Revenue Projection — 60 Months</h2>
          <div className="rpt-chart-wrapper">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={calc.data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rptGradDealer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={TEAL} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={TEAL} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fill: "#9CA3AF", fontSize: 9, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : v === 1 ? "M1" : ""} />
                <YAxis tick={{ fill: "#9CA3AF", fontSize: 9, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => fmtK(v)} />
                <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => `Month ${l}`} />
                <ReferenceLine x={32} stroke={PINK} strokeDasharray="4 4" label={{ value: "Leases mature", fill: PINK, fontSize: 9, fontFamily: "'DM Mono', monospace" }} />
                <Area type="monotone" dataKey="dealerRevenue" name="Your Monthly Revenue" stroke={TEAL} fill="url(#rptGradDealer)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deal Volume Chart */}
        <div className="rpt-section">
          <h2 className="rpt-section-title" style={{ color: INDIGO }}>Where Your Deals Come From Each Month</h2>
          <div className="rpt-chart-wrapper">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={calc.data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fill: "#9CA3AF", fontSize: 9, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                <YAxis tick={{ fill: "#9CA3AF", fontSize: 9, fontFamily: "'DM Mono', monospace" }} />
                <Tooltip formatter={(v) => fmtN(v)} labelFormatter={(l) => `Month ${l}`} />
                <ReferenceLine x={32} stroke={PINK} strokeDasharray="4 4" />
                <Area type="monotone" dataKey="newDeals" name="Your Intros" stackId="1" stroke={PURPLE} fill={PURPLE} fillOpacity={0.3} strokeWidth={1.5} />
                <Area type="monotone" dataKey="additionalDeals" name="Organic (Employees)" stackId="1" stroke={TEAL} fill={TEAL} fillOpacity={0.3} strokeWidth={1.5} />
                <Area type="monotone" dataKey="repeatDeals" name="Repeat / Refinance" stackId="1" stroke={PINK} fill={PINK} fillOpacity={0.3} strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="rpt-note">
            Your {inputs.monthlyIntros} intro deals/month stay constant. Organic deals grow as employees at signed employers convert (after 6-month lag). Repeat/refinance deals begin from month 32 as original leases mature.
          </div>
        </div>

        {/* Hot Leads Chart */}
        <div className="rpt-section">
          <h2 className="rpt-section-title" style={{ color: GOLD }}>Hot New Car Leads — Monthly Pipeline</h2>
          <div className="rpt-chart-wrapper">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={calc.data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rptGradLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fill: "#9CA3AF", fontSize: 9, fontFamily: "'DM Mono', monospace" }} tickFormatter={v => v % 12 === 0 ? `Y${v/12}` : ""} />
                <YAxis tick={{ fill: "#9CA3AF", fontSize: 9, fontFamily: "'DM Mono', monospace" }} />
                <Tooltip formatter={(v) => fmtN(v)} labelFormatter={(l) => `Month ${l}`} />
                <Area type="monotone" dataKey="hotLeads" name="Hot Leads/Month" stroke={GOLD} fill="url(#rptGradLeads)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="rpt-note">
            Hot leads begin from month 32 as leases mature — {fmtN(calc.hotLeadsMonth60)} warm leads/month by Year 5. These are customers returning to you for their next new car.
          </div>
        </div>

        <div className="page-break" />

        {/* Annual Summary — supporting reference */}
        <div className="rpt-section">
          <h2 className="rpt-section-title" style={{ color: PURPLE }}>Long Term Annual Summary</h2>
          <table className="rpt-table">
            <thead>
              <tr>
                <th>Year</th>
                <th className="right">Total Deals</th>
                <th className="right">Dealer Revenue</th>
                <th className="right">Avg Monthly</th>
                <th className="right">Hot Leads</th>
              </tr>
            </thead>
            <tbody>
              {calc.years.map(y => (
                <tr key={y.year}>
                  <td>Year {y.year}</td>
                  <td className="right">{fmtN(y.totalDeals)}</td>
                  <td className="right teal" style={{ fontWeight: 600 }}>{fmtK(y.dealerRevenue)}</td>
                  <td className="right" style={{ color: TEAL, fontWeight: 700 }}>{fmt(Math.round(y.dealerRevenue / 12))}</td>
                  <td className="right gold">{fmtN(y.hotLeads)}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>5-Year Total</td>
                <td className="right">{fmtN(calc.years.reduce((a, b) => a + b.totalDeals, 0))}</td>
                <td className="right" style={{ color: TEAL }}>{fmtK(calc.totalDealer5yr)}</td>
                <td className="right" style={{ color: TEAL }}>{fmt(Math.round(calc.totalDealer5yr / 60))}</td>
                <td className="right" style={{ color: GOLD }}>{fmtN(calc.totalHotLeads5yr)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Growth Assumptions */}
        <div className="rpt-section">
          <h2 className="rpt-section-title" style={{ color: "#6B7280" }}>Growth Model Assumptions</h2>
          <div className="rpt-kv-grid">
            <div className="rpt-kv">
              <span className="rpt-kv-label">Deals You Introduce / Month</span>
              <span className="rpt-kv-value">{inputs.monthlyIntros}</span>
            </div>
            <div className="rpt-kv">
              <span className="rpt-kv-label">Avg Employees / Employer</span>
              <span className="rpt-kv-value">{inputs.avgEmployees}</span>
            </div>
            <div className="rpt-kv">
              <span className="rpt-kv-label">Organic Conversion Rate</span>
              <span className="rpt-kv-value">{inputs.additionalNLRate}% / month</span>
            </div>
            <div className="rpt-kv">
              <span className="rpt-kv-label">Repeat Rate (from Mo 32)</span>
              <span className="rpt-kv-value">{inputs.repeatRate}% annualised</span>
            </div>
            <div className="rpt-kv">
              <span className="rpt-kv-label">Hot Lead Return Rate</span>
              <span className="rpt-kv-value">{inputs.hotLeadRate}% of maturing leases</span>
            </div>
            <div className="rpt-kv">
              <span className="rpt-kv-label">Book Churn (baked in)</span>
              <span className="rpt-kv-value" style={{ color: "#EF4444" }}>−10% / year</span>
            </div>
          </div>
          <div className="rpt-note">
            Dealer deal volume is constant. New employer acquisition decays: Year 1 = 70% of deals from new employers, Year 2 = 40%, Year 3 = 30%, Year 4–5 = 20%. 6-month lag from new employer sign-on to first organic conversions. Lease term split: 15% short-term (1–2yr, maturing ~18 months) and 85% standard (maturing ~32 months). Book churn at 10%/yr applied monthly.
          </div>
        </div>

        {/* Trail Income Tiers Reference */}
        <div className="rpt-section">
          <h2 className="rpt-section-title" style={{ color: PURPLE }}>Trail Income Tier Structure</h2>
          <table className="rpt-table">
            <thead>
              <tr>
                <th>Organic Volume</th>
                <th className="right">Trail Rate</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>≤ 5 deals / month</td>
                <td className="right">10%</td>
                <td style={{ color: "#6B7280" }}>Of MX's 3% NAF finance margin</td>
              </tr>
              <tr>
                <td>6 – 10 deals / month</td>
                <td className="right">12.5%</td>
                <td style={{ color: "#6B7280" }}>Of MX's 3% NAF finance margin</td>
              </tr>
              <tr>
                <td>11+ deals / month</td>
                <td className="right" style={{ color: TEAL, fontWeight: 600 }}>15%</td>
                <td style={{ color: "#6B7280" }}>Of MX's 3% NAF finance margin</td>
              </tr>
            </tbody>
          </table>
          <div className="rpt-note">
            Trail income applies to organic employee conversions and repeat/refinance deals only. Dealer-introduced deals earn the full referral share (30%) or full brokerage, plus all add-ons.
          </div>
        </div>

        {/* Footer */}
        <div className="rpt-footer">
          <div className="rpt-footer-left">
            <div>MX Dealer Advantage — Earnings Estimator</div>
            <div>Generated {today}</div>
            <div style={{ marginTop: 8, fontSize: 9, lineHeight: 1.8 }}>
              This model is for illustrative purposes only. Actual results may vary based on<br />
              market conditions, dealer performance, and customer behaviour.
            </div>
          </div>
          <div className="rpt-footer-right">
            <div className="rpt-confidential">Confidential</div>
          </div>
        </div>
      </div>
    </div>
  );
}

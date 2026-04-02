"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { fmt, numberToWords } from "@/lib/utils";
import { IInvoice, Deduction } from "@/lib/models/Invoice";

const DEFAULT_DEDUCTIONS: Deduction[] = [
  { desc: "LABOUR", bags: "", rate: "", amt: 0 },
  { desc: "DAMAGE BAG", bags: "", rate: "", amt: 0 },
  { desc: "GADDI CHARGE", bags: "", rate: "", amt: 0 },
  { desc: "BADSHAH BROKER", bags: "", rate: "", amt: 0 },
  { desc: "BANK EXP", bags: "", rate: "", amt: 0 },
  { desc: "CD 1%", bags: "", rate: "", amt: 0 },
];

interface CreateInvoiceFormProps {
  initialData: Partial<IInvoice>;
  editId?: string | null;
}

export default function CreateInvoiceForm({
  initialData,
  editId,
}: CreateInvoiceFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<IInvoice>>(initialData);

  // ─── Stand & Moisture deduction inputs ───────────────────────
  const [standPct, setStandPct] = useState(
    (initialData as any).standPercent
      ? String((initialData as any).standPercent)
      : "",
  );
  const [standKg, setStandKg] = useState(
    (initialData as any).standDedQty
      ? String((initialData as any).standDedQty)
      : "",
  );
  const [moisPct, setMoisPct] = useState(
    (initialData as any).moisPercent
      ? String((initialData as any).moisPercent)
      : "",
  );
  const [moisKg, setMoisKg] = useState(
    (initialData as any).moisDedQty
      ? String((initialData as any).moisDedQty)
      : "",
  );

  // ─── Derived numbers ────────────────────────────────────────
  const nw =
    parseFloat(String(formData.netWeight)) ||
    parseFloat(String(formData.quantity)) ||
    0;
  const rate = parseFloat(String(formData.rate)) || 0;

  const sKg = parseFloat(standKg || "0");
  const mKg = parseFloat(moisKg || "0");
  const finalNetQty = Math.max(0, nw - sKg - mKg);

  const gross = nw * rate; // before any deductions
  const standDedAmt = sKg * rate; // ₹ value of stand deduction
  const moisDedAmt = mKg * rate; // ₹ value of mois deduction
  const otherDeduct =
    formData.deductions?.reduce((s, d) => s + (d.amt || 0), 0) || 0;
  const netTotal = gross - standDedAmt - moisDedAmt - otherDeduct;

  // ─── Stand handlers (% ↔ kg linked) ─────────────────────────
  const onStandPct = (v: string) => {
    setStandPct(v);
    const p = parseFloat(v);
    setStandKg(
      !isNaN(p) && p > 0 && nw > 0 ? String(+((nw * p) / 100).toFixed(2)) : "",
    );
  };

  const onStandKg = (v: string) => {
    setStandKg(v);
    const q = parseFloat(v);
    setStandPct(
      !isNaN(q) && q > 0 && nw > 0 ? String(+((q / nw) * 100).toFixed(2)) : "",
    );
  };

  // ─── Moisture handlers (% ↔ kg linked) ──────────────────────
  const onMoisPct = (v: string) => {
    setMoisPct(v);
    const p = parseFloat(v);
    setMoisKg(
      !isNaN(p) && p > 0 && nw > 0 ? String(+((nw * p) / 100).toFixed(2)) : "",
    );
  };

  const onMoisKg = (v: string) => {
    setMoisKg(v);
    const q = parseFloat(v);
    setMoisPct(
      !isNaN(q) && q > 0 && nw > 0 ? String(+((q / nw) * 100).toFixed(2)) : "",
    );
  };

  // ─── Recalc kg when net weight changes (% stays fixed) ──────
  useEffect(() => {
    const sp = parseFloat(standPct);
    if (!isNaN(sp) && sp > 0 && nw > 0)
      setStandKg(String(+((nw * sp) / 100).toFixed(2)));

    const mp = parseFloat(moisPct);
    if (!isNaN(mp) && mp > 0 && nw > 0)
      setMoisKg(String(+((nw * mp) / 100).toFixed(2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nw]);

  // ─── Generic input helper ───────────────────────────────────
  const handleInputChange = (field: keyof IInvoice, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  // ─── Deductions table helpers ───────────────────────────────
  const handleDeductionChange = (
    i: number,
    field: keyof Deduction,
    value: any,
  ) => {
    const d = [...(formData.deductions || [])];
    const row = { ...d[i], [field]: value };
    if (field === "bags" || field === "rate")
      row.amt =
        (parseFloat(row.bags as string) || 0) *
        (parseFloat(row.rate as string) || 0);
    d[i] = row;
    setFormData((prev) => ({ ...prev, deductions: d }));
  };

  const addDeduction = () =>
    setFormData((prev) => ({
      ...prev,
      deductions: [
        ...(prev.deductions || []),
        { desc: "", bags: "", rate: "", amt: 0 },
      ],
    }));

  const removeDeduction = (i: number) =>
    setFormData((prev) => ({
      ...prev,
      deductions: prev.deductions?.filter((_, idx) => idx !== i),
    }));

  // ─── Save (all computed values bundled into payload) ────────
  const saveInvoice = async () => {
    if (!formData.invNo || !formData.supplierName) {
      alert("Please fill Invoice No. and Supplier Name.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        // persist the % and kg inputs
        standPercent: parseFloat(standPct) || 0,
        standDedQty: sKg,
        standDed: standDedAmt, // ₹ amount
        moisPercent: parseFloat(moisPct) || 0,
        moisDedQty: mKg,
        moisDed: moisDedAmt, // ₹ amount
        finalNetQty,
        gross,
        otherDeduct,
        netTotal,
      };
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/invoices/${editId}` : "/api/invoices";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) router.push("/view");
      else throw new Error("Failed");
    } catch {
      alert("Error saving invoice.");
    } finally {
      setSaving(false);
    }
  };

  // ══════════════════════════ RENDER ═══════════════════════════
  return (
    <>
      <Header />
      <div className="container">
        {/* HEADER */}
        <div className="section-header">
          <div className="section-title">
            <span>Invoice Management</span>
            <strong>
              {editId ? "Edit Invoice Detail" : "New Invoice Entry"}
            </strong>
          </div>
          {editId && (
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.75rem",
                background: "#fef3c7",
                color: "#92400e",
                padding: "4px 12px",
                borderRadius: "4px",
                border: "1px solid #fde68a",
              }}
            >
              EDITING: {formData.invNo}
            </div>
          )}
        </div>

        {/* ─── COMPANY & INVOICE DETAILS ─── */}
        <div className="form-card">
          <div className="card-label">Company &amp; Invoice Details</div>
          <div className="grid-4">
            <div className="field col-span-2">
              <label>Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) =>
                  handleInputChange("companyName", e.target.value)
                }
              />
            </div>
            <div className="field">
              <label>Invoice No.</label>
              <input
                type="text"
                value={formData.invNo}
                onChange={(e) => handleInputChange("invNo", e.target.value)}
              />
            </div>
            <div className="field">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
              />
            </div>
            <div className="field col-span-2">
              <label>Company Address</label>
              <input
                type="text"
                value={formData.companyAddr}
                onChange={(e) =>
                  handleInputChange("companyAddr", e.target.value)
                }
              />
            </div>
            <div className="field">
              <label>Supplier Inv No. &amp; Date</label>
              <input
                type="text"
                value={formData.supplierInvRef}
                onChange={(e) =>
                  handleInputChange("supplierInvRef", e.target.value)
                }
              />
            </div>
            <div className="field">
              <label>Other Reference</label>
              <input
                type="text"
                value={formData.otherRef}
                onChange={(e) => handleInputChange("otherRef", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ─── SUPPLIER ─── */}
        <div className="form-card">
          <div className="card-label">Supplier (Bill From)</div>
          <div className="grid-4">
            <div className="field col-span-2">
              <label>Supplier Name</label>
              <input
                type="text"
                value={formData.supplierName}
                onChange={(e) =>
                  handleInputChange("supplierName", e.target.value)
                }
              />
            </div>
            <div className="field">
              <label>Supplier Address</label>
              <input
                type="text"
                value={formData.supplierAddr}
                onChange={(e) =>
                  handleInputChange("supplierAddr", e.target.value)
                }
              />
            </div>
            <div className="field">
              <label>Supplier State / Code</label>
              <input
                type="text"
                value={formData.supplierState}
                onChange={(e) =>
                  handleInputChange("supplierState", e.target.value)
                }
              />
            </div>
            <div className="field">
              <label>Troll No.</label>
              <input
                type="text"
                value={formData.trollNo}
                onChange={(e) => handleInputChange("trollNo", e.target.value)}
              />
            </div>
            <div className="field">
              <label>Kata Slip No.</label>
              <input
                type="text"
                value={formData.kataSlipNo}
                onChange={(e) =>
                  handleInputChange("kataSlipNo", e.target.value)
                }
              />
            </div>
            <div className="field">
              <label>Bank Name</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => handleInputChange("bankName", e.target.value)}
              />
            </div>
            <div className="field">
              <label>A/C No.</label>
              <input
                type="text"
                value={formData.bankAc}
                onChange={(e) => handleInputChange("bankAc", e.target.value)}
              />
            </div>
            <div className="field">
              <label>IFSC Code</label>
              <input
                type="text"
                value={formData.bankIfsc}
                onChange={(e) => handleInputChange("bankIfsc", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ─── COMMODITY & QUANTITY (FIXED) ─── */}
        <div className="form-card">
          <div className="card-label">Commodity &amp; Quantity</div>
          <div className="grid-4">
            <div className="field">
              <label>Commodity</label>
              <input
                type="text"
                value={formData.commodity}
                onChange={(e) => handleInputChange("commodity", e.target.value)}
              />
            </div>
            <div className="field">
              <label>No. of Bags</label>
              <input
                type="number"
                value={formData.totalBags}
                onChange={(e) => handleInputChange("totalBags", e.target.value)}
              />
            </div>
            <div className="field">
              <label>Quantity (kg)</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => handleInputChange("quantity", e.target.value)}
                step="0.01"
              />
            </div>
            <div className="field">
              <label>Rate (₹ / kg)</label>
              <input
                type="number"
                value={formData.rate}
                onChange={(e) => handleInputChange("rate", e.target.value)}
                step="0.01"
              />
            </div>
            <div className="field">
              <label>Net Weight (kg)</label>
              <input
                type="number"
                value={formData.netWeight}
                onChange={(e) => handleInputChange("netWeight", e.target.value)}
                step="0.01"
              />
            </div>

            {/* ── Visual separator for deduction inputs ── */}
            <div
              style={{
                gridColumn: "1 / -1",
                borderTop: "1px dashed var(--border, #e5e7eb)",
                margin: "0.25rem 0",
                paddingTop: "0.75rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--muted, #6b7280)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Qty Deductions — enter either % or kg (other auto-calculates)
              </span>
            </div>

            {/* Stand Deduction: % ↔ kg */}
            <div className="field">
              <label>Stand Ded. %</label>
              <input
                type="number"
                value={standPct}
                onChange={(e) => onStandPct(e.target.value)}
                step="0.01"
                placeholder="Enter %"
              />
            </div>
            <div className="field">
              <label>Stand Ded. (kg)</label>
              <input
                type="number"
                value={standKg}
                onChange={(e) => onStandKg(e.target.value)}
                step="0.01"
                placeholder="Enter kg"
              />
            </div>

            {/* Moisture Deduction: % ↔ kg */}
            <div className="field">
              <label>Mois. Ded. %</label>
              <input
                type="number"
                value={moisPct}
                onChange={(e) => onMoisPct(e.target.value)}
                step="0.01"
                placeholder="Enter %"
              />
            </div>
            <div className="field">
              <label>Mois. Ded. (kg)</label>
              <input
                type="number"
                value={moisKg}
                onChange={(e) => onMoisKg(e.target.value)}
                step="0.01"
                placeholder="Enter kg"
              />
            </div>

            {/* Final Net Qty — auto-computed, read-only */}
            <div className="field">
              <label>Final Net Qty (kg)</label>
              <div className="computed">{finalNetQty.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* ─── DEDUCTIONS TABLE ─── */}
        <div className="form-card">
          <div className="card-label">Deductions (Less)</div>
          <table className="deduct-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ width: "120px" }}>Bags / Units</th>
                <th style={{ width: "120px" }}>Rate</th>
                <th style={{ width: "130px", textAlign: "right" }}>
                  Amount (₹)
                </th>
                <th style={{ width: "40px" }}></th>
              </tr>
            </thead>
            <tbody>
              {formData.deductions?.map((d, i) => (
                <tr key={i}>
                  <td>
                    <input
                      type="text"
                      value={d.desc}
                      onChange={(e) =>
                        handleDeductionChange(i, "desc", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={d.bags}
                      onChange={(e) =>
                        handleDeductionChange(i, "bags", e.target.value)
                      }
                      step="0.01"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={d.rate}
                      onChange={(e) =>
                        handleDeductionChange(i, "rate", e.target.value)
                      }
                      step="0.01"
                    />
                  </td>
                  <td className="amount-cell">(-){fmt(d.amt)}</td>
                  <td>
                    <button
                      className="remove-btn"
                      onClick={() => removeDeduction(i)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="add-row-btn" onClick={addDeduction}>
            + Add Deduction Line
          </button>
        </div>

        {/* ─── SUMMARY (NOW SHOWS ₹ AMOUNTS, NOT %) ─── */}
        <div className="grid-2" style={{ marginBottom: "2rem" }}>
          <div className="summary-box">
            <div className="summary-row">
              <span className="label">Gross Amount</span>
              <span className="value">₹{fmt(gross)}</span>
            </div>
            <div className="summary-row">
              <span className="label">
                Stand Deduction{standPct ? ` (${standPct}%)` : ""}
              </span>
              <span className="value">₹{fmt(standDedAmt)}</span>
            </div>
            <div className="summary-row">
              <span className="label">
                Mois. Deduction{moisPct ? ` (${moisPct}%)` : ""}
              </span>
              <span className="value">₹{fmt(moisDedAmt)}</span>
            </div>
            <div className="summary-row">
              <span className="label">Other Deductions</span>
              <span className="value">₹{fmt(otherDeduct)}</span>
            </div>
            <div className="summary-net">
              <span className="label">Net Payable</span>
              <span className="value">₹{fmt(netTotal)}</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div className="form-card" style={{ flex: 1, margin: 0 }}>
              <div className="card-label">Net Amount (Words)</div>
              <div
                style={{
                  fontSize: "0.88rem",
                  color: "var(--muted)",
                  lineHeight: "1.5",
                }}
              >
                {numberToWords(netTotal)}
              </div>
            </div>
            <div className="btn-row">
              <button
                className="btn btn-primary"
                onClick={saveInvoice}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editId
                    ? "💾 Update Invoice"
                    : "💾 Save Invoice"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

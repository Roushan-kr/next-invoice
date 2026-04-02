"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { fmt, numberToWords } from "@/lib/utils";
import { IInvoice, Deduction } from "@/lib/models/Invoice";

const DEFAULT_DEDUCTIONS: Deduction[] = [
  { desc: 'LABOUR', bags: '', rate: '', amt: 0 },
  { desc: 'DAMAGE BAG', bags: '', rate: '', amt: 0 },
  { desc: 'GADDI CHARGE', bags: '', rate: '', amt: 0 },
  { desc: 'BADSHAH BROKER', bags: '', rate: '', amt: 0 },
  { desc: 'BANK EXP', bags: '', rate: '', amt: 0 },
  { desc: 'CD 1%', bags: '', rate: '', amt: 0 },
];

interface CreateInvoiceFormProps {
  initialData: Partial<IInvoice>;
  editId?: string | null;
}

export default function CreateInvoiceForm({ initialData, editId }: CreateInvoiceFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  // Controlled Form State
  const [formData, setFormData] = useState<Partial<IInvoice>>(initialData);

  // Calculation Logic
  const calculateTotals = useCallback(() => {
    const qty = parseFloat(String(formData.quantity || 0));
    const rate = parseFloat(String(formData.rate || 0));
    const netWeight = parseFloat(String(formData.netWeight || qty));
    const standDed = parseFloat(String(formData.standDed || 0));
    const moisDed = parseFloat(String(formData.moisDed || 0));

    const gross = netWeight * rate;
    const otherDeduct = formData.deductions?.reduce((sum, d) => sum + (d.amt || 0), 0) || 0;
    const netTotal = gross - standDed - moisDed - otherDeduct;

    setFormData(prev => ({
      ...prev,
      gross,
      otherDeduct,
      netTotal,
    }));
  }, [formData.quantity, formData.rate, formData.netWeight, formData.standDed, formData.moisDed, formData.deductions]);

  // Re-calculate when relevant fields change
  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  const handleInputChange = (field: keyof IInvoice, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDeductionChange = (index: number, field: keyof Deduction, value: any) => {
    const newDeds = [...(formData.deductions || [])];
    const item = { ...newDeds[index], [field]: value };
    
    if (field === 'bags' || field === 'rate') {
      item.amt = (parseFloat(item.bags as string) || 0) * (parseFloat(item.rate as string) || 0);
    }
    
    newDeds[index] = item;
    setFormData(prev => ({ ...prev, deductions: newDeds }));
  };

  const addDeduction = () => {
    setFormData(prev => ({
      ...prev,
      deductions: [...(prev.deductions || []), { desc: '', bags: '', rate: '', amt: 0 }]
    }));
  };

  const removeDeduction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      deductions: prev.deductions?.filter((_, i) => i !== index)
    }));
  };

  const saveInvoice = async () => {
    if (!formData.invNo || !formData.supplierName) {
      alert("Please fill Invoice No. and Supplier Name.");
      return;
    }

    setSaving(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/invoices/${editId}` : "/api/invoices";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push("/view");
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      alert("Error saving invoice.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header />
      <div className="container">
        <div className="section-header">
          <div className="section-title">
            <span>Invoice Management</span>
            <strong>{editId ? "Edit Invoice Detail" : "New Invoice Entry"}</strong>
          </div>
          {editId && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '4px', border: '1px solid #fde68a' }}>
              EDITING: {formData.invNo}
            </div>
          )}
        </div>

        {/* DETAILS SECTION */}
        <div className="form-card">
          <div className="card-label">Company & Invoice Details</div>
          <div className="grid-4">
            <div className="field col-span-2">
              <label>Company Name</label>
              <input type="text" value={formData.companyName} onChange={e => handleInputChange('companyName', e.target.value)} />
            </div>
            <div className="field">
              <label>Invoice No.</label>
              <input type="text" value={formData.invNo} onChange={e => handleInputChange('invNo', e.target.value)} />
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={formData.date} onChange={e => handleInputChange('date', e.target.value)} />
            </div>
            <div className="field col-span-2">
              <label>Company Address</label>
              <input type="text" value={formData.companyAddr} onChange={e => handleInputChange('companyAddr', e.target.value)} />
            </div>
            <div className="field">
              <label>Supplier Inv No. & Date</label>
              <input type="text" value={formData.supplierInvRef} onChange={e => handleInputChange('supplierInvRef', e.target.value)} />
            </div>
            <div className="field">
              <label>Other Reference</label>
              <input type="text" value={formData.otherRef} onChange={e => handleInputChange('otherRef', e.target.value)} />
            </div>
          </div>
        </div>

        {/* SUPPLIER SECTION */}
        <div className="form-card">
          <div className="card-label">Supplier (Bill From)</div>
          <div className="grid-4">
            <div className="field col-span-2">
              <label>Supplier Name</label>
              <input type="text" value={formData.supplierName} onChange={e => handleInputChange('supplierName', e.target.value)} />
            </div>
            <div className="field">
              <label>Supplier Address</label>
              <input type="text" value={formData.supplierAddr} onChange={e => handleInputChange('supplierAddr', e.target.value)} />
            </div>
            <div className="field">
              <label>Supplier State / Code</label>
              <input type="text" value={formData.supplierState} onChange={e => handleInputChange('supplierState', e.target.value)} />
            </div>
            <div className="field">
              <label>Troll No.</label>
              <input type="text" value={formData.trollNo} onChange={e => handleInputChange('trollNo', e.target.value)} />
            </div>
            <div className="field">
              <label>Kata Slip No.</label>
              <input type="text" value={formData.kataSlipNo} onChange={e => handleInputChange('kataSlipNo', e.target.value)} />
            </div>
            <div className="field">
              <label>Bank Name</label>
              <input type="text" value={formData.bankName} onChange={e => handleInputChange('bankName', e.target.value)} />
            </div>
            <div className="field">
              <label>A/C No.</label>
              <input type="text" value={formData.bankAc} onChange={e => handleInputChange('bankAc', e.target.value)} />
            </div>
            <div className="field">
              <label>IFSC Code</label>
              <input type="text" value={formData.bankIfsc} onChange={e => handleInputChange('bankIfsc', e.target.value)} />
            </div>
          </div>
        </div>

        {/* COMMODITY SECTION */}
        <div className="form-card">
          <div className="card-label">Commodity & Quantity</div>
          <div className="grid-4">
            <div className="field">
              <label>Commodity</label>
              <input type="text" value={formData.commodity} onChange={e => handleInputChange('commodity', e.target.value)} />
            </div>
            <div className="field">
              <label>No. of Bags</label>
              <input type="number" value={formData.totalBags} onChange={e => handleInputChange('totalBags', e.target.value)} />
            </div>
            <div className="field">
              <label>Quantity (kg)</label>
              <input type="number" value={formData.quantity} onChange={e => handleInputChange('quantity', e.target.value)} step="0.01" />
            </div>
            <div className="field">
              <label>Rate (₹ / kg)</label>
              <input type="number" value={formData.rate} onChange={e => handleInputChange('rate', e.target.value)} step="0.01" />
            </div>
            <div className="field">
              <label>Net Weight</label>
              <input type="number" value={formData.netWeight} onChange={e => handleInputChange('netWeight', e.target.value)} step="0.01" />
            </div>
            <div className="field">
              <label>Stand % Ded.</label>
              <input type="number" value={formData.standDed} onChange={e => handleInputChange('standDed', e.target.value)} step="0.01" />
            </div>
            <div className="field">
              <label>Mois. % Ded.</label>
              <input type="number" value={formData.moisDed} onChange={e => handleInputChange('moisDed', e.target.value)} step="0.01" />
            </div>
            <div className="field">
              <label>Final Net Qty</label>
              <div className="computed">{formData.netWeight}</div>
            </div>
          </div>
        </div>

        {/* DEDUCTIONS TABLE */}
        <div className="form-card">
          <div className="card-label">Deductions (Less)</div>
          <table className="deduct-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ width: '120px' }}>Bags / Units</th>
                <th style={{ width: '120px' }}>Rate</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Amount (₹)</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {formData.deductions?.map((d, i) => (
                <tr key={i}>
                  <td><input type="text" value={d.desc} onChange={e => handleDeductionChange(i, 'desc', e.target.value)} /></td>
                  <td><input type="number" value={d.bags} onChange={e => handleDeductionChange(i, 'bags', e.target.value)} step="0.01" /></td>
                  <td><input type="number" value={d.rate} onChange={e => handleDeductionChange(i, 'rate', e.target.value)} step="0.01" /></td>
                  <td className="amount-cell">(-){fmt(d.amt)}</td>
                  <td><button className="remove-btn" onClick={() => removeDeduction(i)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="add-row-btn" onClick={addDeduction}>+ Add Deduction Line</button>
        </div>

        {/* SUMMARY SECTION */}
        <div className="grid-2" style={{ marginBottom: '2rem' }}>
          <div className="summary-box">
            <div className="summary-row">
              <span className="label">Gross Amount</span>
              <span className="value">₹{fmt(formData.gross || 0)}</span>
            </div>
            <div className="summary-row">
              <span className="label">Stand Deduction</span>
              <span className="value">₹{fmt(formData.standDed || 0)}</span>
            </div>
            <div className="summary-row">
              <span className="label">Mois. Deduction</span>
              <span className="value">₹{fmt(formData.moisDed || 0)}</span>
            </div>
            <div className="summary-row">
              <span className="label">Other Deductions</span>
              <span className="value">₹{fmt(formData.otherDeduct || 0)}</span>
            </div>
            <div className="summary-net">
              <span className="label">Net Payable</span>
              <span className="value">₹{fmt(formData.netTotal || 0)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-card" style={{ flex: 1, margin: 0 }}>
              <div className="card-label">Net Amount (Words)</div>
              <div style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: '1.5' }}>
                {numberToWords(formData.netTotal || 0)}
              </div>
            </div>
            <div className="btn-row">
              <button 
                className="btn btn-primary" 
                onClick={saveInvoice}
                disabled={saving}
              >
                {saving ? "Saving..." : editId ? "💾 Update Invoice" : "💾 Save Invoice"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

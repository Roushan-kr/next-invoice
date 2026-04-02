"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fmt, formatDate } from "@/lib/utils";
import { IInvoice } from "@/lib/models/Invoice";

interface RecordsDisplayProps {
  initialInvoices: IInvoice[];
}

export default function RecordsDisplay({ initialInvoices }: RecordsDisplayProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<IInvoice[]>(initialInvoices);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<IInvoice | null>(null);

  // Filtered Data
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const d = new Date(inv.date);
      const from = filterFrom ? new Date(filterFrom) : new Date('1900-01-01');
      const to = filterTo ? new Date(filterTo) : new Date('2100-01-01');
      const matchesSupplier = (inv.supplierName || '').toLowerCase().includes(filterSupplier.toLowerCase());
      return d >= from && d <= to && matchesSupplier;
    });
  }, [invoices, filterFrom, filterTo, filterSupplier]);

  // Stats
  const stats = useMemo(() => {
    const qty = filteredInvoices.reduce((s, i) => s + (Number(i.quantity || 0)), 0);
    const gross = filteredInvoices.reduce((s, i) => s + (i.gross || 0), 0);
    const net = filteredInvoices.reduce((s, i) => s + (i.netTotal || 0), 0);
    return { count: filteredInvoices.length, qty, gross, net };
  }, [filteredInvoices]);

  const deleteInvoice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInvoices(prev => prev.filter(inv => inv.id !== id));
      }
    } catch (err) {
      alert("Error deleting invoice");
    }
  };

  return (
    <div className="container">
      <div className="section-header">
        <div className="section-title">
          <span>Invoice Management</span>
          <strong>Saved Records</strong>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Invoices</div>
          <div className="stat-value">{stats.count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Qty (kg)</div>
          <div className="stat-value">{stats.qty.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Gross</div>
          <div className="stat-value green">₹{fmt(stats.gross)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net Payable</div>
          <div className="stat-value green">₹{fmt(stats.net)}</div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="filter-bar">
        <div className="field">
          <label>From Date</label>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
        </div>
        <div className="field">
          <label>To Date</label>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
        </div>
        <div className="field">
          <label>Supplier</label>
          <input 
            type="text" 
            placeholder="Search supplier..." 
            value={filterSupplier} 
            onChange={e => setFilterSupplier(e.target.value)} 
          />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => { setFilterFrom(""); setFilterTo(""); setFilterSupplier(""); }}>Reset</button>
      </div>

      {/* TABLE */}
      <div className="records-table-wrap">
        <table className="records-table">
          <thead>
            <tr>
              <th>Inv No.</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Commodity</th>
              <th>Bags</th>
              <th>Qty (kg)</th>
              <th>Rate</th>
              <th>Net Payable</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length > 0 ? filteredInvoices.map(inv => (
              <tr key={inv.id}>
                <td className="mono" style={{ fontWeight: 700 }}>#{inv.invNo}</td>
                <td>{formatDate(inv.date)}</td>
                <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.supplierName}</td>
                <td><span className="badge">{inv.commodity}</span></td>
                <td className="mono">{inv.totalBags}</td>
                <td className="mono">{(Number(inv.quantity || 0)).toLocaleString('en-IN')}</td>
                <td className="mono">₹{(Number(inv.rate || 0)).toFixed(2)}</td>
                <td className="net-col">₹{fmt(inv.netTotal)}</td>
                <td>
                  <div className="actions-col">
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedInvoice(inv)}>View</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/create?edit=${inv.id}`)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteInvoice(inv.id)}>Del</button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="empty-state">
                    <div className="icon">📄</div>
                    <p>No invoices found. Create one using the Create tab.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* VIEW MODAL (Simplified Preview) */}
      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Quick View</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Invoice #{selectedInvoice.invNo}</div>
              </div>
              <button className="close-btn" onClick={() => setSelectedInvoice(null)}>×</button>
            </div>
            <div className="modal-body">
               <div className="summary-box" style={{ marginBottom: '1.5rem' }}>
                  <div className="summary-row"><span className="label">Supplier</span><span className="value">{selectedInvoice.supplierName}</span></div>
                  <div className="summary-row"><span className="label">Date</span><span className="value">{formatDate(selectedInvoice.date)}</span></div>
                  <div className="summary-row"><span className="label">Total Quantity</span><span className="value">{selectedInvoice.quantity} kg</span></div>
                  <div className="summary-net"><span className="label">Net Payable</span><span className="value">₹{fmt(selectedInvoice.netTotal)}</span></div>
               </div>
               <div style={{ textAlign: 'center' }}>
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    Click below to generate the official PDF according to your custom layout.
                  </p>
                  <button 
                    className="btn btn-export" 
                    onClick={async () => {
                      const res = await fetch(`/api/invoices/public/${selectedInvoice.invNo}?date=${selectedInvoice.date}`);
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `Invoice_${selectedInvoice.invNo}.pdf`;
                      a.click();
                    }}
                  >
                    ⬇ Download PDF
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

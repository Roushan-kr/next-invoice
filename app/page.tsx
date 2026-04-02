"use client";

import { useState } from "react";
import Header from "@/components/Header";

export default function PublicLookupPage() {
  const [invNo, setInvNo] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/invoices/public/${invNo}?date=${date}`);
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Invoice not found");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_${invNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="container">
        <div className="section-header">
          <div className="section-title">
            <span>Customer Portal</span>
            <strong>Invoice Retrieval</strong>
          </div>
        </div>

        <div className="form-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="card-label">Lookup by Details</div>
          <form onSubmit={handleDownload}>
            <div className="grid-2">
              <div className="field">
                <label>Invoice Number</label>
                <input 
                  type="text" 
                  value={invNo} 
                  onChange={(e) => setInvNo(e.target.value)} 
                  placeholder="e.g. 417" 
                  required 
                />
              </div>
              <div className="field">
                <label>Invoice Date</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  required 
                />
              </div>
            </div>

            {error && (
              <div style={{ marginTop: '1rem', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1.5rem' }}
              disabled={loading}
            >
              {loading ? "Searching..." : "⬇ Download Invoice PDF"}
            </button>
          </form>
          
          <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'center' }}>
            Enter the exact invoice number and date provided by the merchant to retrieve your digital copy.
          </p>
        </div>
      </div>
    </>
  );
}

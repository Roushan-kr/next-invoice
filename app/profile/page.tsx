"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { getUserProfile, updateUserProfile } from "@/lib/actions";
import { IUserProfile } from "@/lib/models/Profile";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<IUserProfile>>({
    companyName: "",
    companyAddr: "",
    bankName: "",
    bankAc: "",
    bankIfsc: "",
    supplierState: "Bihar, Code: 10",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      getUserProfile().then(data => {
        if (data) setProfile(data);
        setLoading(false);
      });
    }
  }, [status]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile(profile);
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) return <div className="container">Loading...</div>;

  return (
    <>
      <Header />
      <div className="container">
        <div className="section-header">
          <div className="section-title">
            <span>Settings</span>
            <strong>Company Stationery Profile</strong>
          </div>
        </div>

        <div className="form-card" style={{ maxWidth: '800px', margin: '0 auto 2rem auto' }}>
          <div className="card-label">Default Invoice Details</div>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            These details will be automatically pre-filled whenever you create a new invoice.
          </p>
          
          <form onSubmit={handleSave}>
            <div className="grid-2">
              <div className="field col-span-2">
                <label>Default Company Name</label>
                <input 
                  type="text" 
                  value={profile.companyName} 
                  onChange={e => setProfile({...profile, companyName: e.target.value})}
                  placeholder="e.g. Bhole Shankar Trading Co."
                />
              </div>
              <div className="field col-span-2">
                <label>Default Company Address</label>
                <input 
                  type="text" 
                  value={profile.companyAddr} 
                  onChange={e => setProfile({...profile, companyAddr: e.target.value})}
                  placeholder="e.g. Gulabbagh, Purnia, Bihar"
                />
              </div>
              <div className="field">
                <label>Default State / Code</label>
                <input 
                  type="text" 
                  value={profile.supplierState} 
                  onChange={e => setProfile({...profile, supplierState: e.target.value})}
                />
              </div>
              <div className="field">
                <label>Default Bank Name</label>
                <input 
                  type="text" 
                  value={profile.bankName} 
                  onChange={e => setProfile({...profile, bankName: e.target.value})}
                />
              </div>
              <div className="field">
                <label>Default Bank A/C No.</label>
                <input 
                  type="text" 
                  value={profile.bankAc} 
                  onChange={e => setProfile({...profile, bankAc: e.target.value})}
                />
              </div>
              <div className="field">
                <label>Default Bank IFSC</label>
                <input 
                  type="text" 
                  value={profile.bankIfsc} 
                  onChange={e => setProfile({...profile, bankIfsc: e.target.value})}
                />
              </div>
            </div>

            <div className="btn-row" style={{ marginTop: '2rem' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={saving}
              >
                {saving ? "Saving..." : "💾 Update Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

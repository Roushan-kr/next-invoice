"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { getUserProfile } from "@/lib/actions";

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [companyName, setCompanyName] = useState("IMS — Invoice Manager");

  useEffect(() => {
    async function fetchProfile() {
      if (session?.user) {
        try {
          const profile = await getUserProfile();
          if (profile?.companyName) {
            setCompanyName(profile.companyName);
          }
        } catch (error) {
          console.error("Failed to fetch profile for header:", error);
        }
      }
    }
    fetchProfile();
  }, [session]);

  return (
    <header className="header">
      <div className="header-brand">
        <span>IMS</span>
        {companyName}
      </div>
      <nav className="nav-tabs">
        {session ? (
          <>
            <Link 
              href="/create" 
              className={`nav-tab ${pathname === '/create' ? 'active' : ''}`}
            >
              ＋ Create Invoice
            </Link>
            <Link 
              href="/view" 
              className={`nav-tab ${pathname === '/view' ? 'active' : ''}`}
            >
              ▤ View Records
            </Link>
            <Link 
              href="/profile" 
              className={`nav-tab ${pathname === '/profile' ? 'active' : ''}`}
            >
              ⚙ Profile Settings
            </Link>
            <button 
              className="nav-tab" 
              onClick={() => signOut()}
              style={{ border: '1px solid rgba(255,100,100,0.3)', color: 'rgba(255,200,200,0.8)' }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link 
              href="/" 
              className={`nav-tab ${pathname === '/' ? 'active' : ''}`}
            >
              ▤ Lookup
            </Link>
            <Link 
              href="/login" 
              className={`nav-tab ${pathname === '/login' ? 'active' : ''}`}
            >
              Sign In
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

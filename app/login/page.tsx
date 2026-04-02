import { Suspense } from "react";
import Header from "@/components/Header";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <>
      <Header />
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Suspense fallback={<div className="container">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </>
  );
}

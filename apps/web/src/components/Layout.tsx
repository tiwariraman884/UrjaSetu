import { ReactNode } from "react";
import Navbar from "./Navbar";
import SafetyBanner from "./SafetyBanner";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar />
      <SafetyBanner />
      <main className="page">{children}</main>
    </div>
  );
}

import { useLocation } from "wouter";
import Layout from "@/components/layout/Layout";

export default function BetSlip() {
  return (
    <Layout>
      <div className="w-full min-h-screen flex flex-col">
        <img 
          src="/images/Bet Slip (2).png" 
          alt="Bet Slip" 
          className="w-full h-full object-contain"
        />
      </div>
    </Layout>
  );
}
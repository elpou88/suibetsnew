import { useLocation } from "wouter";
import Layout from "@/components/layout/Layout";

export default function MatchDetail() {
  return (
    <Layout>
      <div className="w-full min-h-screen flex flex-col">
        <img 
          src="/images/Sports 4 (2).png" 
          alt="Match Detail" 
          className="w-full h-full object-contain"
        />
      </div>
    </Layout>
  );
}
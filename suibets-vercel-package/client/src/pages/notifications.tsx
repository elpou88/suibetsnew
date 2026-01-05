import { useLocation } from "wouter";
import Layout from "@/components/layout/Layout";

export default function Notifications() {
  return (
    <Layout>
      <div className="w-full min-h-screen flex flex-col">
        <img 
          src="/images/Notifications (2).png" 
          alt="Notifications" 
          className="w-full h-full object-contain"
        />
      </div>
    </Layout>
  );
}
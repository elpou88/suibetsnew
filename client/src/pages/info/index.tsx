import { useLocation } from "wouter";
import Layout from "@/components/layout/Layout";

export default function InfoPage() {
  const [, setLocation] = useLocation();
  
  return (
    <Layout>
      <div className="w-full min-h-screen relative">
        <img 
          src="/images/Sports 1 (2).png" 
          alt="Information"
          className="w-full h-full object-contain"
        />
        
        {/* Back button */}
        <button 
          onClick={() => setLocation("/")}
          className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg"
        >
          Back to Home
        </button>
        
        {/* Content overlay */}
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white p-6 rounded-lg max-w-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Information</h1>
          <p className="mb-4">This section contains information about the platform, rules, and policies.</p>
          <ul className="text-left list-disc list-inside mb-4">
            <li>FAQ</li>
            <li>Blog</li>
            <li>Affiliate Program</li>
            <li>Privacy Policy</li>
            <li>Rules</li>
            <li>Betting Integrity</li>
            <li>Responsible Gambling</li>
            <li>About Us</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
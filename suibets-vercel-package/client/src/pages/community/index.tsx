import { useLocation } from "wouter";
import Layout from "@/components/layout/Layout";

export default function CommunityPage() {
  const [, setLocation] = useLocation();
  
  return (
    <Layout>
      <div className="w-full min-h-screen relative">
        <img 
          src="/images/Sports 1 (2).png" 
          alt="Community"
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
          <h1 className="text-2xl font-bold mb-4">Community</h1>
          <p className="mb-4">Join our community on various platforms:</p>
          <ul className="text-left list-disc list-inside mb-4">
            <li>Telegram</li>
            <li>Discord</li>
            <li>Twitter</li>
          </ul>
          <p>Connect with other bettors and join the conversation!</p>
        </div>
      </div>
    </Layout>
  );
}
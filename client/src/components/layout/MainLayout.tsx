import React from 'react';
import Navbar from './Navbar';
import { Toaster } from '@/components/ui/toaster';

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * Main layout component used for consistent page structure
 * Includes navigation bar and common elements
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#112225] text-white">
      <Navbar />
      
      <main className="container mx-auto p-6 pt-8">
        {children}
      </main>
      
      <footer className="border-t border-[#1e3a3f] bg-[#0b1618] py-6 mt-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <img 
                src="/logo/suibets-logo.png?v=999" 
                alt="SuiBets Logo" 
                className="h-8" 
                onError={(e) => console.log('Logo loading:', e)}
              />
              <p className="text-sm text-gray-400 mt-2">
                © {new Date().getFullYear()} SuiBets. All rights reserved.
              </p>
            </div>
            
            <div className="flex space-x-6">
              <a href="/info" className="text-gray-400 hover:text-[#00FFFF]">
                About
              </a>
              <a href="/community" className="text-gray-400 hover:text-[#00FFFF]">
                Community
              </a>
              <a href="/contact" className="text-gray-400 hover:text-[#00FFFF]">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
      
      <Toaster />
    </div>
  );
};

export default MainLayout;
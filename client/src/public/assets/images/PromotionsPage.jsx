import React, { useEffect } from 'react';
import Layout from '@/components/layout/Layout';

const PromotionsPage = () => {
  useEffect(() => {
    // Log that the component mounted
    console.log('PromotionsPage component mounted');
    
    // Force image to load
    const img = new Image();
    img.src = '/attached_assets/Promotions (2).png';
    img.onload = () => console.log('Promotions image loaded');
    img.onerror = (e) => console.error('Promotions image failed to load', e);
  }, []);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-white mb-6">Promotions</h1>
        <img
          src="/attached_assets/Promotions (2).png"
          alt="Promotions"
          className="w-full rounded-lg"
        />
      </div>
    </Layout>
  );
};

export default PromotionsPage;
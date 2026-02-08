import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useZkLogin } from '@/context/ZkLoginContext';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { handleOAuthCallback } = useZkLogin();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const hash = window.location.hash;
        if (!hash || !hash.includes('id_token')) {
          setStatus('error');
          setErrorMsg('No authentication token received. Please try again.');
          return;
        }

        const address = await handleOAuthCallback(hash);
        
        if (address) {
          setStatus('success');
          setTimeout(() => setLocation('/'), 1500);
        } else {
          setStatus('error');
          setErrorMsg('Login failed. Please try again.');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'Authentication failed');
      }
    };

    processCallback();
  }, [handleOAuthCallback, setLocation]);

  return (
    <div className="min-h-screen bg-[#0b1618] flex items-center justify-center">
      <div className="text-center space-y-4 p-8">
        {status === 'processing' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Completing Login...</h2>
            <p className="text-gray-400">Generating your Sui wallet via zkLogin</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <span className="text-green-400 text-2xl">&#10003;</span>
            </div>
            <h2 className="text-xl font-bold text-white">Login Successful!</h2>
            <p className="text-gray-400">Redirecting to home...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <span className="text-red-400 text-2xl">!</span>
            </div>
            <h2 className="text-xl font-bold text-white">Login Failed</h2>
            <p className="text-red-400">{errorMsg}</p>
            <button 
              onClick={() => setLocation('/')}
              className="mt-4 px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
              data-testid="button-back-home"
            >
              Back to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
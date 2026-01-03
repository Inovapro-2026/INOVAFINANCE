
import React, { useState, useEffect } from 'react';
import { db } from '../db';

interface LoginProps {
  onLogin: (matricula: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [matricula, setMatricula] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Delay inicial para animação de entrada
    setTimeout(() => setShowContent(true), 100);

    const checkBiometrics = async () => {
      const profiles = await db.profiles.toArray();
      const anyWithBio = profiles.some(p => !!p.biometricCredentialId);
      setHasBiometrics(anyWithBio);
    };
    checkBiometrics();
  }, []);

  const handleNumberClick = (num: string) => {
    if (matricula.length < 10) {
      setMatricula(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setMatricula(prev => prev.slice(0, -1));
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (matricula.length >= 4) {
      triggerLoginAnimation(matricula);
    }
  };

  const triggerLoginAnimation = (targetMatricula: string) => {
    setIsLoggingIn(true);
    setTimeout(() => {
      onLogin(targetMatricula);
    }, 600);
  };

  const handleBiometry = async () => {
    try {
      setIsScanning(true);
      const profiles = await db.profiles.toArray();
      const bioProfiles = profiles.filter(p => !!p.biometricCredentialId);

      if (bioProfiles.length === 0) {
        setTimeout(() => {
          setIsScanning(false);
          alert("Nenhuma biometria cadastrada neste dispositivo.");
        }, 1500);
        return;
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const allowCredentials = bioProfiles.map(p => ({
        id: Uint8Array.from(atob(p.biometricCredentialId!), c => c.charCodeAt(0)),
        type: 'public-key' as const,
      }));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials,
          userVerification: 'preferred',
          timeout: 60000,
        },
      }) as any;

      if (assertion) {
        const usedId = btoa(String.fromCharCode(...new Uint8Array(assertion.rawId)));
        const matchedProfile = bioProfiles.find(p => p.biometricCredentialId === usedId);
        
        if (matchedProfile) {
          setTimeout(() => {
            setIsScanning(false);
            triggerLoginAnimation(matchedProfile.userId);
          }, 1000);
        } else {
          setIsScanning(false);
          alert("Biometria não reconhecida.");
        }
      }
    } catch (err) {
      setIsScanning(false);
      console.error(err);
    }
  };

  const NumberButton = ({ val, index }: { val: string; index: number }) => (
    <button
      type="button"
      onClick={() => handleNumberClick(val)}
      style={{ animationDelay: `${(index * 0.05) + 0.4}s` }}
      className={`w-16 h-16 rounded-full bg-white/80 border border-gray-100 text-2xl font-black text-gray-800 shadow-sm 
                 active:scale-90 active:bg-[#7A5CFA] active:text-white transition-all flex items-center justify-center
                 hover:shadow-[0_0_15px_rgba(122,90,250,0.3)] hover:border-[#7A5CFA]/30
                 animate-fadeIn opacity-0 fill-mode-forwards`}
    >
      {val}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6 overflow-hidden">
      {/* Biometric Scanning Overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-[200] bg-[#1A1A1A]/90 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn">
          <div className="relative w-40 h-40">
            <div className="absolute inset-0 border-4 border-[#7A5CFA] rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-2 border-2 border-[#4A90FF] rounded-full animate-spin-slow opacity-40"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="fas fa-fingerprint text-6xl text-white animate-pulse"></i>
            </div>
            {/* Scan Line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#7A5CFA] to-transparent animate-scanLine"></div>
          </div>
          <p className="mt-8 text-white font-black tracking-[0.3em] uppercase text-xs animate-pulse">Autenticando Identidade...</p>
        </div>
      )}

      <div className={`w-full max-w-md transition-all duration-700 ease-in-out
        ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}
        ${isLoggingIn ? 'scale-150 opacity-0 blur-lg' : 'scale-100'}
      `}>
        <div className="bg-white/90 backdrop-blur-2xl p-10 rounded-[48px] shadow-2xl border border-white/60 relative overflow-hidden">
          
          {/* Header Section */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-[#7A5CFA] to-[#4A90FF] rounded-[22px] flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-[#7A5CFA]/30">
              <i className="fas fa-rocket"></i>
            </div>
            <h1 className="text-3xl font-black text-[#1A1A1A] tracking-tighter">INOVAFINANCE</h1>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Acesso Inteligente</p>
          </div>

          <form onSubmit={handleManualLogin} className="space-y-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 px-1 tracking-[0.2em] uppercase text-center">Matrícula</label>
              <div className="relative">
                <input 
                  type="text"
                  value={matricula}
                  readOnly
                  placeholder="Digite sua matrícula numérica"
                  className={`w-full bg-gray-50/50 border-2 rounded-[24px] px-6 py-5 text-center text-3xl font-black transition-all duration-300 outline-none
                    ${matricula.length >= 4 ? 'border-[#7A5CFA] text-[#7A5CFA]' : 'border-transparent text-gray-400'}`}
                />
              </div>
            </div>

            {/* Custom Numpad */}
            <div className="grid grid-cols-3 gap-y-5 gap-x-8 justify-items-center max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n, i) => (
                <React.Fragment key={n}>
                  <NumberButton val={n} index={i} />
                </React.Fragment>
              ))}
              
              <button 
                type="button" 
                onClick={handleBiometry}
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl transition-all active:scale-90 bg-[#7A5CFA]/5 text-[#7A5CFA] hover:bg-[#7A5CFA]/10"
              >
                <i className="fas fa-fingerprint"></i>
              </button>
              
              <NumberButton val="0" index={9} />
              
              <button 
                type="button" 
                onClick={handleDelete}
                className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-xl active:scale-90 transition-all"
              >
                <i className="fas fa-backspace"></i>
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <button 
                type="submit"
                disabled={matricula.length < 4}
                className={`w-full py-5 rounded-[24px] font-black text-lg transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3
                  ${matricula.length >= 4 
                    ? 'bg-gradient-to-r from-[#4A90FF] to-[#7A5CFA] text-white shadow-[#7A5CFA]/20' 
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'}`}
              >
                ENTRAR
                <i className="fas fa-chevron-right text-xs"></i>
              </button>

              <div className="text-center">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                  {hasBiometrics ? 'Autenticação de camada dupla ativa' : 'Segurança via criptografia local'}
                </p>
              </div>
            </div>
          </form>

          {/* Decorative Elements */}
          <div className="absolute -right-12 -top-12 w-24 h-24 bg-[#4A90FF]/10 rounded-full blur-2xl"></div>
          <div className="absolute -left-12 -bottom-12 w-24 h-24 bg-[#7A5CFA]/10 rounded-full blur-2xl"></div>
        </div>
      </div>
      
      {/* Global CSS for unique animations */}
      <style>{`
        @keyframes scanLine {
          0% { top: 0; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scanLine {
          animation: scanLine 2s linear infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        .fill-mode-forwards {
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
};

export default Login;

import React, { useState, useEffect } from 'react';
import { db } from '@/db';

interface LoginProps {
  onLogin: (matricula: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [matricula, setMatricula] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const profiles = await db.profiles.toArray();
        const anyWithBio = profiles.some(p => !!p.biometricCredentialId);
        setHasBiometrics(anyWithBio);
      } catch (err) {
        console.error('Error checking biometrics:', err);
      }
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

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'linear-gradient(135deg, #0a0f1d 0%, #1a1f3a 50%, #0a0f1d 100%)',
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '40px',
    borderRadius: '32px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.5s ease',
    transform: isLoggingIn ? 'scale(1.1)' : 'scale(1)',
    opacity: isLoggingIn ? 0 : 1,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px',
  };

  const iconBoxStyle: React.CSSProperties = {
    width: '64px',
    height: '64px',
    background: 'linear-gradient(135deg, #7A5CFA 0%, #4A90FF 100%)',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '28px',
    marginBottom: '16px',
    boxShadow: '0 10px 30px rgba(122, 92, 250, 0.4)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 900,
    color: '#1a1a1a',
    letterSpacing: '-0.5px',
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 700,
    color: '#9ca3af',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    marginTop: '4px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#f3f4f6',
    border: matricula.length >= 4 ? '2px solid #7A5CFA' : '2px solid transparent',
    borderRadius: '20px',
    padding: '16px 24px',
    textAlign: 'center',
    fontSize: '28px',
    fontWeight: 700,
    color: matricula.length >= 4 ? '#7A5CFA' : '#6b7280',
    outline: 'none',
    transition: 'all 0.3s ease',
  };

  const numpadStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    maxWidth: '280px',
    margin: '24px auto',
    justifyItems: 'center',
  };

  const numberBtnStyle: React.CSSProperties = {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'white',
    border: '1px solid #e5e7eb',
    fontSize: '24px',
    fontWeight: 700,
    color: '#374151',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  };

  const bioBtnStyle: React.CSSProperties = {
    ...numberBtnStyle,
    background: 'rgba(122, 92, 250, 0.1)',
    border: 'none',
    color: '#7A5CFA',
  };

  const deleteBtnStyle: React.CSSProperties = {
    ...numberBtnStyle,
    background: 'rgba(239, 68, 68, 0.1)',
    border: 'none',
    color: '#ef4444',
  };

  const submitBtnStyle: React.CSSProperties = {
    width: '100%',
    padding: '18px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '16px',
    fontWeight: 700,
    cursor: matricula.length >= 4 ? 'pointer' : 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    background: matricula.length >= 4 
      ? 'linear-gradient(135deg, #4A90FF 0%, #7A5CFA 100%)' 
      : '#e5e7eb',
    color: matricula.length >= 4 ? 'white' : '#9ca3af',
    boxShadow: matricula.length >= 4 ? '0 10px 30px rgba(122, 92, 250, 0.3)' : 'none',
  };

  const scanOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    background: 'rgba(0, 0, 0, 0.9)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={containerStyle}>
      {/* Biometric Scanning Overlay */}
      {isScanning && (
        <div style={scanOverlayStyle}>
          <div style={{ position: 'relative', width: '160px', height: '160px' }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              border: '4px solid #7A5CFA',
              borderRadius: '50%',
              animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
              opacity: 0.3,
            }}></div>
            <div style={{
              position: 'absolute',
              inset: '16px',
              border: '2px solid #4A90FF',
              borderRadius: '50%',
              animation: 'spin 3s linear infinite',
              opacity: 0.5,
            }}></div>
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <i className="fas fa-fingerprint" style={{ fontSize: '64px', color: 'white', animation: 'pulse 2s infinite' }}></i>
            </div>
          </div>
          <p style={{
            marginTop: '32px',
            color: 'white',
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            fontSize: '12px',
          }}>Autenticando...</p>
        </div>
      )}

      {/* Login Card */}
      <div style={cardStyle}>
        {/* Header Section */}
        <div style={headerStyle}>
          <div style={iconBoxStyle}>
            <i className="fas fa-rocket"></i>
          </div>
          <h1 style={titleStyle}>INOVAFINANCE</h1>
          <p style={subtitleStyle}>Acesso Inteligente</p>
        </div>

        <form onSubmit={handleManualLogin}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 700,
              color: '#9ca3af',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              textAlign: 'center',
              marginBottom: '8px',
            }}>Matrícula</label>
            <input 
              type="text"
              value={matricula}
              readOnly
              placeholder="Digite sua matrícula"
              style={inputStyle}
            />
          </div>

          {/* Custom Numpad */}
          <div style={numpadStyle}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleNumberClick(n)}
                style={numberBtnStyle}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {n}
              </button>
            ))}
            
            <button 
              type="button" 
              onClick={handleBiometry}
              style={bioBtnStyle}
            >
              <i className="fas fa-fingerprint"></i>
            </button>
            
            <button
              type="button"
              onClick={() => handleNumberClick('0')}
              style={numberBtnStyle}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              0
            </button>
            
            <button 
              type="button" 
              onClick={handleDelete}
              style={deleteBtnStyle}
            >
              <i className="fas fa-backspace"></i>
            </button>
          </div>

          <div style={{ marginTop: '24px' }}>
            <button 
              type="submit"
              disabled={matricula.length < 4}
              style={submitBtnStyle}
            >
              ENTRAR
              <i className="fas fa-chevron-right" style={{ fontSize: '12px' }}></i>
            </button>

            <p style={{
              textAlign: 'center',
              fontSize: '11px',
              color: '#9ca3af',
              marginTop: '16px',
            }}>
              {hasBiometrics ? '🔐 Biometria disponível' : '🔒 Segurança criptografada'}
            </p>
          </div>
        </form>

        {/* Decorative gradients */}
        <div style={{
          position: 'absolute',
          right: '-80px',
          top: '-80px',
          width: '160px',
          height: '160px',
          background: 'rgba(74, 144, 255, 0.15)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }}></div>
        <div style={{
          position: 'absolute',
          left: '-80px',
          bottom: '-80px',
          width: '160px',
          height: '160px',
          background: 'rgba(122, 92, 250, 0.15)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }}></div>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
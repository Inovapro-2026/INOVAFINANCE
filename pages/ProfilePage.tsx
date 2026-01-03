
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { UserProfile } from '../types';
import { useTheme } from '../contexts/ThemeContext';

const ProfilePage: React.FC<{ userId: string }> = ({ userId }) => {
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile>({ userId });
  const [isEditing, setIsEditing] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await db.profiles.get(userId);
        if (data) {
          setProfile(data);
        } else {
          // Se não houver perfil, cria um inicial
          const newProfile = { userId, initialBalance: 0 };
          await db.profiles.add(newProfile);
          setProfile(newProfile);
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfile();
    
    if (window.PublicKeyCredential) {
      setIsBiometricSupported(true);
    }
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.profiles.put(profile);
      setIsEditing(false);
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      alert("Houve um erro tecnológico ao salvar seus dados.");
    }
  };

  const registerBiometrics = async () => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userID = new TextEncoder().encode(userId);

      const publicKeyCredentialCreationOptions: any = {
        challenge,
        rp: { name: "INOVAFINANCE", id: window.location.hostname || "localhost" },
        user: {
          id: userID,
          name: profile.fullName || userId,
          displayName: profile.fullName || userId,
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        authenticatorSelection: { userVerification: "preferred" },
        timeout: 60000,
        attestation: "none",
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as any;

      if (credential) {
        const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        const updatedProfile = { ...profile, biometricCredentialId: credentialId };
        await db.profiles.put(updatedProfile);
        setProfile(updatedProfile);
        alert("Biometria cadastrada com sucesso!");
      }
    } catch (err) {
      alert("Não foi possível cadastrar a biometria.");
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center font-bold animate-pulse" style={{ color: 'var(--text-muted)' }}>
        <i className="fas fa-circle-notch fa-spin text-4xl mb-4"></i>
        Sincronizando dados seguros...
      </div>
    );
  }

  return (
    <div className="py-4 max-w-2xl mx-auto space-y-6">
      <div className="tech-card p-8 relative overflow-hidden">
        {/* Banner de status salvo */}
        {savedStatus && (
          <div className="absolute top-0 left-0 right-0 bg-green-500 text-white py-2 text-center text-xs font-black uppercase tracking-widest animate-slideDown">
            <i className="fas fa-check-circle mr-2"></i> Perfil atualizado com sucesso
          </div>
        )}

        <div className="flex flex-col items-center mb-8 mt-4">
          <div className="w-24 h-24 bg-gradient-to-br from-[#7A5CFA] to-[#4A90FF] rounded-full flex items-center justify-center text-white text-4xl shadow-lg mb-4 relative group">
            <i className="fas fa-user"></i>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute -right-2 -bottom-2 w-10 h-10 rounded-full text-[#7A5CFA] shadow-md flex items-center justify-center hover:scale-110 transition-transform"
                style={{ background: 'var(--bg-card-hover)' }}
              >
                <i className="fas fa-pen text-sm"></i>
              </button>
            )}
          </div>
          <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            {profile.fullName || 'Usuário Inova'}
          </h2>
          <p className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>Matrícula: {userId}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-black mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Saldo Inicial (Patrimônio Base)</label>
              <div className={`relative transition-all ${isEditing ? 'scale-[1.02]' : 'opacity-80'}`}>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black" style={{ color: 'var(--text-muted)' }}>R$</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={profile.initialBalance ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setProfile({...profile, initialBalance: val});
                  }}
                  disabled={!isEditing}
                  placeholder="0,00"
                  className="w-full border-2 rounded-2xl py-4 pl-12 pr-6 font-black text-xl outline-none transition-all"
                  style={{ 
                    background: 'var(--bg-input)', 
                    color: 'var(--text-primary)',
                    borderColor: isEditing ? 'var(--primary)' : 'transparent'
                  }}
                />
              </div>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Este valor é somado aos seus ganhos e subtraído dos seus gastos.
              </p>
            </div>

            <div>
              <label className="block text-xs font-black mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Nome Completo</label>
              <input 
                type="text" 
                value={profile.fullName || ''}
                onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                disabled={!isEditing}
                placeholder="Ex: João Silva"
                className="w-full border-2 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                style={{ 
                  background: 'var(--bg-input)', 
                  color: 'var(--text-primary)',
                  borderColor: isEditing ? 'var(--primary)' : 'transparent'
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-black mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>E-mail de Contato</label>
              <input 
                type="email" 
                value={profile.email || ''}
                onChange={(e) => setProfile({...profile, email: e.target.value})}
                disabled={!isEditing}
                placeholder="nome@exemplo.com"
                className="w-full border-2 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                style={{ 
                  background: 'var(--bg-input)', 
                  color: 'var(--text-primary)',
                  borderColor: isEditing ? 'var(--primary)' : 'transparent'
                }}
              />
            </div>
          </div>

          <div className="pt-6">
            {!isEditing ? (
              <button 
                type="button" 
                onClick={() => setIsEditing(true)}
                className="w-full py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                style={{ background: 'var(--primary)', color: 'white' }}
              >
                <i className="fas fa-edit"></i>
                AJUSTAR PERFIL E SALDO
              </button>
            ) : (
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsEditing(false);
                    db.profiles.get(userId).then(d => d && setProfile(d));
                  }} 
                  className="flex-1 border-2 py-4 rounded-2xl font-black transition-all"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  CANCELAR
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-[#4A90FF] text-white py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <i className="fas fa-save"></i>
                  SALVAR
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Theme Toggle Section */}
      <div className="tech-card p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#7A5CFA] to-[#4A90FF] rounded-xl flex items-center justify-center text-white shadow-sm">
            <i className={`fas ${theme === 'dark' ? 'fa-moon' : 'fa-sun'} text-xl`}></i>
          </div>
          <div>
            <h3 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Aparência</h3>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Tema do Aplicativo</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 rounded-2xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <i className={`fas ${theme === 'dark' ? 'fa-moon' : 'fa-sun'} text-2xl`} style={{ color: 'var(--primary)' }}></i>
            <div>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                ATIVO
              </p>
            </div>
          </div>
          <button 
            onClick={toggleTheme}
            className="theme-toggle relative w-16 h-8 rounded-full transition-all duration-300 focus:outline-none"
            style={{ 
              background: theme === 'dark' 
                ? 'linear-gradient(135deg, #7A5CFA 0%, #4A90FF 100%)' 
                : 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
            }}
          >
            <span 
              className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center"
              style={{ left: theme === 'dark' ? '2rem' : '0.25rem' }}
            >
              <i className={`fas ${theme === 'dark' ? 'fa-moon' : 'fa-sun'} text-xs`} 
                 style={{ color: theme === 'dark' ? '#7A5CFA' : '#f59e0b' }}></i>
            </span>
          </button>
        </div>
      </div>

      {/* Security Section */}
      <div className="tech-card p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'var(--bg-card-hover)', color: 'var(--primary)' }}>
            <i className="fas fa-shield-halved text-xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Segurança</h3>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Biometria e Acesso Rápido</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between p-6 rounded-2xl gap-4" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <i className={`fas fa-fingerprint text-2xl ${profile.biometricCredentialId ? 'text-green-500' : ''}`} style={{ color: profile.biometricCredentialId ? undefined : 'var(--text-muted)' }}></i>
             <div>
               <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Autenticação Nativa</p>
               <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                 {profile.biometricCredentialId ? 'PROTEÇÃO ATIVADA' : 'NÃO CONFIGURADO'}
               </p>
             </div>
          </div>
          {isBiometricSupported ? (
            <button 
              onClick={registerBiometrics} 
              className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-black transition-all 
                ${profile.biometricCredentialId 
                  ? 'cursor-not-allowed opacity-50' 
                  : 'bg-[#7A5CFA] text-white shadow-md hover:scale-105 active:scale-95'
                }`}
              style={profile.biometricCredentialId ? { background: 'var(--bg-input)', color: 'var(--text-muted)' } : undefined}
              disabled={!!profile.biometricCredentialId}
            >
              {profile.biometricCredentialId ? 'JÁ CADASTRADO' : 'ATIVAR AGORA'}
            </button>
          ) : (
            <span className="text-xs text-red-500 font-bold bg-red-500/10 px-3 py-1 rounded-lg">HARDWARE INCOMPATÍVEL</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

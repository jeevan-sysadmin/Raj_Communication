import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiAlertCircle, FiEye, FiEyeOff, FiLock, FiLogIn, FiShield, FiTool, FiUser, FiUsers } from 'react-icons/fi';
import sunLogo from '../assets/sunlogo.png';

interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: { id: string; email: string; name: string; role: 'user' | 'admin' };
  role?: 'user' | 'admin';
}

interface LoginProps {
  onLoginSuccess?: (role: string) => void;
}

const LoginBackground3D = lazy(() => import('./LoginBackground3D'));

async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch('http://cloud.anyrdp.in:3001/raj_communication/api/login.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error('Invalid email or password');
  return response.json();
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [redirectingTo, setRedirectingTo] = useState<'user' | 'admin' | null>(null);
  const redirectTimeoutRef = useRef<number | null>(null);

  const canUseHeavyEffects = useMemo(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const narrowScreen = window.matchMedia('(max-width: 900px)').matches;
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
    const slowNetwork = connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType || '');
    return !reducedMotion && !narrowScreen && !slowNetwork;
  }, []);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
    return () => {
      if (redirectTimeoutRef.current) window.clearTimeout(redirectTimeoutRef.current);
    };
  }, []);

  const getRoleIcon = (role: string) => (role === 'admin' ? <FiShield /> : role === 'user' ? <FiTool /> : <FiUsers />);
  const getRoleColor = (role: string) => (role === 'admin' ? '#667eea' : role === 'user' ? '#52dd38' : '#FFD700');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    setShake(false);

    if (!email || !password) {
      setLoginError('Please enter both email and password');
      setShake(true);
      setIsLoading(false);
      setTimeout(() => setShake(false), 500);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLoginError('Please enter a valid email address');
      setShake(true);
      setIsLoading(false);
      setTimeout(() => setShake(false), 500);
      return;
    }

    try {
      const data = await apiLogin(email, password);
      if (data.success && data.token) {
        setSuccess(true);
        const userRole = data.user?.role || data.role || 'user';
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('token', data.token);
        if (data.user) localStorage.setItem('userData', JSON.stringify(data.user));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', userRole);
        if (rememberMe) localStorage.setItem('rememberedEmail', email);
        else localStorage.removeItem('rememberedEmail');

        const targetRole = userRole === 'admin' ? 'admin' : 'user';
        setRedirectingTo(targetRole);
        if (redirectTimeoutRef.current) window.clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = window.setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(targetRole);
          else window.location.href = '/admin-dashboard';
        }, 1500);
      } else {
        setLoginError(data.message || 'Invalid email or password');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setLoginError('Invalid email or password');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="canvas-container">
        {canUseHeavyEffects ? (
          <Suspense fallback={<div style={{ width: '100%', height: '100%', background: '#0a0e17' }} />}>
            <LoginBackground3D />
          </Suspense>
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at top right, #1f2937 0%, #0a0e17 45%, #05070d 100%)' }} />
        )}
      </div>

      <div className="login-card-wrapper">
        <motion.div className="login-card" initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="logo-container">
            <img src={sunLogo} alt="Raj Communication" className="logo-image" />
            <div className="logo-glow" />
          </div>
          <h1 className="title"><span className="company-name">Raj Communication</span></h1>
          <p className="login-subtitle">Sign in to your account</p>

          <form onSubmit={handleLogin} className={`login-form ${shake ? 'shake' : ''}`} autoComplete="off">
            <div className="input-group"><div className="input-wrapper"><FiUser className="input-icon" /><input type="email" placeholder="Email Address" value={email} onChange={(e) => { setEmail(e.target.value); if (loginError) setLoginError(''); }} required className="login-input" autoComplete="off" /></div></div>
            <div className="input-group"><div className="input-wrapper"><FiLock className="input-icon" /><input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => { setPassword(e.target.value); if (loginError) setLoginError(''); }} required className="login-input" autoComplete="off" /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>{showPassword ? <FiEyeOff /> : <FiEye />}</button></div></div>
            {loginError && <div className="login-error-message"><FiAlertCircle className="error-icon" /><span>{loginError}</span></div>}
            <div className="form-options"><label className="checkbox-container"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="checkbox-input" /><span className="checkbox-custom">{rememberMe && <div className="checkbox-checkmark" />}</span><span className="checkbox-label">Remember me</span></label></div>

            <AnimatePresence>
              {success ? (
                <div className="success-container"><div className="success-icon">{redirectingTo && getRoleIcon(redirectingTo)}</div><div className="success-text"><h3>Login Successful!</h3><p>Redirecting to {redirectingTo === 'admin' ? 'Admin' : 'User'} Dashboard...</p><p className="role-indicator">Role: <span style={{ backgroundColor: redirectingTo ? getRoleColor(redirectingTo) : '#52dd38' }}>{redirectingTo?.toUpperCase()}</span></p></div></div>
              ) : (
                <motion.button type="submit" className="btn-login" disabled={isLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  {isLoading ? <><span className="spinner"></span><span className="btn-text">Signing In...</span></> : <><FiLogIn className="btn-icon" /><span className="btn-text">Sign In</span></>}
                </motion.button>
              )}
            </AnimatePresence>
          </form>
          <div className="footer"><p className="footer-text">© 2026 Jeevan Larosh. All rights reserved.</p></div>
        </motion.div>
      </div>
    </div>
  );
}

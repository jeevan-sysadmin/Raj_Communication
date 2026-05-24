// components/Login.tsx
import { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Torus, Float, Stars, Ring } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { FiUser, FiLock, FiEye, FiEyeOff, FiLogIn, FiAlertCircle, FiShield, FiUsers, FiTool } from "react-icons/fi";
import * as THREE from "three";

// Import your logo
import sunLogo from "../assets/sunlogo.png";

// Type definitions
interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
  };
  redirect?: string;
  role?: 'user' | 'admin';
}

interface LoginProps {
  onLoginSuccess?: (role: string) => void;
}

// Enhanced 3D Background with Planets and Nebula
function CosmicBackground() {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
    
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.0005;
    }
  });

  // Create particles data
  const particlesCount = 300;
  const particlesPositions = new Float32Array(particlesCount * 3);
  
  for (let i = 0; i < particlesCount * 3; i += 3) {
    particlesPositions[i] = (Math.random() - 0.5) * 20;
    particlesPositions[i + 1] = (Math.random() - 0.5) * 20;
    particlesPositions[i + 2] = (Math.random() - 0.5) * 20;
  }

  return (
    <>
      {/* Stars Background - Fixed with proper parameters */}
      <Stars 
        radius={300}
        depth={100}
        count={7000}
        factor={6}
        saturation={0.5}
        fade
        speed={2}
      />
      
      {/* Fog effect for depth */}
      <fog attach="fog" args={['#0a0e17', 10, 50]} />
      
      {/* Main Sun */}
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        <Sphere args={[1.2, 64, 64]} position={[0, 0, -15]}>
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FF6B00"
            emissiveIntensity={0.8}
            roughness={0.2}
            metalness={0.8}
          />
          <pointLight intensity={2} color="#FFD700" distance={30} />
        </Sphere>
        
        {/* Sun Glow */}
        <Sphere args={[1.5, 32, 32]} position={[0, 0, -15]}>
          <meshBasicMaterial
            color="#FF9500"
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </Sphere>
      </Float>

      {/* Orbiting Planets */}
      <group ref={groupRef}>
        {/* Planet 1 */}
        <Float speed={1.5} rotationIntensity={0.5}>
          <Sphere args={[0.4, 32, 32]} position={[5, 2, -10]}>
            <meshStandardMaterial
              color="#1cb3ff"
              emissive="#0088cc"
              emissiveIntensity={0.3}
              roughness={0.5}
            />
          </Sphere>
          <Ring args={[0.6, 0.65, 32]} position={[5, 2, -10]} rotation={[Math.PI / 4, 0, 0]}>
            <meshBasicMaterial color="#1cb3ff" transparent opacity={0.3} side={THREE.DoubleSide} />
          </Ring>
        </Float>

        {/* Planet 2 */}
        <Float speed={2} rotationIntensity={0.3}>
          <Sphere args={[0.6, 32, 32]} position={[-6, -1, -12]}>
            <meshStandardMaterial
              color="#ff6b8b"
              emissive="#ff2e5d"
              emissiveIntensity={0.2}
              roughness={0.6}
            />
          </Sphere>
        </Float>

        {/* Planet 3 */}
        <Float speed={1} rotationIntensity={0.4}>
          <Sphere args={[0.3, 32, 32]} position={[3, -3, -8]}>
            <meshStandardMaterial
              color="#52dd38"
              emissive="#2bb120"
              emissiveIntensity={0.4}
              roughness={0.4}
            />
          </Sphere>
        </Float>
      </group>

      {/* Floating Particles System - Fixed */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlesPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          sizeAttenuation={true}
          color="#FFFFFF"
          transparent={true}
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Orbiting Satellites */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Float key={i} speed={0.5 + Math.random() * 0.5}>
          <Torus 
            args={[0.08, 0.02, 8, 24]} 
            position={[
              Math.cos(i * Math.PI / 4) * 8,
              Math.sin(i * Math.PI / 4) * 8,
              -10 + Math.sin(i) * 2
            ]}
          >
            <meshStandardMaterial
              color={i % 2 === 0 ? "#FF9A23" : "#1cb3ff"}
              emissive={i % 2 === 0 ? "#FF9A23" : "#1cb3ff"}
              emissiveIntensity={0.5}
              metalness={0.9}
              roughness={0.1}
            />
          </Torus>
        </Float>
      ))}

      {/* Floating Tech Elements */}
      <group position={[0, 0, -5]}>
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh 
            key={i} 
            position={[
              Math.cos(i * Math.PI / 6) * 4,
              Math.sin(i * Math.PI / 6) * 4,
              Math.sin(i) * 2
            ]}
            rotation={[Math.PI / 4, Math.PI / 4, 0]}
          >
            <octahedronGeometry args={[0.1, 0]} />
            <meshStandardMaterial
              color="#00D4FF"
              emissive="#0099FF"
              emissiveIntensity={0.3}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}

// Enhanced API login function with better error handling
async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const loginData = {
    email: email,
    password: password
  };

  console.log(`Trying endpoint: http://162.141.0.9/raj_communication/api/login.php`);
  
  try {
    const response = await fetch("http://162.141.0.9/raj_communication/api/login.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(loginData)
    });

    if (response.ok) {
      const data: LoginResponse = await response.json();
      console.log("Login response:", data);
      return data;
    } else {
      throw new Error("Invalid email or password");
    }
  } catch (error) {
    console.error(`Error with API:`, error);
    throw new Error("Invalid email or password");
  }
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");
  const [redirectingTo, setRedirectingTo] = useState<'user' | 'admin' | null>(null);
  const redirectTimeoutRef = useRef<number | null>(null);

  const clearErrors = () => {
    setLoginError("");
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    clearErrors();
    setShake(false);
    
    if (!email || !password) {
      setLoginError("Please enter both email and password");
      setShake(true);
      setIsLoading(false);
      setTimeout(() => setShake(false), 500);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLoginError("Please enter a valid email address");
      setShake(true);
      setIsLoading(false);
      setTimeout(() => setShake(false), 500);
      return;
    }

    try {
      const data = await apiLogin(email, password);
      
      if (data.success && data.token) {
        setSuccess(true);
        
        // Determine user role from API response
        const userRole = data.user?.role || data.role || 'user';
        
        // Store authentication data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('token', data.token);
        if (data.user) {
          localStorage.setItem('userData', JSON.stringify(data.user));
        }
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', userRole);
        
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        
        // Show success state, then notify App once so routing happens only once.
        const targetRole = userRole === 'admin' ? 'admin' : 'user';
        setRedirectingTo(targetRole);

        if (redirectTimeoutRef.current) {
          window.clearTimeout(redirectTimeoutRef.current);
        }

        redirectTimeoutRef.current = window.setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(targetRole);
          } else {
            const targetPath = '/admin-dashboard';
            window.location.href = targetPath;
          }
        }, 1500);
      } else {
        // Show the exact error message from API
        const errorMsg = data.message || "Invalid email or password";
        setLoginError(errorMsg);
        
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      
      // Show simple error message for all errors
      setLoginError("Invalid email or password");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
    
    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // Function to get role icon
  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'admin': return <FiShield />;
      case 'user': return <FiTool />;
      default: return <FiUsers />;
    }
  };

  // Function to get role color
  const getRoleColor = (role: string) => {
    switch(role) {
      case 'admin': return '#667eea';
      case 'user': return '#52dd38';
      default: return '#FFD700';
    }
  };

  return (
    <div className="login-container">
      <div className="canvas-container">
        <Canvas 
          camera={{ position: [0, 0, 10], fov: 60 }}
          gl={{ 
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
          }}
          dpr={[1, 2]}
        >
          <color attach="background" args={["#0a0e17"]} />
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#FFD700" />
          <pointLight position={[-10, -10, 5]} intensity={0.5} color="#1cb3ff" />
          
          <CosmicBackground />
          
          <OrbitControls 
            enableZoom={false}
            enablePan={false}
            enableRotate={true}
            autoRotate={true}
            autoRotateSpeed={0.3}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 2}
            rotateSpeed={0.5}
          />
        </Canvas>
      </div>

      {/* Centered Login Card */}
      <div className="login-card-wrapper">
        <motion.div 
          className="login-card"
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, type: "spring", bounce: 0.3 }}
        >
          {/* Logo Container */}
          <motion.div 
            className="logo-container"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            {/* Company Logo */}
            <img 
              src={sunLogo} 
              alt="Raj Communication" 
              className="logo-image"
            />
            <motion.div 
              className="logo-glow"
              animate={{ 
                scale: [1, 1.4, 1],
                opacity: [0.5, 0.9, 0.5]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </motion.div>

          <motion.h1 
            className="title"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="company-name">Raj Communication</span>
          </motion.h1>
          
          <motion.p 
            className="login-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Sign in to your account
          </motion.p>

          <form onSubmit={handleLogin} className={`login-form ${shake ? 'shake' : ''}`} autoComplete="off">
            <motion.div 
              className="input-group"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="input-wrapper">
                <FiUser className="input-icon" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEmail(e.target.value);
                    if (loginError) setLoginError("");
                  }}
                  required
                  className="login-input"
                  autoComplete="off"
                />
              </div>
            </motion.div>

            <motion.div 
              className="input-group"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="input-wrapper">
                <FiLock className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setPassword(e.target.value);
                    if (loginError) setLoginError("");
                  }}
                  required
                  className="login-input"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </motion.div>

            {/* Show login error message */}
            {loginError && (
              <motion.div 
                className="login-error-message"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <FiAlertCircle className="error-icon" />
                <span>{loginError}</span>
              </motion.div>
            )}

            <motion.div 
              className="form-options"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRememberMe(e.target.checked)}
                  className="checkbox-input"
                />
                <span className="checkbox-custom">
                  {rememberMe && <div className="checkbox-checkmark" />}
                </span>
                <span className="checkbox-label">Remember me</span>
              </label>
            </motion.div>

            <AnimatePresence>
              {success ? (
                <motion.div
                  className="success-container"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <div className="success-icon">
                    {redirectingTo && getRoleIcon(redirectingTo)}
                  </div>
                  <div className="success-text">
                    <h3>Login Successful!</h3>
                    <p>
                      Redirecting to {redirectingTo === 'admin' ? 'Admin' : 'User'} Dashboard...
                    </p>
                    <p className="role-indicator">
                      Role: <span style={{ 
                        backgroundColor: redirectingTo ? getRoleColor(redirectingTo) : '#52dd38'
                      }}>
                        {redirectingTo?.toUpperCase()}
                      </span>
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  type="submit"
                  className="btn-login"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner"></span>
                      <span className="btn-text">Signing In...</span>
                    </>
                  ) : (
                    <>
                      <FiLogIn className="btn-icon" />
                      <span className="btn-text">Sign In</span>
                    </>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </form>

          <motion.div 
            className="footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <p className="footer-text">© 2026 Jeevan Larosh. All rights reserved.</p>
          </motion.div>
        </motion.div>
      </div>

      <div className="particles-overlay">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="particle"
            animate={{
              y: [0, -1000],
              x: [0, Math.sin(i) * 100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <style>{`
        .login-container {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }

        .canvas-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .login-card-wrapper {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 100;
          width: 100%;
          max-width: 500px;
          padding: 0 20px;
        }

        .login-card {
          background-color: rgba(10, 14, 23, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 30px;
          padding: 30px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Logo Container */
        .logo-container {
          position: relative;
          width: 150px;
          height: 150px;
          margin: 0 auto 20px;
        }

        .logo-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 0 25px rgba(255, 215, 0, 0.7));
          position: relative;
          z-index: 2;
        }

        .logo-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 170px;
          height: 170px;
          background: radial-gradient(circle, rgba(255,215,0,0.4) 0%, rgba(255,215,0,0) 70%);
          border-radius: 50%;
          z-index: 1;
        }

        /* Title */
        .title {
          text-align: center;
          margin-bottom: 15px;
          font-size: 2.2rem;
          color: #ffffff;
          font-weight: bold;
        }

        .company-name {
          font-weight: 700;
          font-size: 2.5rem;
          background: linear-gradient(135deg, #ffffff 0%, #cccccc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: inline-block;
        }

        .login-subtitle {
          text-align: center;
          color: #ccc;
          margin-bottom: 30px;
          font-size: 1rem;
          letter-spacing: 0.5px;
        }

        /* Input Fields */
        .input-wrapper {
          position: relative;
          margin-bottom: 20px;
        }

        .input-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #FFD700;
          font-size: 1.2rem;
          z-index: 1;
        }

        .login-input {
          width: 100%;
          padding: 15px 15px 15px 45px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: white;
          font-size: 1rem;
          outline: none;
          transition: all 0.3s ease;
        }

        .login-input:focus {
          border-color: #FFD700;
          box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.1);
        }

        .login-input.error {
          border-color: #ff4757;
        }

        .login-input.error:focus {
          box-shadow: 0 0 0 2px rgba(255, 71, 87, 0.1);
        }

        .password-toggle {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #aaa;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 5px;
          transition: color 0.3s ease;
        }

        .password-toggle:hover {
          color: #FFD700;
        }

        /* Error Message */
        .login-error-message {
          color: #ff4757;
          font-size: 0.9rem;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background: rgba(255, 71, 87, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(255, 71, 87, 0.2);
        }

        .error-icon {
          font-size: 1rem;
          flex-shrink: 0;
        }

        /* Checkbox */
        .checkbox-container {
          display: flex;
          align-items: center;
          cursor: pointer;
        }

        .checkbox-input {
          display: none;
        }

        .checkbox-custom {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 5px;
          margin-right: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          background: transparent;
        }

        .checkbox-checkmark {
          width: 10px;
          height: 10px;
          background-color: black;
          border-radius: 2px;
        }

        .checkbox-container input:checked + .checkbox-custom {
          background: #FFD700;
        }

        .checkbox-label {
          color: #aaa;
          font-size: 0.9rem;
        }

        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        /* Login Button */
        .btn-login {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #FFD700 0%, #FF8C00 100%);
          border: none;
          border-radius: 10px;
          color: black;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s ease;
        }

        .btn-login:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(255, 215, 0, 0.3);
        }

        .btn-login:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid black;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Success Container */
        .success-container {
          background: rgba(82, 221, 56, 0.1);
          border: 1px solid rgba(82, 221, 56, 0.3);
          border-radius: 15px;
          padding: 20px;
          text-align: center;
          margin-bottom: 20px;
        }

        .success-icon {
          font-size: 2.5rem;
          color: #52dd38;
          margin-bottom: 15px;
        }

        .success-text h3 {
          margin: 0 0 10px 0;
          color: #52dd38;
        }

        .success-text p {
          margin: 0 0 15px 0;
          color: #aaa;
        }

        .role-indicator {
          margin: 0;
          color: #aaa;
        }

        .role-indicator span {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          color: white;
          font-size: 0.8rem;
          font-weight: bold;
          margin-left: 5px;
        }

        /* Footer */
        .footer {
          margin-top: 25px;
          text-align: center;
          color: #666;
          font-size: 0.8rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 20px;
        }

        /* Particles Overlay */
        .particles-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }

        .particle {
          position: absolute;
          width: 2px;
          height: 100px;
          background: linear-gradient(to bottom, transparent, #FFD700, transparent);
          left: calc(var(--random-position) * 100%);
          top: 100%;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .login-card-wrapper {
            max-width: 400px;
            padding: 0 15px;
          }

          .login-card {
            padding: 25px;
            border-radius: 25px;
          }

          .logo-container {
            width: 120px;
            height: 120px;
            margin-bottom: 15px;
          }

          .logo-glow {
            width: 140px;
            height: 140px;
          }

          .title {
            font-size: 1.8rem;
          }

          .company-name {
            font-size: 2rem;
          }

          .login-subtitle {
            font-size: 0.9rem;
            margin-bottom: 25px;
          }

          .login-input {
            padding: 14px 14px 14px 40px;
            font-size: 0.95rem;
          }

          .input-icon {
            font-size: 1.1rem;
            left: 12px;
          }

          .btn-login {
            padding: 14px;
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .login-card-wrapper {
            max-width: 90%;
            padding: 0 10px;
          }

          .login-card {
            padding: 20px;
            border-radius: 20px;
          }

          .logo-container {
            width: 100px;
            height: 100px;
            margin-bottom: 10px;
          }

          .logo-glow {
            width: 120px;
            height: 120px;
          }

          .title {
            font-size: 1.5rem;
          }

          .company-name {
            font-size: 1.7rem;
          }

          .login-subtitle {
            font-size: 0.85rem;
            margin-bottom: 20px;
          }

          .login-input {
            padding: 12px 12px 12px 35px;
            font-size: 0.9rem;
          }

          .input-icon {
            font-size: 1rem;
            left: 10px;
          }

          .password-toggle {
            font-size: 1rem;
            right: 10px;
          }

          .btn-login {
            padding: 12px;
            font-size: 0.95rem;
          }

          .form-options {
            margin-bottom: 20px;
          }

          .checkbox-custom {
            width: 18px;
            height: 18px;
          }

          .checkbox-checkmark {
            width: 8px;
            height: 8px;
          }

          .footer {
            margin-top: 20px;
            font-size: 0.75rem;
          }
        }

        @media (max-width: 320px) {
          .login-card-wrapper {
            max-width: 95%;
          }

          .logo-container {
            width: 80px;
            height: 80px;
          }

          .logo-glow {
            width: 100px;
            height: 100px;
          }

          .title {
            font-size: 1.3rem;
          }

          .company-name {
            font-size: 1.5rem;
          }
        }

        /* Tablet Optimizations */
        @media (min-width: 769px) and (max-width: 1024px) {
          .login-card-wrapper {
            max-width: 450px;
          }

          .logo-container {
            width: 140px;
            height: 140px;
          }

          .logo-glow {
            width: 160px;
            height: 160px;
          }

          .title {
            font-size: 2rem;
          }

          .company-name {
            font-size: 2.2rem;
          }
        }

        /* Large Desktop */
        @media (min-width: 1440px) {
          .login-card-wrapper {
            max-width: 550px;
          }

          .logo-container {
            width: 180px;
            height: 180px;
          }

          .logo-glow {
            width: 200px;
            height: 200px;
          }

          .title {
            font-size: 2.5rem;
          }

          .company-name {
            font-size: 3rem;
          }

          .login-input {
            padding: 18px 18px 18px 50px;
            font-size: 1.1rem;
          }
        }

        /* Animations */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        
        .shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

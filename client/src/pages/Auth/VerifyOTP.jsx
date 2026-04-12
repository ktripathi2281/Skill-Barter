import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { ArrowLeftRight, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import './Auth.css';

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const userId = location.state?.userId;
  const email = location.state?.email;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  // Redirect if no userId was passed
  useEffect(() => {
    if (!userId) {
      navigate('/register');
    }
  }, [userId, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().slice(0, 6);
    if (/^\d+$/.test(pasted)) {
      const newOtp = [...otp];
      for (let i = 0; i < pasted.length; i++) {
        newOtp[i] = pasted[i];
      }
      setOtp(newOtp);
      const focusIndex = Math.min(pasted.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { userId, otp: otpString });

      // OTP verified — store tokens and log user in
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      const userData = {
        _id: data._id,
        name: data.name,
        email: data.email,
        location: data.location,
      };
      localStorage.setItem('user', JSON.stringify(userData));

      // Force a page reload to pick up the new auth state
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    setError('');

    try {
      await api.post('/auth/resend-otp', { userId });
      setResendCooldown(60); // 60 second cooldown
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <div className="auth-page">
      <div className="auth-container animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo">
            <ShieldCheck size={32} />
          </div>
          <h1>Verify Email</h1>
          <p className="text-muted">
            We sent a 6-digit code to<br />
            <strong style={{ color: 'var(--color-text)' }}>{email}</strong>
          </p>
        </div>

        {error && (
          <div className="auth-error" id="verify-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="otp-inputs" id="otp-inputs">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className="otp-input"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-btn"
            disabled={loading}
            id="btn-verify-otp"
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>

        <div className="otp-resend">
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            Didn't receive the code?{' '}
            {resendCooldown > 0 ? (
              <span style={{ color: 'var(--color-text-muted)' }}>
                Resend in {resendCooldown}s
              </span>
            ) : (
              <button
                className="btn-link"
                onClick={handleResend}
                disabled={resendLoading}
                id="btn-resend-otp"
              >
                <RefreshCw size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                {resendLoading ? 'Sending...' : 'Resend OTP'}
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;

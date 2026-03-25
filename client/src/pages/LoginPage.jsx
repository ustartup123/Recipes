import { useEffect, useRef, useCallback } from 'react';
import { GiCookingPot } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, clientId } = useAuth();
  const googleBtnRef = useRef(null);
  const initialized = useRef(false);

  const handleCredentialResponse = useCallback(async (response) => {
    try {
      await login(response.credential);
      toast.success('!התחברת בהצלחה');
    } catch {
      toast.error('ההתחברות נכשלה, נסה שוב');
    }
  }, [login]);

  useEffect(() => {
    if (!clientId || initialized.current) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        ux_mode: 'popup',
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'signin_with',
        shape: 'pill',
        locale: 'he',
      });

      initialized.current = true;
    };

    // Load the Google Identity Services script if not already loaded
    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
    }
  }, [clientId, handleCredentialResponse]);

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">
          <GiCookingPot />
        </div>
        <h1>המתכונים שלי</h1>
        <p>התחבר עם חשבון Google כדי לשמור ולנהל את המתכונים שלך</p>
        <div className="google-btn-wrapper" ref={googleBtnRef}>
          {!clientId && <span className="login-loading">טוען...</span>}
        </div>
      </div>
    </div>
  );
}

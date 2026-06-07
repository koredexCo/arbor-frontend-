import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GitBranch, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getAccessToken } from '../services/api';

const API = import.meta.env.VITE_API_URL;

export function JoinPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const token = params.get('token');

  const [invite, setInvite] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'done' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invite link — no token found.');
      return;
    }
    fetch(`${API}/invites/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.detail) throw new Error(data.detail);
        setInvite(data);
        setStatus('ready');
      })
      .catch(e => {
        setStatus('error');
        setMessage(e.message);
      });
  }, [token]);

  const acceptInvite = async () => {
    if (!session) {
      navigate(`/?redirect=/join?token=${token}`);
      return;
    }
    setStatus('accepting');
    try {
      const authToken = await getAccessToken();
      const res = await fetch(`${API}/invites/${token}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to accept invite');
      setStatus('done');
      setMessage(`You've joined the project as ${data.role}!`);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (e: any) {
      setStatus('error');
      setMessage(e.message);
    }
  };

  if (authLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 size={32} className="text-[#a0a0a0] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
      <div className="bg-[#111111] rounded-2xl p-10 w-[440px] max-w-full border border-[#1e1e1e] shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#666666] to-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-none">
          <GitBranch size={26} className="text-white" />
        </div>

        {status === 'ready' && invite && (
          <>
            <h1 className="text-xl font-bold text-white mb-2">You're invited!</h1>
            <p className="text-[#888888] text-sm mb-1">
              Join <span className="text-white font-semibold">{invite.project_name}</span>
            </p>
            <p className="text-[#555555] text-xs mb-8">
              Role: <span className="text-[#a0a0a0] capitalize">{invite.role}</span>
            </p>
            {!session ? (
              <>
                <p className="text-[#888888] text-sm mb-4">
                  Sign in or create an account to accept this invite.
                </p>
                <button
                  onClick={() => navigate(`/?redirect=/join?token=${token}`)}
                  className="btn-primary w-full"
                >
                  Sign In to Accept
                </button>
              </>
            ) : (
              <button onClick={acceptInvite} className="btn-primary w-full">
                Accept Invite
              </button>
            )}
          </>
        )}

        {status === 'accepting' && (
          <>
            <Loader2 size={32} className="text-[#a0a0a0] animate-spin mx-auto mb-4" />
            <p className="text-[#888888]">Joining project...</p>
          </>
        )}

        {status === 'done' && (
          <>
            <CheckCircle size={40} className="text-white mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">Welcome aboard!</h2>
            <p className="text-[#888888] text-sm">{message}</p>
            <p className="text-[#444444] text-xs mt-2">Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={40} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">Invite Error</h2>
            <p className="text-[#888888] text-sm">{message}</p>
            <button onClick={() => navigate('/')} className="btn-secondary mt-6">
              Go Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}

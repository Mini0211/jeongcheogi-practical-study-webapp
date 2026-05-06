import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://lumi-storage.taild1716c.ts.net/jcg';

async function api(path, options = {}, token = '') {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text || `HTTP ${res.status}` }; }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('주인님');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteAttempts, setInviteAttempts] = useState(0);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (mode !== 'register') { setUsernameStatus(null); return; }
    const value = username.trim();
    if (!value) { setUsernameStatus(null); return; }
    if (!/^[a-zA-Z0-9_.@-]{3,64}$/.test(value)) {
      setUsernameStatus({ tone: 'bad', text: '아이디는 3자 이상 영문/숫자/._@-만 가능합니다.' });
      return;
    }
    setUsernameStatus({ tone: 'checking', text: '아이디 확인 중...' });
    const timer = setTimeout(async () => {
      try {
        const data = await api(`/auth/check-username?username=${encodeURIComponent(value)}`);
        setUsernameStatus(data.available ? { tone: 'good', text: '사용 가능한 아이디 입니다.' } : { tone: 'bad', text: '중복 아이디 입니다.' });
      } catch (err) {
        setUsernameStatus({ tone: 'bad', text: err.message || '아이디 확인 실패' });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [mode, username]);
  async function submit(e) {
    e.preventDefault();
    if (mode === 'register' && usernameStatus?.tone !== 'good') {
      setMsg('사용 가능한 아이디인지 먼저 확인해주세요.');
      return;
    }
    setMsg('처리 중...');
    try {
      const body = mode === 'register' ? { username, nickname, password, invite_code: inviteCode } : { username, password };
      const data = await api(mode === 'register' ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(body) });
      localStorage.setItem('jcg_token', data.token);
      onLogin(data.token, data.user);
    } catch (err) { setMsg(err.message); }
  }
  function openSignupInvite() {
    setInviteCode('');
    setInviteAttempts(0);
    setInviteOpen(true);
    setMsg('회원가입 초대코드를 먼저 확인해주세요.');
  }
  async function verifyInvite() {
    const code = inviteCode;
    if (!code) { setMsg('초대코드를 입력해주세요.'); return; }
    setMsg('초대코드 확인 중...');
    try {
      await api('/auth/verify-invite', { method: 'POST', body: JSON.stringify({ invite_code: code }) });
      setInviteOpen(false);
      setMode('register');
      setMsg('초대코드 확인 완료. 회원가입 정보를 입력한 뒤 완료를 눌러주세요.');
    } catch (err) {
      const next = inviteAttempts + 1;
      setInviteAttempts(next);
      setInviteCode('');
      if (next >= 3) {
        setInviteOpen(false);
        setMsg('초대코드 3회 오류입니다. 처음이면 회원가입을 다시 눌러 재시도해주세요.');
      } else {
        setMsg(`초대코드가 맞지 않습니다. 남은 기회: ${3 - next}회`);
      }
    }
  }
  function switchToLogin() {
    setMode('login');
    setInviteCode('');
    setInviteAttempts(0);
    setInviteOpen(false);
    setUsernameStatus(null);
    setMsg('');
  }
  return <section className="auth card">
    <h1>정처기 실기 공부앱</h1>
    <p>개인 학습 기록, 오답노트, 변형문제 준비용 MVP입니다.</p>
    <form onSubmit={submit}>
      <label>아이디 또는 이메일</label>
      <div className="username-row">
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="study-id" />
        {mode === 'register' && usernameStatus && <span className={`username-status ${usernameStatus.tone}`}>{usernameStatus.text}</span>}
      </div>
      {mode === 'register' && <><label>닉네임</label><input value={nickname} onChange={e => setNickname(e.target.value)} /></>}
      <label>비밀번호</label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8자 이상" />
      <button className="primary">{mode === 'register' ? '완료' : '로그인'}</button>
    </form>
    {mode === 'register'
      ? <button className="link" onClick={switchToLogin}>이미 계정이 있어요</button>
      : <button className="signup-link" onClick={openSignupInvite}>처음이면 회원가입</button>}
    {msg && <p className="msg">{msg}</p>}
    {inviteOpen && <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal card">
        <h2>회원가입 초대코드</h2>
        <p>초대코드는 대소문자를 구분합니다. 코드 확인 후 회원가입 화면으로 넘어갑니다.</p>
        <input autoFocus value={inviteCode} onChange={e => setInviteCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); verifyInvite(); } }} placeholder="초대코드 입력" />
        <p className="meta">남은 기회: {3 - inviteAttempts}회</p>
        <div className="actions">
          <button className="primary" onClick={(e) => { e.preventDefault(); verifyInvite(); }}>코드 확인</button>
          <button onClick={(e) => { e.preventDefault(); setInviteOpen(false); setInviteCode(''); setInviteAttempts(0); setMsg('초대코드 입력이 취소되었습니다.'); }}>취소</button>
        </div>
      </div>
    </div>}
  </section>;
}

function Dashboard({ token, user, onLogout }) {
  const [health, setHealth] = useState(null);
  const [me, setMe] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [wrong, setWrong] = useState([]);
  const categories = useMemo(() => [...new Set(questions.map(q => q.category))], [questions]);

  async function load() {
    setHealth(await api('/health'));
    setMe(await api('/me', {}, token));
    const q = await api('/questions?limit=20', {}, token);
    setQuestions(q.questions);
    setCurrent(q.questions[0] || null);
    const w = await api('/wrong-notes', {}, token);
    setWrong(w.wrong_notes || []);
  }
  useEffect(() => { load().catch(e => setResult({ feedback: e.message })); }, []);

  async function submitAnswer() {
    if (!current) return;
    try {
      setResult({ feedback: '채점 중입니다...' });
      const data = await api('/attempts', { method: 'POST', body: JSON.stringify({ question_id: Number(current.id), answer }) }, token);
      setResult(data.result);
      setAnswer('');
      const [m, w] = await Promise.all([api('/me', {}, token), api('/wrong-notes', {}, token)]);
      setMe(m); setWrong(w.wrong_notes || []);
    } catch (err) {
      setResult({ correct: false, feedback: `채점 오류: ${err.message}`, explanation: '잠시 후 다시 시도하거나 로그인 상태를 확인해주세요.' });
    }
  }

  return <main className="wrap">
    <header className="hero">
      <div>
        <p className="eyebrow">Jeongcheogi Practical Study</p>
        <h1>정보처리기사 실기 공부앱</h1>
        <p>{user?.nickname || '주인님'} 전용 학습 대시보드입니다.</p>
      </div>
      <button onClick={onLogout}>로그아웃</button>
    </header>

    <section className="grid stats">
      <div className="card"><b>API</b><span>{health?.ok ? '정상' : '확인 중'}</span></div>
      <div className="card"><b>문제 수</b><span>{health?.questions ?? '-'}</span></div>
      <div className="card"><b>풀이</b><span>{me?.stats?.total ?? 0}회</span></div>
      <div className="card"><b>정답</b><span>{me?.stats?.correct ?? 0}회</span></div>
    </section>

    <section className="grid main-grid">
      <div className="card">
        <h2>문제 풀이</h2>
        <div className="chips">{categories.map(c => <span className="chip" key={c}>{c}</span>)}</div>
        {current ? <>
          <p className="meta">#{current.id} · {current.category} · {current.type} · {current.difficulty}</p>
          <h3>{current.prompt}</h3>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="답안을 입력하세요" />
          <div className="actions"><button className="primary" onClick={submitAnswer}>채점하기</button></div>
          {result && <div className={result.correct ? 'result good' : 'result bad'}><b>{result.feedback}</b><p>{result.explanation}</p></div>}
        </> : <p>문제가 없습니다.</p>}
      </div>

      <div className="card">
        <h2>문제 목록</h2>
        <ul className="question-list">{questions.map(q => <li key={q.id}><button onClick={() => { setCurrent(q); setResult(null); setAnswer(''); }}>{q.category} · {q.prompt.slice(0, 38)}...</button></li>)}</ul>
      </div>
    </section>

    <section className="card">
      <h2>오답노트</h2>
      {wrong.length ? <ul className="wrong-list">{wrong.map(w => <li key={w.id}><b>{w.category}</b> {w.prompt}<small>{w.reason}</small></li>)}</ul> : <p>아직 오답이 없습니다.</p>}
    </section>
  </main>;
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('jcg_token') || '');
  const [user, setUser] = useState(null);
  function logout() { localStorage.removeItem('jcg_token'); setToken(''); setUser(null); }
  if (!token) return <Auth onLogin={(t, u) => { setToken(t); setUser(u); }} />;
  return <Dashboard token={token} user={user} onLogout={logout} />;
}

createRoot(document.getElementById('root')).render(<App />);

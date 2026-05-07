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
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteAttempts, setInviteAttempts] = useState(0);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [nicknameStatus, setNicknameStatus] = useState(null);
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
  useEffect(() => {
    if (mode !== 'register') { setNicknameStatus(null); return; }
    const value = nickname.trim();
    if (!value) { setNicknameStatus(null); return; }
    if (value.length > 40) {
      setNicknameStatus({ tone: 'bad', text: '닉네임은 40자 이하로 입력해주세요.' });
      return;
    }
    setNicknameStatus({ tone: 'checking', text: '닉네임 확인 중...' });
    const timer = setTimeout(async () => {
      try {
        const data = await api(`/auth/check-nickname?nickname=${encodeURIComponent(value)}`);
        setNicknameStatus(data.available ? { tone: 'good', text: '사용 가능한 닉네임 입니다.' } : { tone: 'bad', text: '중복 닉네임 입니다.' });
      } catch (err) {
        setNicknameStatus({ tone: 'bad', text: err.message || '닉네임 확인 실패' });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [mode, nickname]);
  async function submit(e) {
    e.preventDefault();
    if (mode === 'register' && usernameStatus?.tone !== 'good') {
      setMsg('사용 가능한 아이디인지 먼저 확인해주세요.');
      return;
    }
    if (mode === 'register' && nicknameStatus?.tone !== 'good') {
      setMsg('사용 가능한 닉네임인지 먼저 확인해주세요.');
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
    setNicknameStatus(null);
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
      {mode === 'register' && <><label>닉네임</label><div className="username-row"><input value={nickname} onChange={e => setNickname(e.target.value)} />{nicknameStatus && <span className={`username-status ${nicknameStatus.tone}`}>{nicknameStatus.text}</span>}</div></>}
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

const QUESTION_TYPES = [
  { value: '', label: '전체 유형' },
  { value: 'short_answer', label: '단답형' },
  { value: 'blank', label: '빈칸형' },
  { value: 'sql', label: 'SQL형' },
  { value: 'code_output', label: '코드 출력형' },
  { value: 'keyword', label: '키워드형' },
];
const TYPE_LABELS = Object.fromEntries(QUESTION_TYPES.map(t => [t.value, t.label]));

function shuffleItems(items) {
  return [...items].sort(() => Math.random() - 0.5);
}
function buildRandomExam(allQuestions, count = 20) {
  const byType = allQuestions.reduce((acc, q) => {
    (acc[q.type] ||= []).push(q);
    return acc;
  }, {});
  const quotas = { code_output: 7, blank: 5, keyword: 4, short_answer: 3, sql: 1 };
  const picked = [];
  const pickedIds = new Set();
  for (const [type, quota] of Object.entries(quotas)) {
    for (const q of shuffleItems(byType[type] || []).slice(0, quota)) {
      picked.push(q);
      pickedIds.add(q.id);
    }
  }
  if (picked.length < count) {
    for (const q of shuffleItems(allQuestions)) {
      if (picked.length >= count) break;
      if (!pickedIds.has(q.id)) {
        picked.push(q);
        pickedIds.add(q.id);
      }
    }
  }
  return shuffleItems(picked).slice(0, count);
}
function typeSummary(items) {
  const counts = items.reduce((acc, q) => {
    const label = TYPE_LABELS[q.type] || q.type;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([label, count]) => `${label} ${count}`).join(' · ');
}

function examLabel(q) {
  return q?.exam_year && q?.exam_round ? `${q.exam_year}년 ${q.exam_round}회${q.original_no ? ` #${q.original_no}` : ""}` : '연습문제';
}
function codeLangLabel(lang) {
  const labels = { c: 'C', java: 'Java', python: 'Python', sql: 'SQL' };
  return labels[lang] || 'Code';
}
function NoteBlock({ note }) {
  if (!note) return null;
  const lines = note.split('\n');
  return <div className="input-note"><b>보기/조건</b><div className="note-lines">{lines.map((line, idx) => line.trim()
    ? <p key={idx}>{line}</p>
    : <div key={idx} className="note-gap" />)}</div></div>;
}
function ExplanationBlock({ answer, text, loading, error }) {
  if (loading) return <div className="explanation-block"><p>불러오는 중...</p></div>;
  if (error) return <div className="explanation-block"><p>{error}</p></div>;
  const lines = (text || '해설이 아직 없습니다.').split('\n').map(line => line.trim()).filter(Boolean);
  const sections = [];
  let current = { title: '해설', lines: [] };
  const push = () => { if (current.lines.length) sections.push(current); };
  for (const line of lines) {
    const match = line.match(/^(핵심|풀이|정답|주의):\s*(.*)$/);
    if (match) {
      push();
      current = { title: match[1], lines: match[2] ? [match[2]] : [] };
    } else {
      current.lines.push(line);
    }
  }
  push();
  const answerSection = sections.find(section => section.title === '정답');
  const displayAnswer = answer || answerSection?.lines.join(' / ');
  const visibleSections = sections.filter(section => section.title !== '정답');
  return <div className="explanation-block">
    {displayAnswer && <div className="answer-card"><span>정답</span><strong>{displayAnswer}</strong></div>}
    {visibleSections.map((section, idx) => <section className={`ex-section ex-${section.title}`} key={`${section.title}-${idx}`}>
      <h4>{section.title}</h4>
      <div className="ex-lines">{section.lines.map((line, lineIdx) => {
        const step = line.match(/^(\d+)\.\s*(.*)$/);
        return step
          ? <div className="ex-step" key={lineIdx}><span>{step[1]}</span><p>{step[2]}</p></div>
          : <p className="ex-text" key={lineIdx}>{line}</p>;
      })}</div>
    </section>)}
  </div>;
}

function QuestionBody({ question }) {
  const text = question.prompt_text || question.prompt;
  return <>
    <h3>{text}</h3>
    <NoteBlock note={question.input_note} />
    {question.code_block && <div className="code-panel">
      <div className="code-title">{codeLangLabel(question.code_language)}</div>
      <pre><code>{question.code_block}</code></pre>
    </div>}
  </>;
}

function Dashboard({ token, user, onLogout }) {
  const [viewMode, setViewMode] = useState('study');
  const [menuOpen, setMenuOpen] = useState(false);
  const [health, setHealth] = useState(null);
  const [me, setMe] = useState(null);
  const [questionSets, setQuestionSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState('');
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [wrong, setWrong] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [examAnswers, setExamAnswers] = useState({});
  const [examResults, setExamResults] = useState(null);
  const [examMsg, setExamMsg] = useState('');
  const [examSource, setExamSource] = useState('set');
  const categories = useMemo(() => [...new Set(questions.map(q => q.category))], [questions]);

  function applySetParams(params, setValue = selectedSet) {
    if (!setValue) return;
    const [year, round, ...kindParts] = setValue.split('-');
    const kind = kindParts.join('-');
    if (year) params.set('exam_year', year);
    if (round) params.set('exam_round', round);
    if (kind) params.set('source_kind', kind);
  }

  async function load(type = selectedType, setValue = selectedSet) {
    setHealth(await api('/health'));
    setMe(await api('/me', {}, token));
    const sets = await api('/question-sets', {}, token);
    setQuestionSets(sets.sets || []);
    const qs = new URLSearchParams({ limit: '100' });
    applySetParams(qs, setValue);
    if (type) qs.set('type', type);
    const q = await api(`/questions?${qs.toString()}`, {}, token);
    setQuestions(q.questions);
    setCurrent(q.questions[0] || null);
    setAnswer('');
    setResult(null);
    setExplanation(null);
    setExamAnswers({});
    setExamResults(null);
    setExamMsg('');
    const w = await api('/wrong-notes', {}, token);
    setWrong(w.wrong_notes || []);
  }
  useEffect(() => { load('', '').catch(e => setResult({ feedback: e.message })); }, []);

  async function changeSet(value) {
    setSelectedSet(value);
    if (value === 'random-20') {
      await startRandomExam();
      return;
    }
    setExamSource('set');
    try { await load(selectedType, value); }
    catch (e) { setResult({ correct: false, feedback: '문제 세트 조회 오류: ' + e.message }); }
  }
  async function changeType(type) {
    setSelectedType(type);
    setExamSource('set');
    try { await load(type, selectedSet); }
    catch (e) { setResult({ correct: false, feedback: '유형 조회 오류: ' + e.message }); }
  }
  async function startRandomExam() {
    try {
      const data = await api('/questions?limit=200', {}, token);
      const pool = data.questions || [];
      const picked = buildRandomExam(pool, 20);
      setQuestions(picked);
      setCurrent(picked[0] || null);
      setExamAnswers({});
      setExamResults(null);
      setExamSource('random');
      setSelectedSet('random-20');
      setSelectedType('');
      setExamMsg(`랜덤 모의고사 20문항을 생성했습니다. 유형 구성: ${typeSummary(picked)}`);
    } catch (e) {
      setExamMsg('랜덤 모의고사 생성 오류: ' + e.message);
    }
  }

  function selectQuestion(q) {
    setCurrent(q);
    setResult(null);
    setExplanation(null);
    setAnswer('');
  }

  async function submitAnswer() {
    if (!current) return;
    try {
      setResult({ feedback: '채점 중입니다...' });
      const data = await api('/attempts', { method: 'POST', body: JSON.stringify({ question_id: Number(current.id), answer }) }, token);
      setResult(data.result);
      const [m, w] = await Promise.all([api('/me', {}, token), api('/wrong-notes', {}, token)]);
      setMe(m); setWrong(w.wrong_notes || []);
    } catch (err) {
      setResult({ correct: false, feedback: `채점 오류: ${err.message}`, explanation: '잠시 후 다시 시도하거나 로그인 상태를 확인해주세요.' });
    }
  }

  async function showExplanation() {
    if (!current) return;
    try {
      setExplanation({ loading: true });
      const data = await api(`/questions/${current.id}/explanation`, {}, token);
      setExplanation(data);
    } catch (err) {
      setExplanation({ error: err.message });
    }
  }

  function setExamAnswer(id, value) {
    setExamAnswers(prev => ({ ...prev, [id]: value }));
  }
  async function submitExam() {
    if (!questions.length) return;
    setExamMsg('시험 답안을 제출하고 채점 중입니다...');
    const results = [];
    for (const q of questions) {
      const userAnswer = (examAnswers[q.id] || '').trim();
      if (!userAnswer) {
        results.push({ question: q, userAnswer, correct: false, feedback: '미답입니다.', explanation: '' });
        continue;
      }
      try {
        const data = await api('/attempts', { method: 'POST', body: JSON.stringify({ question_id: Number(q.id), answer: userAnswer }) }, token);
        results.push({ question: q, userAnswer, ...data.result });
      } catch (err) {
        results.push({ question: q, userAnswer, correct: false, feedback: '채점 오류: ' + err.message, explanation: '' });
      }
    }
    setExamResults(results);
    setExamMsg('제출 완료');
    const [m, w] = await Promise.all([api('/me', {}, token), api('/wrong-notes', {}, token)]);
    setMe(m); setWrong(w.wrong_notes || []);
  }

  function navigate(view) {
    setViewMode(view);
    setMenuOpen(false);
  }

  const menuItems = [
    { id: 'study', label: '학습모드', icon: '📚' },
    { id: 'exam', label: '시험모드', icon: '📝' },
    { id: 'wrong', label: '오답노트', icon: '📒' },
  ];
  const activeTitle = menuItems.find(item => item.id === viewMode)?.label || '학습모드';

  const examCorrect = examResults?.filter(r => r.correct).length || 0;
  const examScore = examResults ? Math.round((examCorrect / Math.max(examResults.length, 1)) * 100) : 0;

  return <main className="wrap app-shell">
    <section className="app-content">
      <header className="hero app-header">
        <div>
          <p className="eyebrow">Jeongcheogi Practical Study</p>
          <h1>{activeTitle}</h1>
          <p className="meta">정보처리기사 실기 공부앱</p>
        </div>
        <div className="header-actions">
          <button className="menu-open" onClick={() => setMenuOpen(true)} aria-label="메뉴 열기">☰</button>
        </div>
      </header>

      <section className="grid stats">
        <div className="card"><b>API</b><span>{health?.ok ? '정상' : '확인 중'}</span></div>
        <div className="card"><b>문제 수</b><span>{health?.questions ?? '-'}</span></div>
        <div className="card"><b>풀이</b><span>{me?.stats?.total ?? 0}회</span></div>
        <div className="card"><b>정답</b><span>{me?.stats?.correct ?? 0}회</span></div>
      </section>

      {viewMode !== 'wrong' && <section className="card mode-card">
        <label>문제 세트</label>
        <select value={selectedSet} onChange={e => changeSet(e.target.value)}>
          <option value="">전체 문제</option>
          {questionSets.map(set => <option key={set.value} value={set.value}>{set.label} ({set.question_count}문항)</option>)}
          <option value="random-20">랜덤 모의고사 20문항</option>
        </select>
      </section>}

      {viewMode === 'study' && <>
        <section className="card type-card">
          <div className="type-head"><h2>문제 유형 선택</h2><p className="meta">선택한 유형의 문제만 불러옵니다.</p></div>
          <div className="type-buttons">{QUESTION_TYPES.map(t => <button key={t.value || 'all'} className={selectedType === t.value ? 'type-btn active' : 'type-btn'} onClick={() => changeType(t.value)}>{t.label}</button>)}</div>
        </section>

        <section className="grid main-grid">
          <div className="card">
            <h2>문제 풀이</h2>
            <div className="chips">{categories.map(c => <span className="chip" key={c}>{c}</span>)}</div>
            {current ? <>
              <p className="meta">{examLabel(current)} · #{current.id} · {current.category} · {TYPE_LABELS[current.type] || current.type} · {current.difficulty}</p>
              <QuestionBody question={current} />
              <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="답안을 입력하세요" />
              <div className="actions"><button className="primary" onClick={submitAnswer}>채점하기</button><button onClick={showExplanation}>해설</button></div>
              {result && <div className={result.correct ? 'result good' : 'result bad'}><b>{result.feedback}</b></div>}
              {explanation && <div className="explain-box"><b>해설</b><ExplanationBlock answer={explanation.answer} text={explanation.explanation} loading={explanation.loading} error={explanation.error} /></div>}
            </> : <p>선택한 조건에 해당하는 문제가 없습니다.</p>}
          </div>

          <div className="card">
            <h2>문제 목록</h2>
            <ul className="question-list">{questions.map(q => <li key={q.id}><button onClick={() => selectQuestion(q)}><b>{examLabel(q)}</b> · {TYPE_LABELS[q.type] || q.type} · {q.category}<br />{(q.prompt_text || q.prompt).slice(0, 38)}...</button></li>)}</ul>
          </div>
        </section>
      </>}

      {viewMode === 'exam' && <section className="card exam-card">
        <div className="exam-head"><div><h2>시험 모드</h2><p className="meta">정답과 해설은 제출 전까지 숨깁니다. {examSource === 'random' ? '랜덤 모의고사' : '현재 선택 세트'} 기준 {questions.length}문항입니다.</p></div><button className="primary" onClick={submitExam}>제출하기</button></div>
        {examMsg && <p className="msg">{examMsg}</p>}
        {examResults && <div className="result good"><b>결과: {examCorrect}/{examResults.length}문항 정답 · {examScore}점</b></div>}
        <div className="exam-list">{questions.map((q, idx) => {
          const r = examResults?.find(x => x.question.id === q.id);
          return <article className="exam-question" key={q.id}>
            <p className="meta">{idx + 1}번 · {examLabel(q)} · {TYPE_LABELS[q.type] || q.type} · {q.category}</p>
            <QuestionBody question={q} />
            <textarea disabled={!!examResults} value={examAnswers[q.id] || ''} onChange={e => setExamAnswer(q.id, e.target.value)} placeholder="답안을 입력하세요" />
            {r && <div className={r.correct ? 'result good' : 'result bad'}><b>{r.feedback}</b><p><b>내 답:</b> {r.userAnswer || '(미답)'}</p>{r.explanation && <ExplanationBlock text={r.explanation} />}</div>}
          </article>;
        })}</div>
      </section>}

      {viewMode === 'wrong' && <section className="card wrong-card">
        <h2>오답노트</h2>
        <p className="meta">틀린 문제와 재복습할 항목을 모아봅니다.</p>
        {wrong.length ? <ul className="wrong-list">{wrong.map(w => <li key={w.id}><b>{w.category}</b> {w.prompt}<small>{w.reason}</small></li>)}</ul> : <p>아직 오답이 없습니다.</p>}
      </section>}
    </section>

    <aside className="side-menu">
      <div className="menu-card card">
        <div className="menu-title"><p className="eyebrow">Menu</p><p className="meta">{user?.nickname || '학습자'}님</p></div>
        {menuItems.map(item => <button key={item.id} className={viewMode === item.id ? 'menu-item active' : 'menu-item'} onClick={() => navigate(item.id)}><span><span className="menu-icon">{item.icon}</span>{item.label}</span><span>›</span></button>)}
        <button className="menu-item logout" onClick={onLogout}><span><span className="menu-icon">🚪</span>로그아웃</span><span>›</span></button>
      </div>
    </aside>

    {menuOpen && <div className="mobile-menu">
      <button className="mobile-backdrop" aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)} />
      <nav className="mobile-drawer">
        <div className="drawer-head"><div><p className="eyebrow">Menu</p><p className="meta">{user?.nickname || '학습자'}님</p></div><button onClick={() => setMenuOpen(false)}>×</button></div>
        {menuItems.map(item => <button key={item.id} className={viewMode === item.id ? 'menu-item active' : 'menu-item'} onClick={() => navigate(item.id)}><span><span className="menu-icon">{item.icon}</span>{item.label}</span><span>›</span></button>)}
        <button className="menu-item logout drawer-logout" onClick={onLogout}><span><span className="menu-icon">🚪</span>로그아웃</span><span>›</span></button>
      </nav>
    </div>}
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

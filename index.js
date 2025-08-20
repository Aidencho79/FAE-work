const { useState, useEffect, useMemo, useRef } = React;

const LS_KEY = "fae_journal_v1";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function formatMinutes(min) {
  const h = Math.floor((min || 0) / 60);
  const m = (min || 0) % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}
function toCSV(rows) {
  const header = ["id","date","client","project","title","details","workType","timeSpent","nextActions","tags","createdAt","updatedAt"];
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [header.join(",")].concat(
    rows.map(r => [
      r.id, r.date, r.client, r.project, r.title, r.details, r.workType,
      r.timeSpent, r.nextActions, (r.tags || []).join(";"), r.createdAt, r.updatedAt
    ].map(esc).join(","))
  );
  return lines.join("\n");
}
function download(name, content, mime = "application/octet-stream") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, state]);
  return [state, setState];
}

function EntryForm({ onSave, editing }) {
  const [date, setDate] = useState(() => editing?.date ?? new Date().toISOString().slice(0,10));
  const [client, setClient] = useState(editing?.client ?? "");
  const [department, setDepartment] = useState(editing?.department ?? "");
  const [engineer, setEngineer] = useState(editing?.department ?? "");
  const [project, setProject] = useState(editing?.project ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [details, setDetails] = useState(editing?.details ?? "");
  const [workType, setWorkType] = useState(editing?.workType ?? "미팅");
  const [timeSpent, setTimeSpent] = useState(editing?.timeSpent ?? 60);
  const [nextActions, setNextActions] = useState(editing?.nextActions ?? "");
  const [tagsInput, setTagsInput] = useState((editing?.tags ?? []).join(", "));
  const fileRef = useRef(null);

  useEffect(() => {
    if (!editing) return;
    setDate(editing.date);
    setClient(editing.client);
    setDepartment(editing.department);
    seetEngineer(editing.engineer);
    setProject(editing.project);
    setTitle(editing.title);
    setDetails(editing.details);
    setWorkType(editing.workType);
    setTimeSpent(editing.timeSpent);
    setNextActions(editing.nextActions);
    setTagsInput((editing.tags || []).join(", "));
  }, [editing?.id]);

  const save = () => {
    const now = Date.now();
    const tags = tagsInput.split(",").map(s => s.trim()).filter(Boolean);
    const entry = {
      id: editing?.id ?? uid(),
      date, client, project, title, details, workType,
      timeSpent: Number(timeSpent) || 0,
      nextActions,
      tags,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now
    };
    onSave(entry);
  };

  return (
    <div className="card">
      <h2>업무일지 작성</h2>
      <div className="row"><label>작성일자</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} /></div>
      <div className="row"><label>고객사</label><input value={client} onChange={e=>setClient(e.target.value)} placeholder="예) Samsung MX" /></div>
      <div className="row"><label>부서</label><input value={department} onChange={e=>setDepartment(e.target.value)} placeholder="예) PSG" /></div>
      <div className="row"><label>담당자</label><input value={engineer} onChange={e=>setEngineer(e.target.value)} placeholder="예) 홍길동" /></div>
      <div className="row"><label>프로젝트</label><input value={project} onChange={e=>setProject(e.target.value)} placeholder="예) AW37014" /></div>
      <div className="row"><label>업무 제목</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="예) OVP 스펙 확인 및 이슈 정리" /></div>
      <div className="row"><label>상세 내용</label><textarea rows="5" value={details} onChange={e=>setDetails(e.target.value)} placeholder="회의 내용, 디버깅 결과, 고객 요청사항 등" /></div>
      <div className="row"><label>업무 유형</label>
        <select value={workType} onChange={e=>setWorkType(e.target.value)}>
          {["영업미팅","기술지원","품질이슈","트렌드","신제품","기타"].map(t=> <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="row"><label>소요 시간(분)</label><input type="number" min="0" step="15" value={timeSpent} onChange={e=>setTimeSpent(e.target.value)} /></div>
      <div className="row"><label>다음 액션</label><textarea rows="3" value={nextActions} onChange={e=>setNextActions(e.target.value)} placeholder="To-Do / 일정 / 담당자" /></div>
      <div className="row"><label>태그(쉼표 구분)</label><input value={tagsInput} onChange={e=>setTagsInput(e.target.value)} placeholder="예) OVP, 4Ch, LDO" /></div>
      <div className="right"><button onClick={save}>{editing ? "수정 저장" : "저장"}</button></div>
    </div>
  );
}

function Filters({ query, setQuery, from, setFrom, to, setTo, type, setType, tag, setTag }) {
  return (
    <div className="card">
      <h3>검색 / 필터</h3>
      <div className="row"><label>키워드</label><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="고객/프로젝트/제목/내용" /></div>
      <div className="row"><label>시작일</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></div>
      <div className="row"><label>종료일</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} /></div>
      <div className="row"><label>업무 유형</label>
        <select value={type} onChange={e=>setType(e.target.value)}>
          {["전체","영업미팅","기술지원","품질이슈","트렌드","신제품","기타"].map(t=> <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="row"><label>태그 포함</label><input value={tag} onChange={e=>setTag(e.target.value)} placeholder="예) OVP" /></div>
    </div>
  );
}

function App() {
  const [entries, setEntries] = useLocalStorage(LS_KEY, []);
  const [editing, setEditing] = useState(null);

  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("전체");
  const [tag, setTag] = useState("");

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      if (type !== "전체" && e.workType !== type) return false;
      if (tag && !(e.tags || []).map(t=>t.toLowerCase()).includes(tag.toLowerCase())) return false;
      if (query) {
        const q = query.toLowerCase();
        const bucket = [e.client, e.project, e.title, e.details, e.nextActions, (e.tags || []).join(" ")].join(" ").toLowerCase();
        if (!bucket.includes(q)) return false;
      }
      return true;
    }).sort((a,b) => b.date.localeCompare(a.date) || (b.updatedAt - a.updatedAt));
  }, [entries, query, from, to, type, tag]);

  const totalMinutes = useMemo(() => filtered.reduce((s, e) => s + (e.timeSpent || 0), 0), [filtered]);

  const upsert = (entry) => {
    setEntries(prev => {
      const idx = prev.findIndex(p => p.id === entry.id);
      if (idx === -1) return [entry, ...prev];
      const copy = [...prev];
      copy[idx] = entry;
      return copy;
    });
    setEditing(null);
  };
  const remove = (id) => setEntries(prev => prev.filter(p => p.id !== id));

  // 내보내기/가져오기/인쇄
  const exportJSON = () => download(`fae-entries-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(entries, null, 2), "application/json");
  const exportCSV = () => download(`fae-entries-${new Date().toISOString().slice(0,10)}.csv`, toCSV(entries), "text/csv;charset=utf-8");
  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error("not array");
        const sanitized = data.map(d => ({
          id: d.id ?? uid(),
          date: d.date ?? new Date().toISOString().slice(0,10),
          client: d.client ?? "",
          project: d.project ?? "",
          title: d.title ?? "",
          details: d.details ?? "",
          workType: d.workType ?? "기타",
          timeSpent: Number(d.timeSpent) || 0,
          nextActions: d.nextActions ?? "",
          tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
          createdAt: Number(d.createdAt) || Date.now(),
          updatedAt: Number(d.updatedAt) || Date.now(),
        }));
        setEntries(sanitized);
      } catch (e) {
        alert("가져오기에 실패했습니다. JSON 파일을 확인하세요.");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const fileRef = useRef(null);

  return (
    <div>
      <div className="toolbar">
        <button onClick={() => window.print()}>인쇄</button>
        <button onClick={exportCSV}>CSV 내보내기</button>
        <button onClick={exportJSON}>JSON 내보내기</button>
        <button onClick={() => fileRef.current.click()}>JSON 가져오기</button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={e => {
          const f = e.target.files?.[0];
          if (f) importJSON(f);
          e.target.value = "";
        }} />
      </div>

      <EntryForm onSave={upsert} editing={editing} />

      <Filters
        query={query} setQuery={setQuery}
        from={from} setFrom={setFrom}
        to={to} setTo={setTo}
        type={type} setType={setType}
        tag={tag} setTag={setTag}
      />

      <div className="total">선택된 범위 총 시간: {formatMinutes(totalMinutes)}</div>

      <div className="grid">
        {filtered.map(e => (
          <div key={e.id} className="card">
            <div className="hstack">
              <b style={{fontSize:16}}>{e.title || "(제목 없음)"}</b>
              <span className="muted small">{e.date}</span>
            </div>
            <div className="small" style={{marginTop:6}}>
              <div><b>고객사:</b> {e.client || "-"}</div>
              <div><b>프로젝트:</b> {e.project || "-"}</div>
              <div><b>유형:</b> {e.workType} · <b>시간:</b> {formatMinutes(e.timeSpent || 0)}</div>
            </div>
            {e.tags?.length > 0 && (
              <div className="tags">{e.tags.map(t => <span key={t} className="tag">#{t}</span>)}</div>
            )}
            {e.details && (<p className="muted small" style={{whiteSpace:"pre-wrap", marginTop:8}}>{e.details}</p>)}
            {e.nextActions && (<div className="small"><b>다음 액션:</b> <span className="muted" style={{whiteSpace:"pre-wrap"}}>{e.nextActions}</span></div>)}
            <div className="hr"></div>
            <div className="hstack">
              <button onClick={() => setEditing(e)}>수정</button>
              <button className="danger" onClick={() => { if (confirm("삭제할까요?")) remove(e.id); }}>삭제</button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card muted">아직 기록이 없습니다. 위의 “업무일지 작성”에서 첫 기록을 추가해 보세요.</div>
      )}

      <p className="small muted">※ 데이터는 이 브라우저의 localStorage에만 저장됩니다. 다른 기기와 자동 동기화되지 않습니다.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

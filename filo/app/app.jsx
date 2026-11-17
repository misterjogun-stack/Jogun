// ZEROCOUNT 앱 소스 (JSX). 직접 수정한 뒤 filo/tools 에서 `npm run build` 로 app.js · app.css 를 다시 만드세요.
    const { useState, useEffect, useMemo } = React;

    // ============================================
    // 0. CONSTANTS — 카테고리 / 컬러 / 헬퍼
    // ============================================

    // 카테고리 시스템 (4가지 고정 대분류)
    const CATEGORIES = [
      {
        key: '펌제',
        color: { hex: '#D2583C', bg: 'filo-cat-active', border: 'border-[#D2583C]', text: '', dot: 'bg-[#D2583C]', solid: 'bg-[#D2583C]' }
      },
      {
        key: '염색',
        color: { hex: '#4A63D8', bg: 'filo-cat-active', border: 'border-[#4A63D8]', text: '', dot: 'bg-[#4A63D8]', solid: 'bg-[#4A63D8]' }
      },
      {
        key: '헤어케어',
        color: { hex: '#1F9A80', bg: 'filo-cat-active', border: 'border-[#1F9A80]', text: '', dot: 'bg-[#1F9A80]', solid: 'bg-[#1F9A80]' }
      },
      {
        key: '스타일링',
        color: { hex: '#C0901C', bg: 'filo-cat-active', border: 'border-[#C0901C]', text: '', dot: 'bg-[#C0901C]', solid: 'bg-[#C0901C]' }
      }
    ];

    const getCategoryStyle = (cat) => CATEGORIES.find(c => c.key === cat) || null;

    // 선 아이콘 (24px 그리드, currentColor)
    const ICON_PATHS = {
      quick: ['M13 2 4 14h7l-1 8 9-12h-7l1-8z'],
      stocktake: ['M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z', 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'm9 14 2 2 4-4'],
      dashboard: ['m22 2-7 20-4-9-9-4z', 'M22 2 11 13'],
      manage: ['M21 8 12 3 3 8v8l9 5 9-5V8z', 'M3 8l9 5 9-5', 'M12 13v8'],
      settings: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'],
      sun: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M12 2v2', 'M12 20v2', 'm4.9 4.9 1.4 1.4', 'm17.7 17.7 1.4 1.4', 'M2 12h2', 'M20 12h2', 'm4.9 19.1 1.4-1.4', 'm17.7 6.3 1.4-1.4'],
      moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z'],
      undo: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
      search: ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'm21 21-4.3-4.3'],
      list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
      arrow: ['M5 12h14', 'm12 5 7 7-7 7'],
      minus: ['M5 12h14'],
      home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5'],
      logo: ['M12 3c3.6 0 6 3.6 6 9s-2.4 9-6 9-6-3.6-6-9 2.4-9 6-9z', 'M8.6 17.2 15.4 6.8'],
      box: ['M21 8 12 3 3 8v8l9 5 9-5V8z', 'M3 8l9 5 9-5', 'M12 13v8'],
      scan: ['M3 7V5a2 2 0 0 1 2-2h2', 'M17 3h2a2 2 0 0 1 2 2v2', 'M21 17v2a2 2 0 0 1-2 2h-2', 'M7 21H5a2 2 0 0 1-2-2v-2', 'M7 8v8', 'M10 8v8', 'M13 8v8', 'M17 8v8'],
      upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'],
      download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
      sheet: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h8', 'M10 9H8'],
      printer: ['M6 9V2h12v7', 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2', 'M6 14h12v8H6z'],
      close: ['M18 6 6 18', 'm6 6 12 12'],
      back: ['m15 18-6-6 6-6'],
      check: ['M22 11.1V12a10 10 0 1 1-5.9-9.1', 'm22 4-10 10-3-3'],
      alert: ['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4', 'M12 17h.01'],
      clock: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 6v6l4 2'],
      plus: ['M12 5v14', 'M5 12h14'],
    };
    const Icon = ({ name, size = 20, strokeWidth = 1.75, className = '' }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        {(ICON_PATHS[name] || []).map((d, i) => <path key={i} d={d} />)}
      </svg>
    );
    // 브랜드: Z 심볼 (사용자 로고를 벡터로 옮김) + ZEROCOUNT 워드마크
    let zcMarkSeq = 0;
    function ZMark({ size = 22 }) {
      const id = React.useRef('zcm' + (++zcMarkSeq)).current;
      return (
        <svg width={size} height={Math.round(size * 252 / 500)} viewBox="0 0 500 252" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
          <defs>
            <linearGradient id={id + 's'} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#F4F5F7" /><stop offset="0.45" stopColor="#FFFFFF" /><stop offset="0.72" stopColor="#C9CDD4" /><stop offset="1" stopColor="#9EA5B0" />
            </linearGradient>
            <linearGradient id={id + 'b'} x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2F74FF" /><stop offset="1" stopColor="#0A3FD1" />
            </linearGradient>
          </defs>
          <path fill={`url(#${id}s)`} d="M60 59 129 1H432L112 250H0L246 59Z" />
          <path fill={`url(#${id}s)`} d="M165 250H402L462 198H227Z" />
          <path fill={`url(#${id}b)`} d="M457 26 497 66 372 173H277Z" />
        </svg>
      );
    }
    const Wordmark = () => <span className="zc-wordmark" aria-label="ZEROCOUNT"><b>ZERO</b><i>COUNT</i></span>;

    function ProductThumb({ product, size = 44 }) {
      const [failed, setFailed] = useState(false);
      const cat = getCategoryStyle(product.category);
      const hasPhoto = product.image && product.image !== FALLBACK_IMAGE && !failed;
      const style = { width: size, height: size, flexShrink: 0, ...(cat ? { '--cat': cat.color.hex } : {}) };
      if (hasPhoto) {
        return <img src={product.image} alt="" loading="lazy" className="f-thumb" style={style} onError={() => setFailed(true)} />;
      }
      return (
        <div className="f-thumb f-mono" style={style} aria-hidden="true">
          {(cat ? cat.key : (product.name || '?')).trim().charAt(0)}
        </div>
      );
    }

    const NAV_ITEMS = [
      { key: 'home', label: '홈' },
      { key: 'quick', label: '빠른 차감' },
      { key: 'stocktake', label: '재고조사' },
      { key: 'dashboard', label: '발주' },
      { key: 'manage', label: '품목 관리' },
    ];

    // 전화번호 자동 포맷팅 (010-1234-5678 / 02-123-4567)
    const formatPhone = (raw) => {
      const digits = String(raw || '').replace(/[^0-9]/g, '');
      if (digits.length === 0) return '';
      if (digits.length <= 3) return digits;
      // 휴대폰 11자리
      if (digits.length === 11) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
      }
      // 서울 02
      if (digits.startsWith('02') && digits.length === 10) {
        return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
      }
      if (digits.startsWith('02') && digits.length === 9) {
        return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
      }
      // 일반 지역번호 10자리
      if (digits.length === 10) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
      // 짧은 경우 중간 하이픈만
      if (digits.length > 3 && digits.length <= 7) {
        return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      }
      return `${digits.slice(0, digits.length - 4)}-${digits.slice(-4)}`;
    };

    // ============================================
    // 1. THEME PRESETS — 색 값은 CSS 토큰(data-filo-theme)에서 결정
    // ============================================
    const themes = {
      studio: {
        name: "Studio",
        bg: "bg-[color:var(--f-bg)]",
        surface: "bg-[color:var(--f-surface)] border-[color:var(--f-line)]",
        text: "text-[color:var(--f-ink)]",
        subText: "text-[color:var(--f-sub)]",
        inputBg: "bg-[color:var(--f-field)] border-[color:var(--f-line-strong)] text-[color:var(--f-ink)]",
        pointBtn: "bg-[color:var(--f-accent)] text-[color:var(--f-on-accent)] hover:bg-[color:var(--f-accent-hover)] font-semibold",
        badge: "text-[color:var(--f-accent)]",
        activeTab: "bg-[color:var(--f-ink)] text-[color:var(--f-bg)] font-semibold",
        border: "border-[color:var(--f-line)]"
      },
      night: {
        name: "Night",
        bg: "bg-[color:var(--f-bg)]",
        surface: "bg-[color:var(--f-surface)] border-[color:var(--f-line)]",
        text: "text-[color:var(--f-ink)]",
        subText: "text-[color:var(--f-sub)]",
        inputBg: "bg-[color:var(--f-field)] border-[color:var(--f-line-strong)] text-[color:var(--f-ink)]",
        pointBtn: "bg-[color:var(--f-accent)] text-[color:var(--f-on-accent)] hover:bg-[color:var(--f-accent-hover)] font-semibold",
        badge: "text-[color:var(--f-accent)]",
        activeTab: "bg-[color:var(--f-ink)] text-[color:var(--f-bg)] font-semibold",
        border: "border-[color:var(--f-line)]"
      }
    };

    // ============================================
    // 2. SEED DATA — 살롱 현장 실제 제품군
    // ============================================
    // 010-0000-xxxx 대역은 실제로 발급되지 않는 번호라 체험 중 문자 버튼을 눌러도 안전
    const defaultProducts = [
      { id: 1, name: "아이롱 펌제 1제 (건강모용)", company: "동양상사", phone: "01000001234", category: "펌제", currentStock: 12, safeStock: 20, image: "" },
      { id: 2, name: "치오 크림 펌제 1제", company: "동양상사", phone: "01000001234", category: "펌제", currentStock: 4, safeStock: 10, image: "" },
      { id: 3, name: "펌 2제 브롬산", company: "동양상사", phone: "01000001234", category: "펌제", currentStock: 9, safeStock: 6, image: "" },
      { id: 4, name: "알칼리 염모제 7.1 애쉬브라운", company: "미래헤어랩", phone: "01000005678", category: "염색", currentStock: 8, safeStock: 6, image: "" },
      { id: 5, name: "산화제 6% 1000ml", company: "미래헤어랩", phone: "01000005678", category: "염색", currentStock: 3, safeStock: 4, image: "" },
      { id: 6, name: "케라틴 pH 밸런서", company: "미래헤어랩", phone: "01000005678", category: "헤어케어", currentStock: 1, safeStock: 5, image: "" },
      { id: 7, name: "매트 텍스처 왁스", company: "한빛뷰티", phone: "01000009012", category: "스타일링", currentStock: 7, safeStock: 3, image: "" },
    ];

    // 체험용 바코드 (8800000010001 ~)
    defaultProducts.forEach((p, i) => { p.barcode = String(8800000010001 + i); });

    const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=200&auto=format&fit=crop";

    // ============================================
    // 3. 안전한 localStorage 래퍼 (사파리 시크릿모드 + 용량 초과 대응)
    // ============================================
    const safeStorage = {
      get(key, fallback) {
        try {
          const v = localStorage.getItem(key);
          return v ? JSON.parse(v) : fallback;
        } catch (e) {
          return fallback;
        }
      },
      set(key, value) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return { ok: true };
        } catch (e) {
          // QuotaExceededError 등
          console.warn('Storage error:', e);
          return { ok: false, error: e };
        }
      },
      // 사용량 추정 (KB 단위)
      usageKB() {
        let total = 0;
        try {
          for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key) && key.startsWith('filo_')) {
              total += (localStorage.getItem(key) || '').length;
              total += key.length;
            }
          }
        } catch (e) {}
        return Math.round(total / 1024);
      }
    };

    // ============================================
    // ============================================
    // 4. SUB COMPONENTS — 인라인 편집 에디터들
    // ============================================

    // 제품 정보 인라인 편집기
    function ProductEditor({ theme, product, onSave, onCancel, onImageUpload, companyList = [], categoryList = [] }) {
      const [draft, setDraft] = useState({
        name: product.name,
        barcode: product.barcode || '',
        company: product.company,
        phone: product.phone,
        category: product.category || '',
        currentStock: product.currentStock,
        safeStock: product.safeStock,
        price: product.price || '',
        image: product.image
      });
      const [uploading, setUploading] = useState(false);

      // 부모에서 이미지가 업데이트되면 draft에도 즉시 반영 (미리보기 동기화)
      useEffect(() => {
        setDraft(prev => ({ ...prev, image: product.image }));
      }, [product.image]);

      const handleImg = async (file) => {
        if (!file) return;
        setUploading(true);
        try {
          await onImageUpload(file);
        } finally {
          setUploading(false);
        }
      };

      const handleSubmit = () => {
        if (!draft.name.trim() || !draft.company.trim() || !draft.phone.trim()) {
          alert('필수 항목을 비울 수 없습니다 (이름/거래처/전화번호)');
          return;
        }
        onSave({
          name: draft.name.trim(),
          barcode: (draft.barcode || '').trim(),
          company: draft.company.trim(),
          phone: draft.phone.replace(/[^0-9]/g, ''),
          category: (draft.category || '').trim(),
          currentStock: Math.max(0, Number(draft.currentStock) || 0),
          safeStock: Math.max(1, Number(draft.safeStock) || 1),
          price: Math.max(0, Math.round(Number(String(draft.price).replace(/,/g, '')) || 0)),
          image: draft.image
        });
      };

      return (
        <div className={`px-4 pb-4 border-t ${theme.border} space-y-3`} style={{animation: 'filoExpand 0.25s ease-out'}}>
          <div className="pt-3 grid grid-cols-1 gap-3">
            {/* 이미지 + 업로드 */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={draft.image}
                  alt=""
                  className={`w-16 h-16 object-cover border border-current opacity-90 flex-shrink-0 ${uploading ? 'filo-uploading' : ''}`}
                />
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs tracking-widest font-mono uppercase">
                    압축중
                  </div>
                )}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <label className={`p-2 text-xs text-center tracking-wider border border-current opacity-70 hover:opacity-100 transition-all cursor-pointer ${uploading ? 'pointer-events-none opacity-40' : ''}`}>
                  촬영
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => handleImg(e.target.files?.[0])}
                  />
                </label>
                <label className={`p-2 text-xs text-center tracking-wider border border-current opacity-70 hover:opacity-100 transition-all cursor-pointer ${uploading ? 'pointer-events-none opacity-40' : ''}`}>
                  갤러리
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => handleImg(e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider mb-1 opacity-60">제품 이름</label>
              <input
                type="text"
                value={draft.name}
                onChange={e => setDraft({...draft, name: e.target.value})}
                className={`w-full p-2 text-sm focus:outline-none border ${theme.inputBg}`}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider mb-1 opacity-60">바코드</label>
              <input
                type="text"
                inputMode="numeric"
                value={draft.barcode}
                placeholder="없으면 비워 두세요"
                onChange={e => setDraft({...draft, barcode: e.target.value})}
                className={`w-full p-2 text-sm focus:outline-none border ${theme.inputBg}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1 opacity-60">거래처</label>
                <input
                  type="text"
                  list="filo-company-list-editor"
                  value={draft.company}
                  onChange={e => setDraft({...draft, company: e.target.value})}
                  className={`w-full p-2 text-sm focus:outline-none border ${theme.inputBg}`}
                />
                <datalist id="filo-company-list-editor">
                  {companyList.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1 opacity-60">전화번호</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={formatPhone(draft.phone)}
                  onChange={e => setDraft({...draft, phone: e.target.value.replace(/[^0-9]/g, '')})}
                  className={`w-full p-2 text-sm focus:outline-none border ${theme.inputBg}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider mb-1 opacity-60">카테고리 (선택)</label>
              <div className="grid grid-cols-4 gap-1.5">
                {CATEGORIES.map(c => {
                  const active = draft.category === c.key;
                  return (
                    <button
                      type="button"
                      key={c.key}
                      onClick={() => setDraft({...draft, category: active ? '' : c.key})}
                      className={`py-2.5 text-sm tracking-wide transition-all border-2 ${
                        active
                          ? `${c.color.bg} ${c.color.text} font-semibold`
                          : 'border-current opacity-30 hover:opacity-70'
                      }`}
                      style={active ? { borderColor: c.color.hex } : {}}
                    >
                      {c.key}
                    </button>
                  );
                })}
              </div>
              {draft.category && (
                <p className={`text-xs ${theme.subText} mt-1.5`}>
                  선택 해제하려면 같은 카테고리를 다시 누르세요
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1 opacity-60">현재고</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={draft.currentStock}
                  onChange={e => setDraft({...draft, currentStock: e.target.value})}
                  className={`w-full p-2 text-sm text-center focus:outline-none border ${theme.inputBg}`}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1 opacity-60">적정선</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={draft.safeStock}
                  onChange={e => setDraft({...draft, safeStock: e.target.value})}
                  className={`w-full p-2 text-sm text-center focus:outline-none border ${theme.inputBg}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider mb-1 opacity-60">단가 (원)</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="모르면 비워 두세요"
                value={draft.price}
                onChange={e => setDraft({...draft, price: e.target.value})}
                className={`w-full p-2 text-sm focus:outline-none border ${theme.inputBg}`}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={onCancel}
                className="flex-1 py-2 text-sm tracking-wider border border-current opacity-60 hover:opacity-100 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                className={`flex-1 py-2 text-sm tracking-wider font-medium ${theme.pointBtn}`}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 거래처 정보 인라인 편집기 (같은 거래처의 모든 제품에 일괄 적용)
    function CompanyEditor({ theme, originalName, originalPhone, onSave, onCancel }) {
      const [name, setName] = useState(originalName);
      const [phone, setPhone] = useState(originalPhone);

      return (
        <div className={`border-b ${theme.border} pb-4 mb-4`} style={{animation: 'filoExpand 0.25s ease-out'}}>
          <div className="space-y-2">
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1 opacity-60">거래처명</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className={`w-full p-2 text-sm focus:outline-none border ${theme.inputBg}`}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1 opacity-60">전화번호</label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className={`w-full p-2 text-sm focus:outline-none border ${theme.inputBg}`}
              />
            </div>
            <p className={`text-xs ${theme.subText} font-light pt-1`}>
              이 거래처에 속한 모든 제품에 일괄 적용됩니다
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={onCancel}
                className="flex-1 py-2 text-sm tracking-wider border border-current opacity-60 hover:opacity-100 transition-all"
              >
                취소
              </button>
              <button
                onClick={() => onSave(name, phone)}
                className={`flex-1 py-2 text-sm tracking-wider font-medium ${theme.pointBtn}`}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 직접 수량 입력 모달 (빠른 차감 탭에서 숫자 탭하면)
    function QuickInputModal({ theme, product, onSave, onCancel }) {
      const [value, setValue] = useState(String(product.currentStock));

      const handleSubmit = () => {
        const num = parseInt(value);
        if (isNaN(num)) {
          alert('숫자를 입력해주세요');
          return;
        }
        onSave(num);
      };

      // 입력시 엔터키로 저장
      const handleKey = (e) => {
        if (e.key === 'Enter') handleSubmit();
      };

      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={onCancel}
        >
          <div
            className={`${theme.surface} border max-w-xs w-full`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5">
              <p className={`text-xs ${theme.subText} tracking-widest uppercase font-mono mb-2`}>수량 직접 설정</p>
              <h4 className="text-base font-medium mb-1 truncate">{product.name}</h4>
              <p className={`text-xs ${theme.subText} mb-4`}>
                적정선 {product.safeStock}개 · 현재 {product.currentStock}개
              </p>

              <input
                type="number"
                inputMode="numeric"
                autoFocus
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={handleKey}
                onFocus={e => e.target.select()}
                className={`w-full p-3 text-center text-2xl font-mono font-semibold focus:outline-none border ${theme.inputBg}`}
              />

              {/* 일괄 차감/증가 빠른 버튼 */}
              <div className="grid grid-cols-6 gap-1 mt-3">
                {[-10, -5, -1, +1, +5, +10].map(d => (
                  <button
                    key={d}
                    onClick={() => {
                      const cur = parseInt(value) || 0;
                      setValue(String(Math.max(0, cur + d)));
                    }}
                    className={`py-1.5 text-xs font-mono border border-current opacity-60 hover:opacity-100 active:scale-95 transition-all ${d < 0 ? theme.badge : ''}`}
                  >
                    {d > 0 ? '+' : ''}{d}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={onCancel}
                  className="flex-1 py-2 text-sm tracking-wider border border-current opacity-60 hover:opacity-100 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmit}
                  className={`flex-1 py-2 text-sm tracking-wider font-medium ${theme.pointBtn}`}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ============================================
    // 발주서 미리보기 + 편집 모달
    // ============================================
    function OrderPreviewModal({ theme, preview, branding, onSend, onCopy, onClose }) {
      const { company, info } = preview;
      const salonLabel = branding.appName && !['ZEROCOUNT', 'ZERO COUNT'].includes(branding.appName) ? `${branding.appName} ` : '';
      const defaultText = `[${salonLabel}발주 요청]\n\n안녕하세요 사장님,\n아래 제품 발주 요청드립니다.\n\n${info.items.map(it => `- ${it.name}: ${it.qty}개`).join('\n')}\n\n확인 후 배송 부탁드립니다. 감사합니다.`;
      const [text, setText] = useState(defaultText);

      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={onClose}
        >
          <div
            className={`${theme.surface} border max-w-md w-full max-h-[85vh] overflow-y-auto`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-5 border-b ${theme.border} flex items-center justify-between`}>
              <div>
                <h3 className="text-base font-light tracking-wide">발주서 미리보기</h3>
                <p className={`text-xs ${theme.subText} mt-1 font-mono tracking-widest uppercase`}>
                  {company} · {info.items.length}개 품목
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-lg opacity-50 hover:opacity-100 w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5 opacity-60">
                  메시지 내용 (편집 가능)
                </label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows="10"
                  maxLength="500"
                  className={`w-full p-3 text-sm focus:outline-none border resize-none leading-relaxed font-mono ${theme.inputBg}`}
                />
                <div className={`text-[11px] ${theme.subText} text-right mt-1 font-mono`}>
                  {text.length} / 500
                </div>
              </div>

              <div className={`text-xs ${theme.subText} p-3 border ${theme.border} leading-relaxed`}>
                <p>💡 인사말이나 요청사항을 추가하면 더 좋습니다</p>
                <p className="mt-1 opacity-80">예: "이번 주에 빨리 부탁드려요" / "오후 3시 이후 전화드립니다"</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { onCopy(text); onClose(); }}
                  className="py-3 text-sm tracking-wider border border-current opacity-80 hover:opacity-100 active:scale-95 transition-all"
                >
                  복사
                </button>
                <button
                  onClick={() => { onSend(text); onClose(); }}
                  className={`py-3 text-sm tracking-wider font-medium uppercase ${theme.pointBtn}`}
                >
                  ✉ 문자 전송
                </button>
              </div>

              <button
                onClick={() => setText(defaultText)}
                className={`w-full py-1.5 text-xs tracking-widest uppercase opacity-50 hover:opacity-100 transition-all`}
              >
                ↺ 기본 메시지로 초기화
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ============================================
    // 발주 이력 모달
    // ============================================
    function OrderHistoryModal({ theme, history, onClose, onClear }) {
      // 날짜별 그룹핑
      const grouped = useMemo(() => {
        const groups = {};
        history.forEach(entry => {
          const d = new Date(entry.t);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(entry);
        });
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
      }, [history]);

      const channelLabel = {
        sms: '📱 문자',
        copy: '복사',
        preview: '미리보기'
      };

      const fmtDate = (key) => {
        const [y, m, d] = key.split('-');
        const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return `${parseInt(m)}월 ${parseInt(d)}일 (${days[dt.getDay()]})`;
      };

      const fmtTime = (t) => {
        const d = new Date(t);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      };

      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={onClose}
        >
          <div
            className={`${theme.surface} border max-w-lg w-full max-h-[85vh] overflow-y-auto`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-5 border-b ${theme.border} flex items-center justify-between sticky top-0 ${theme.surface} z-10`}>
              <div>
                <h3 className="text-base font-light tracking-wide">발주 이력</h3>
                <p className={`text-xs ${theme.subText} mt-1 font-mono tracking-widest uppercase`}>
                  총 {history.length}건
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-lg opacity-50 hover:opacity-100 w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-5">
              {history.length === 0 ? (
                <div className={`text-center py-12 border ${theme.border} ${theme.subText} text-sm`}>
                  아직 발주 이력이 없습니다.<br/>
                  문자 발주 또는 복사 버튼을 누르면 자동 기록됩니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {grouped.map(([dateKey, entries]) => (
                    <div key={dateKey}>
                      <p className={`text-xs ${theme.subText} tracking-widest uppercase font-mono mb-2`}>
                        {fmtDate(dateKey)} · {entries.length}건
                      </p>
                      <div className="space-y-2">
                        {entries.map(entry => (
                          <div key={entry.id} className={`p-3 border ${theme.border}`}>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{entry.company}</p>
                                <p className={`text-xs ${theme.subText} font-mono`}>
                                  {fmtTime(entry.t)} · {channelLabel[entry.channel] || entry.channel}
                                </p>
                              </div>
                              <span className={`text-xs ${theme.subText} font-mono whitespace-nowrap`}>
                                {entry.totalQty}개
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              {entry.items.map((it, i) => (
                                <p key={i} className={`text-xs ${theme.subText} truncate`}>
                                  · {it.name}: {it.qty}개
                                </p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {history.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm(`발주 이력 ${history.length}건을 모두 삭제하시겠습니까?`)) {
                      onClear();
                      onClose();
                    }
                  }}
                  className="w-full mt-4 py-1.5 text-xs tracking-widest uppercase opacity-40 hover:opacity-100 transition-all"
                >
                  이력 전체 삭제
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ============================================
    // 거래처 단독 추가 모달
    // ============================================
    function AddCompanyModal({ theme, onAdd, onClose }) {
      const [name, setName] = useState('');
      const [phone, setPhone] = useState('');
      const [memo, setMemo] = useState('');

      const handleSubmit = () => {
        if (!name.trim() || !phone.trim()) {
          alert('거래처명과 전화번호는 필수입니다');
          return;
        }
        const ok = onAdd(name, phone, memo);
        if (ok) onClose();
      };

      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={onClose}
        >
          <div
            className={`${theme.surface} border max-w-sm w-full`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-5 border-b ${theme.border} flex items-center justify-between`}>
              <div>
                <h3 className="text-base font-light tracking-wide">+ 거래처 추가</h3>
                <p className={`text-xs ${theme.subText} mt-1 font-mono tracking-widest uppercase`}>
                  제품 없이도 등록 가능
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-lg opacity-50 hover:opacity-100 w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm uppercase tracking-wider mb-1 opacity-70">거래처명 *</label>
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="예: 동양재료상사"
                  className={`w-full p-2.5 text-sm focus:outline-none border ${theme.inputBg}`}
                />
              </div>

              <div>
                <label className="block text-sm uppercase tracking-wider mb-1 opacity-70">전화번호 *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={formatPhone(phone)}
                  onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="예: 010-1234-5678"
                  className={`w-full p-2.5 text-sm focus:outline-none border ${theme.inputBg}`}
                />
              </div>

              <div>
                <label className="block text-sm uppercase tracking-wider mb-1 opacity-70">메모 (선택)</label>
                <input
                  type="text"
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  placeholder="예: 박 사장님 / 토요일 휴무"
                  maxLength="100"
                  className={`w-full p-2.5 text-sm focus:outline-none border ${theme.inputBg}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="py-2.5 text-sm tracking-wider border border-current opacity-60 hover:opacity-100 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!name.trim() || !phone.trim()}
                  className={`py-2.5 text-sm tracking-wider font-medium uppercase transition-all ${
                    name.trim() && phone.trim() ? theme.pointBtn : 'opacity-30 cursor-not-allowed border border-current'
                  }`}
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ============================================
    // 오늘 사용 히스토리 모달
    // ============================================
    function TodayUsageModal({ theme, usage, onClose, onCancel }) {
      // 제품별 집계
      const summary = useMemo(() => {
        const byProduct = {};
        usage.forEach(u => {
          if (!byProduct[u.productName]) {
            byProduct[u.productName] = { name: u.productName, qty: 0, count: 0, firstT: u.t, lastT: u.t };
          }
          byProduct[u.productName].qty += Math.abs(u.delta);
          byProduct[u.productName].count += 1;
          if (u.t < byProduct[u.productName].firstT) byProduct[u.productName].firstT = u.t;
          if (u.t > byProduct[u.productName].lastT) byProduct[u.productName].lastT = u.t;
        });
        return Object.values(byProduct).sort((a, b) => b.qty - a.qty);
      }, [usage]);

      const totalQty = usage.reduce((s, u) => s + Math.abs(u.delta), 0);

      const fmtTime = (t) => {
        const d = new Date(t);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      };

      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={onClose}
        >
          <div
            className={`${theme.surface} border max-w-md w-full max-h-[85vh] overflow-y-auto`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-5 border-b ${theme.border} flex items-center justify-between sticky top-0 ${theme.surface} z-10`}>
              <div>
                <h3 className="text-base font-bold tracking-tight">오늘 사용 내역</h3>
                <p className={`text-xs ${theme.subText} mt-1 font-mono tracking-widest uppercase`}>
                  {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })} · 10분 안에 바로잡은 +/−는 빠짐
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-lg opacity-50 hover:opacity-100 w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-5">
              {usage.length === 0 ? (
                <div className={`text-center py-12 border ${theme.border} ${theme.subText} text-sm`}>
                  오늘 아직 차감한 약품이 없습니다.<br/>
                  빠른 차감 탭에서 <span className="font-bold">−</span> 버튼을 눌러보세요.<br/>
                  <span className="text-xs opacity-70">※ 재입고(+)는 사용으로 집계되지 않습니다</span>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* 합계 */}
                  <div className={`p-4 border ${theme.border} flex items-center justify-between`}>
                    <div>
                      <p className={`text-xs ${theme.subText} tracking-widest uppercase font-mono`}>오늘 차감 총합</p>
                      <p className="text-2xl font-light mt-1 font-mono">{totalQty}<span className="text-sm ml-1 opacity-60">개</span></p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs ${theme.subText} tracking-widest uppercase font-mono`}>제품 종류</p>
                      <p className="text-2xl font-light mt-1 font-mono">{summary.length}</p>
                    </div>
                  </div>

                  {/* 제품별 집계 */}
                  <div>
                    <p className={`text-xs ${theme.subText} tracking-widest uppercase font-mono mb-2`}>제품별 사용량</p>
                    <div className="space-y-1.5">
                      {summary.map((s, i) => (
                        <div key={s.name} className={`flex items-center justify-between p-2.5 border ${theme.border}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{s.name}</p>
                            <p className={`text-xs ${theme.subText} font-mono`}>
                              {s.count}회 · {fmtTime(s.firstT)}{s.count > 1 && ` ~ ${fmtTime(s.lastT)}`}
                            </p>
                          </div>
                          <span className="font-mono font-medium ml-3">{s.qty}<span className="text-xs opacity-60 ml-0.5">개</span></span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 시간순 상세 */}
                  <div>
                    <p className={`text-xs ${theme.subText} tracking-widest uppercase font-mono mb-2`}>시간순 상세 ({usage.length}건)</p>
                    <p className={`text-xs ${theme.subText} mb-2`}>잘못 누른 기록은 '잘못 누름'으로 지우면 재고도 함께 돌아갑니다.</p>
                    <div className={`p-2 border ${theme.border} space-y-1 max-h-64 overflow-y-auto`}>
                      {usage.map((u, idx) => (
                        <div key={`${u.id}-${u.t}-${idx}`} className="zc-usage-row">
                          <span className="truncate flex-1 min-w-0">{u.productName}</span>
                          <span className={`f-num ${theme.subText} flex-shrink-0`}>{fmtTime(u.t)} · {Math.abs(u.delta)}개</span>
                          {onCancel && (
                            <button className="zc-usage-cancel" onClick={() => onCancel(u)} aria-label={`${u.productName} ${Math.abs(u.delta)}개 사용 기록 취소`}>잘못 누름</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ============================================
    // 월별 통계 모달
    // ============================================
    function StatsModal({ theme, stats, cycleLabel, onClose }) {
      const { thisMonthQty, lastMonthQty, diffPct, topProducts, thisMonthOrders, lastMonthOrders, totalRecords } = stats;
      const cl = cycleLabel || { this: '이번 달', last: '지난 달' };
      const thisMonthLabel = cl.this;
      const lastMonthLabel = cl.last;

      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={onClose}
        >
          <div
            className={`${theme.surface} border max-w-md w-full max-h-[85vh] overflow-y-auto`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-5 border-b ${theme.border} flex items-center justify-between sticky top-0 ${theme.surface} z-10`}>
              <div>
                <h3 className="text-base font-light tracking-wide">사용 통계</h3>
                <p className={`text-xs ${theme.subText} mt-1 font-mono tracking-widest uppercase`}>
                  Monthly Summary
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-lg opacity-50 hover:opacity-100 w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5">
              {totalRecords === 0 ? (
                <div className={`text-center py-12 border ${theme.border} ${theme.subText} text-sm`}>
                  아직 사용 기록이 없습니다.<br/>
                  빠른 차감 탭에서 약을 사용하면 자동 기록됩니다.
                </div>
              ) : (
                <>
                  {/* 이번 달 vs 지난 달 */}
                  <div>
                    <p className={`text-xs ${theme.subText} tracking-widest uppercase font-mono mb-2`}>주기별 사용량</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`p-4 border ${theme.border}`}>
                        <p className={`text-xs ${theme.subText} tracking-widest uppercase font-mono`}>{thisMonthLabel}</p>
                        <p className="text-2xl font-light mt-1 font-mono">{thisMonthQty}<span className="text-sm ml-1 opacity-60">개</span></p>
                      </div>
                      <div className={`p-4 border ${theme.border} opacity-70`}>
                        <p className={`text-xs ${theme.subText} tracking-widest uppercase font-mono`}>{lastMonthLabel}</p>
                        <p className="text-2xl font-light mt-1 font-mono">{lastMonthQty}<span className="text-sm ml-1 opacity-60">개</span></p>
                      </div>
                    </div>
                    {diffPct !== null && (
                      <p className={`text-xs mt-2 text-center font-mono tracking-widest ${diffPct > 0 ? 'opacity-90' : 'opacity-60'}`}>
                        {diffPct > 0 ? '▲' : diffPct < 0 ? '▼' : '−'} 지난 달 대비 {Math.abs(diffPct)}%
                      </p>
                    )}
                  </div>

                  {/* 발주 횟수 */}
                  <div className={`p-3 border ${theme.border}`}>
                    <p className={`text-xs ${theme.subText} tracking-widest uppercase font-mono mb-2`}>발주 횟수</p>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div>
                        <p className="text-lg font-light font-mono">{thisMonthOrders}</p>
                        <p className={`text-xs ${theme.subText}`}>{thisMonthLabel}</p>
                      </div>
                      <div className="opacity-70">
                        <p className="text-lg font-light font-mono">{lastMonthOrders}</p>
                        <p className={`text-xs ${theme.subText}`}>{lastMonthLabel}</p>
                      </div>
                    </div>
                  </div>

                  {/* 제품별 사용량 랭킹 TOP 10 */}
                  {topProducts.length > 0 && (
                    <div>
                      <p className={`text-xs ${theme.subText} tracking-widest uppercase font-mono mb-2`}>
                        제품별 사용량 TOP 10 ({thisMonthLabel})
                      </p>
                      <div className="space-y-1.5">
                        {topProducts.map(([name, qty], i) => {
                          const max = topProducts[0][1];
                          const widthPct = max > 0 ? (qty / max * 100) : 0;
                          return (
                            <div key={name} className={`p-2.5 border ${theme.border} relative overflow-hidden`}>
                              <div
                                className={`absolute inset-0 ${theme.activeTab} opacity-10`}
                                style={{ width: `${widthPct}%` }}
                              />
                              <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className={`text-xs ${theme.subText} font-mono w-4`}>{i + 1}</span>
                                  <span className="text-sm truncate">{name}</span>
                                </div>
                                <span className="font-mono text-sm font-medium ml-2">{qty}<span className="text-xs opacity-60 ml-0.5">개</span></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className={`text-xs ${theme.subText} text-center font-mono tracking-widest pt-2 border-t ${theme.border}`}>
                    총 누적 기록: {totalRecords}건
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ============================================
    // 사용 가이드 모달 (첫 방문 + 수동 열기)
    // ============================================
    function GuideModal({ theme, onClose, stockCycle, setStockCycle, onStartEmpty, onStartSample }) {
      const [step, setStep] = useState(0);

      const steps = [
        { type: 'welcome' },
        { type: 'cycle' },
        {
          type: 'info',
          title: '약품 등록',
          body: '[마스터 관리] 탭에서 약품을 등록합니다.',
          detail: '제품명, 거래처, 전화번호, 안전 재고량을 입력하고\n카테고리(펌제·염색·헤어케어·스타일링)로 분류하세요.\n\n자주 쓰는 약 20~30개부터 시작하면 충분합니다.'
        },
        {
          type: 'info',
          title: '매일 차감',
          body: '약을 꺼낼 때마다 [빠른 차감] 탭에서 − 버튼.',
          detail: '카테고리 칩으로 빠르게 필터링하고\n잘못 눌러도 되돌리기로 복구할 수 있습니다.\n\n여러 개를 한 번에 차감하려면 숫자를 눌러 −5, −10 버튼을 사용하세요.'
        },
        {
          type: 'info',
          title: '자동 발주',
          body: '안전 재고선 아래로 떨어지면 [발주 대시보드]에 자동 표시.',
          detail: '거래처별로 자동 분류되어\n문자 발주·텍스트 복사·미리보기로 보낼 수 있습니다.\n\n발주 후 완료 버튼을 누르면 깔끔하게 정리됩니다.'
        },
        { type: 'start' }
      ];

      const current = steps[step];
      const isLast = step === steps.length - 1;

      const handleClose = () => {
        safeStorage.set('filo_guide_seen', true);
        onClose();
      };

      const handleNext = () => {
        if (isLast) handleClose();
        else setStep(step + 1);
      };

      const handleStartEmpty = () => {
        onStartEmpty();
        handleClose();
      };

      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={current.type === 'start' ? undefined : handleClose}
        >
          <div
            className={`${theme.surface} border max-w-md w-full`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-5 border-b ${theme.border} flex items-center justify-between`}>
              <span className={`text-sm ${theme.subText} font-mono tracking-[0.2em] uppercase`}>
                Setup · {step + 1} / {steps.length}
              </span>
              <button
                onClick={handleClose}
                className="text-lg opacity-40 hover:opacity-100 w-8 h-8 flex items-center justify-center"
                title="건너뛰기"
              >
                ✕
              </button>
            </div>

            <div className="p-8">
              {/* 환영 */}
              {current.type === 'welcome' && (
                <div className="text-center space-y-5">
                  <h2 className="text-2xl"><Wordmark /></h2>
                  <div className={`w-12 h-px mx-auto ${theme.border} border-t`}></div>
                  <h3 className="text-xl font-medium tracking-tight">환영합니다</h3>
                  <p className={`text-base ${theme.subText} leading-relaxed`}>
                    1인 살롱 사장님을 위한<br/>재고 · 발주 관리 시스템입니다.
                  </p>
                  <p className={`text-sm ${theme.subText} opacity-70 leading-relaxed`}>
                    약품 재고를 한 번에 관리하고<br/>발주 시점을 자동으로 알려드립니다.
                  </p>
                </div>
              )}

              {/* 재고 주기 선택 */}
              {current.type === 'cycle' && (
                <div className="space-y-5">
                  <div className="text-center">
                    <h3 className="text-xl font-medium tracking-tight mb-2">재고 파악 주기</h3>
                    <p className={`text-base ${theme.subText} leading-relaxed`}>
                      살롱에서 재고를 확인하는 주기를 선택하세요.<br/>
                      <span className="opacity-70 text-sm">통계와 발주 분석이 이 주기에 맞춰집니다.</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setStockCycle('weekly')}
                      className={`p-5 border-2 transition-all ${
                        stockCycle === 'weekly'
                          ? `${theme.pointBtn} border-transparent`
                          : `${theme.border} opacity-60 hover:opacity-100`
                      }`}
                    >
                      <div className="text-2xl font-light mb-1">주</div>
                      <div className="text-sm tracking-wide font-medium">주 단위</div>
                      <div className={`text-xs mt-1 ${stockCycle === 'weekly' ? 'opacity-80' : theme.subText}`}>
                        매주 재고 확인
                      </div>
                    </button>
                    <button
                      onClick={() => setStockCycle('monthly')}
                      className={`p-5 border-2 transition-all ${
                        stockCycle === 'monthly'
                          ? `${theme.pointBtn} border-transparent`
                          : `${theme.border} opacity-60 hover:opacity-100`
                      }`}
                    >
                      <div className="text-2xl font-light mb-1">월</div>
                      <div className="text-sm tracking-wide font-medium">월 단위</div>
                      <div className={`text-xs mt-1 ${stockCycle === 'monthly' ? 'opacity-80' : theme.subText}`}>
                        매월 재고 확인
                      </div>
                    </button>
                  </div>

                  <p className={`text-sm ${theme.subText} text-center opacity-70`}>
                    나중에 설정에서 언제든 변경할 수 있습니다.
                  </p>
                </div>
              )}

              {/* 정보 단계 */}
              {current.type === 'info' && (
                <div className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-light ${theme.badge}`}>{String(step - 1).padStart(2, '0')}</span>
                    <h3 className="text-xl font-medium tracking-tight">{current.title}</h3>
                  </div>
                  <p className="text-base leading-relaxed">{current.body}</p>
                  <div className={`text-sm ${theme.subText} p-4 border ${theme.border} leading-relaxed whitespace-pre-line`}>
                    {current.detail}
                  </div>
                </div>
              )}

              {/* 시작 방식 선택 */}
              {current.type === 'start' && (
                <div className="space-y-5">
                  <div className="text-center">
                    <h3 className="text-xl font-medium tracking-tight mb-2">시작 방법</h3>
                    <p className={`text-base ${theme.subText} leading-relaxed`}>
                      어떻게 시작하시겠어요?
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handleStartEmpty}
                      className={`w-full p-4 border-2 text-left transition-all ${theme.border} hover:opacity-100 opacity-80`}
                      style={{ borderColor: 'currentColor' }}
                    >
                      <div className="text-base font-semibold mb-1">빈 상태로 시작</div>
                      <div className={`text-sm ${theme.subText} leading-relaxed`}>
                        샘플 데이터 없이 처음부터. 내 살롱 약품을 직접 등록합니다. (신규 추천)
                      </div>
                    </button>

                    <button
                      onClick={() => { if (onStartSample) onStartSample(); handleClose(); }}
                      className={`w-full p-4 border text-left transition-all ${theme.border} opacity-60 hover:opacity-100`}
                    >
                      <div className="text-base font-medium mb-1">샘플로 둘러보기</div>
                      <div className={`text-sm ${theme.subText} leading-relaxed`}>
                        예시 약품으로 먼저 기능을 체험. 나중에 설정에서 초기화 가능.
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* 진행 도트 */}
              <div className="flex justify-center gap-1.5 mt-6">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`h-1 transition-all ${
                      i === step ? 'w-6 opacity-100' : 'w-1 opacity-30 hover:opacity-60'
                    } bg-current rounded-full`}
                  />
                ))}
              </div>
            </div>

            {/* 하단 버튼: 시작 단계에서는 숨김 (위에서 선택) */}
            {current.type !== 'start' && (
              <div className={`p-4 border-t ${theme.border} grid grid-cols-2 gap-2`}>
                {step > 0 ? (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="py-2.5 text-sm tracking-widest uppercase border border-current opacity-60 hover:opacity-100 transition-all"
                  >
                    ← 이전
                  </button>
                ) : (
                  <button
                    onClick={handleClose}
                    className="py-2.5 text-sm tracking-widest uppercase opacity-50 hover:opacity-100 transition-all"
                  >
                    건너뛰기
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className={`py-2.5 text-sm tracking-widest font-medium uppercase ${theme.pointBtn}`}
                >
                  다음 →
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }


    // ============================================
    // 4-0. 사용 기록 정정 처리
    // ============================================
    // 같은 약을 짧은 시간 안에 반대로 누르면(+ 뒤에 −, − 뒤에 +) 실수 정정으로 보고 기록을 상쇄한다.
    const CORRECTION_WINDOW_MS = 10 * 60 * 1000;
    const netQuickEntry = (hist, id, name, delta, now, force) => {
      for (let i = hist.length - 1; i >= 0; i--) {
        const h = hist[i];
        if (h.id !== id) continue;
        if (h.source !== 'quick') break;               // 가장 최근 기록이 빠른 차감일 때만 합친다
        if (force || now - (h.tu || h.t) <= CORRECTION_WINDOW_MS) {
          h.delta += delta; h.tu = now;
          if (h.delta === 0) hist.splice(i, 1);
          return hist;
        }
        break;
      }
      hist.push({ t: now, tu: now, id, name, productName: name, delta, source: 'quick' });
      return hist;
    };
    // 예전 방식으로 쌓인 기록 정리 (한 번만 실행): 10분 안의 +/− 정정과 되돌리기를 상쇄
    const cleanupHistory = (hist) => {
      const out = [];
      const lastIdx = {};
      [...hist].sort((a, b) => a.t - b.t).forEach(h => {
        if (h.source === 'quick') {
          const i = lastIdx[h.id];
          const prev = i != null ? out[i] : null;
          if (prev && h.t - (prev.tu || prev.t) <= CORRECTION_WINDOW_MS) {
            prev.delta += h.delta; prev.tu = h.t;
            if (prev.delta === 0) { out[i] = null; delete lastIdx[h.id]; }
            return;
          }
          out.push({ ...h, tu: h.t }); lastIdx[h.id] = out.length - 1;
          return;
        }
        if (h.source === 'undo') {                     // 예전 되돌리기: 마지막 한 번 누름을 취소
          const i = lastIdx[h.id];
          const prev = i != null ? out[i] : null;
          if (prev) {
            prev.delta += prev.delta < 0 ? 1 : -1;
            if (prev.delta === 0) { out[i] = null; delete lastIdx[h.id]; }
          }
          return;
        }
        out.push({ ...h });
        if (h.id != null) delete lastIdx[h.id];
      });
      return out.filter(Boolean);
    };

    // ============================================
    // 4-1. 외부 라이브러리 지연 로딩 (엑셀 · 바코드)
    // ============================================
    const XLSX_SRC = 'vendor/xlsx.full.min.js';            // SheetJS 0.18.5
    const SCANNER_SRC = 'vendor/html5-qrcode.min.js';      // html5-qrcode 2.3.8
    const scriptCache = {};
    const loadScript = (src) => scriptCache[src] || (scriptCache[src] = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src; el.async = true;
      el.onload = () => resolve();
      el.onerror = () => { delete scriptCache[src]; reject(new Error('라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.')); };
      document.head.appendChild(el);
    }));
    const getXLSX = async () => { if (!window.XLSX) await loadScript(XLSX_SRC); return window.XLSX; };

    // ============================================
    // 4-2. 엑셀 가져오기 / 내보내기
    // ============================================
    const PRODUCT_HEADERS = ['제품명', '바코드', '카테고리', '거래처', '전화번호', '현재고', '적정선', '단가'];
    const COLUMN_ALIASES = {
      name: ['제품명', '상품명', '품목명', '품목', '이름', 'name', 'product'],
      barcode: ['바코드', '바코드번호', 'barcode', 'ean', '상품코드'],
      category: ['카테고리', '분류', 'category'],
      company: ['거래처', '거래처명', '업체', '업체명', '제조사', 'company'],
      phone: ['전화번호', '거래처전화번호', '연락처', 'phone'],
      currentStock: ['현재고', '재고', '현재재고', '수량', '재고수량', 'stock'],
      safeStock: ['적정선', '안전재고', '적정재고', '최소재고', 'safe'],
      price: ['단가', '가격', '원가', '매입가', 'price'],
    };
    const normHeader = (h) => String(h == null ? '' : h).replace(/\s+/g, '').toLowerCase();
    const cellText = (v) => (v == null ? '' : String(v).trim());

    const readSheetRows = async (file) => {
      const XLSX = await getXLSX();
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', codepage: 65001 });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
      if (!rows.length) throw new Error('첫 번째 시트에 데이터가 없습니다.');
      const keys = Object.keys(rows[0]);
      const map = {};
      Object.entries(COLUMN_ALIASES).forEach(([field, aliases]) => {
        const k = keys.find(key => aliases.some(a => normHeader(a) === normHeader(key)));
        if (k) map[field] = k;
      });
      if (!map.name) throw new Error("'제품명' 열을 찾지 못했습니다. 첫 줄에 제품명, 거래처, 현재고 같은 제목을 넣어 주세요.");
      return rows
        .map(r => { const o = {}; Object.keys(map).forEach(f => { o[f] = r[map[f]]; }); return o; })
        .filter(o => cellText(o.name));
    };

    const matchCategory = (v) => {
      const t = cellText(v);
      if (!t) return null;
      const hit = CATEGORIES.find(c => c.key === t || c.key.startsWith(t) || t.startsWith(c.key));
      return hit ? hit.key : null;
    };
    const toCount = (v, min) => {
      const t = cellText(v).replace(/,/g, '');
      if (t === '' || isNaN(Number(t))) return null;
      return Math.max(min, Math.round(Number(t)));
    };

    // 엑셀 행과 현재 품목을 비교해 추가/변경 계획을 만든다 (바코드 → 제품명 순으로 같은 품목을 찾음)
    const planImport = (rows, products) => {
      const byBarcode = new Map(products.filter(p => p.barcode).map(p => [String(p.barcode), p]));
      const byName = new Map(products.map(p => [p.name.trim(), p]));
      const adds = [], updates = [];
      let same = 0;
      const LABEL = { name: '제품명', barcode: '바코드', category: '카테고리', company: '거래처', phone: '전화번호', currentStock: '현재고', safeStock: '적정선', price: '단가' };
      rows.forEach((r, i) => {
        const vals = { name: cellText(r.name) };
        const bc = cellText(r.barcode).replace(/\s/g, '');
        if (bc) vals.barcode = bc;
        const cat = matchCategory(r.category); if (cat) vals.category = cat;
        if (cellText(r.company)) vals.company = cellText(r.company);
        const ph = cellText(r.phone).replace(/[^0-9]/g, ''); if (ph) vals.phone = ph;
        const cur = toCount(r.currentStock, 0); if (cur !== null) vals.currentStock = cur;
        const safe = toCount(r.safeStock, 1); if (safe !== null) vals.safeStock = safe;
        const price = toCount(r.price, 0); if (price !== null) vals.price = price;
        const existing = (bc && byBarcode.get(bc)) || byName.get(vals.name);
        if (existing) {
          const changes = Object.keys(vals).filter(k => String(existing[k] == null ? '' : existing[k]) !== String(vals[k]));
          if (changes.length) {
            updates.push({
              id: existing.id, name: existing.name, vals,
              text: changes.map(k => `${LABEL[k]} ${cellText(existing[k]) || '없음'} → ${vals[k]}`).join(', ')
            });
          } else same += 1;
        } else {
          adds.push({
            id: Date.now() + i, name: vals.name, barcode: vals.barcode || '', category: vals.category || '',
            company: vals.company || '미지정 거래처', phone: vals.phone || '',
            currentStock: vals.currentStock == null ? 0 : vals.currentStock,
            safeStock: vals.safeStock == null ? 1 : vals.safeStock, price: vals.price == null ? 0 : vals.price, image: ''
          });
        }
      });
      return { adds, updates, same };
    };

    const stamp = () => {
      const d = new Date(), z = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}`;
    };
    const fmtDateTime = (t) => {
      if (!t) return '';
      const d = new Date(t), z = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}.${z(d.getMonth() + 1)}.${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
    };
    const fmtShortDate = (t) => { const d = new Date(t); return `${d.getMonth() + 1}.${d.getDate()}`; };

    const exportProductsXlsx = async (products, template) => {
      const XLSX = await getXLSX();
      const rows = template
        ? [['아이롱 펌제 1제 (건강모용)', '8801234567890', '펌제', '동양상사', '010-0000-1234', 12, 20, 18000]]
        : products.map(p => [p.name, p.barcode || '', p.category || '', p.company, p.phone ? formatPhone(p.phone) : '', p.currentStock, p.safeStock, priceOf(p) || '']);
      const ws = XLSX.utils.aoa_to_sheet([PRODUCT_HEADERS, ...rows]);
      ws['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 10 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '품목');
      XLSX.writeFile(wb, template ? 'zerocount_items_template.xlsx' : `zerocount_items_${stamp()}.xlsx`);
    };

    // ============================================
    // 4-3. 재고조사 계산
    // ============================================
    // 조사 생성 시점의 전산 재고(snapshot)와 실물 수량(actual)을 비교한다.
    const buildCountRows = (session, products) => {
      const live = new Map(products.map(p => [p.id, p]));
      const ids = new Set(Object.keys(session.snapshot).map(Number));
      if (session.status === 'active') products.forEach(p => ids.add(p.id));
      return [...ids].map(id => {
        const snap = session.snapshot[id];
        const p = live.get(id);
        const info = p || snap;
        const a = session.actual[id];
        const system = snap ? snap.system : (a && a.system != null ? a.system : (p ? p.currentStock : 0));
        const actual = a ? a.qty : null;
        return {
          id, name: info.name, company: info.company || '', category: info.category || '', barcode: info.barcode || '', price: priceOf(p || snap),
          system, actual, diff: actual == null ? null : actual - system, countedAt: a ? a.t : null,
          removed: !p, added: !snap,
        };
      }).sort((x, y) => x.name.localeCompare(y.name, 'ko'));
    };
    const countSummary = (rows) => {
      const total = rows.length;
      const done = rows.filter(r => r.actual != null).length;
      const diffRows = rows.filter(r => r.diff != null && r.diff !== 0);
      return { total, done, left: total - done, pct: total ? Math.round((done / total) * 100) : 0, diff: diffRows.length,
        diffQty: diffRows.reduce((a, r) => a + r.diff, 0),
        diffAmount: diffRows.reduce((a, r) => a + r.diff * (r.price || 0), 0),
        hasPrice: rows.some(r => r.price > 0) };
    };

    const exportCountXlsx = async (session, rows) => {
      const XLSX = await getXLSX();
      const sum = countSummary(rows);
      const head = ['제품명', '바코드', '카테고리', '거래처', '전산 재고', '실물 재고', '차이', '차이 금액', '조사 시각'];
      const body = rows.map(r => [r.name, r.barcode, r.category, r.company, r.system, r.actual == null ? '' : r.actual,
        r.diff == null ? '미조사' : r.diff, r.diff == null || !r.price ? '' : r.diff * r.price, r.countedAt ? fmtDateTime(r.countedAt) : '']);
      const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
      ws['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 9 }, { wch: 9 }, { wch: 8 }, { wch: 11 }, { wch: 17 }];
      const info = XLSX.utils.aoa_to_sheet([
        ['조사명', session.name], ['시작', fmtDateTime(session.createdAt)], ['완료', session.finishedAt ? fmtDateTime(session.finishedAt) : '진행 중'],
        ['전체 항목', sum.total], ['조사 완료', sum.done], ['미조사', sum.left], ['진행률', `${sum.pct}%`],
        ['차이 발생 품목', sum.diff], ['차이 합계(실물-전산)', sum.diffQty], ['차이 금액(원)', sum.hasPrice ? sum.diffAmount : '단가 미입력'],
      ]);
      info['!cols'] = [{ wch: 18 }, { wch: 26 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '조사 결과');
      XLSX.utils.book_append_sheet(wb, info, '요약');
      XLSX.writeFile(wb, `zerocount_count_${stamp()}.xlsx`);
    };

    // PDF: 인쇄용 보고서를 새 창에 그리고 인쇄 대화상자를 연다 (PDF로 저장 선택)
    const printCountReport = (session, rows, appName) => {
      const sum = countSummary(rows);
      const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const tr = rows.map(r => `<tr class="${r.diff ? 'diff' : ''}"><td>${esc(r.name)}${r.barcode ? `<br><small>${esc(r.barcode)}</small>` : ''}</td><td>${esc(r.company)}</td>
        <td class="n">${r.system}</td><td class="n">${r.actual == null ? '-' : r.actual}</td>
        <td class="n">${r.diff == null ? '<span class="muted">미조사</span>' : (r.diff > 0 ? '+' + r.diff : r.diff === 0 ? '0' : '−' + Math.abs(r.diff))}</td></tr>`).join('');
      const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>${esc(session.name)} 재고조사 결과</title>
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; color: #0F172A; margin: 0; padding: 24px; font-size: 12px; }
          header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0F172A; padding-bottom: 10px; margin-bottom: 14px; }
          h1 { font-size: 20px; margin: 0; } .brand { font-weight: 800; letter-spacing: .08em; font-size: 11px; color: #2563EB; }
          .meta { color: #64748B; text-align: right; line-height: 1.6; }
          .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 14px; }
          .kpi { border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px; } .kpi b { display: block; font-size: 18px; } .kpi span { color: #64748B; font-size: 10.5px; }
          table { width: 100%; border-collapse: collapse; } th { background: #F1F5F9; text-align: left; font-size: 11px; padding: 7px 8px; }
          td { padding: 7px 8px; border-bottom: 1px solid #E2E8F0; vertical-align: top; } td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
          tr.diff td { background: #FEF2F2; } small, .muted { color: #94A3B8; }
          .print-btn { position: fixed; right: 20px; top: 20px; padding: 10px 16px; border: 0; border-radius: 10px; background: #2563EB; color: #fff; font-weight: 700; cursor: pointer; }
          @media print { .print-btn { display: none; } body { padding: 0; } }
        </style></head><body>
        <button class="print-btn" onclick="window.print()">PDF로 저장 / 인쇄</button>
        <header><div><div class="brand">${esc(appName || 'ZEROCOUNT')}</div><h1>${esc(session.name)} 재고조사 결과</h1></div>
          <div class="meta">시작 ${fmtDateTime(session.createdAt)}<br>${session.finishedAt ? '완료 ' + fmtDateTime(session.finishedAt) : '진행 중'}</div></header>
        <div class="kpis"><div class="kpi"><span>전체 항목</span><b>${sum.total}</b></div><div class="kpi"><span>조사 완료</span><b>${sum.done}</b></div>
          <div class="kpi"><span>미조사</span><b>${sum.left}</b></div><div class="kpi"><span>진행률</span><b>${sum.pct}%</b></div>
          <div class="kpi"><span>차이 발생</span><b>${sum.diff}</b></div></div>
        <table><thead><tr><th>제품명</th><th>거래처</th><th class="n">전산</th><th class="n">실물</th><th class="n">차이</th></tr></thead><tbody>${tr}</tbody></table>
        <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });<\/script>
        </body></html>`;
      const w = window.open('', '_blank');
      if (!w) return false;
      w.document.open(); w.document.write(html); w.document.close();
      return true;
    };

    // ============================================
    // 4-4. 바코드 스캐너 (카메라 + 직접 입력 / 스캐너 기기)
    // ============================================
    function ScanModal({ title, hint, onCode, onClose, children }) {
      const [camState, setCamState] = useState('loading'); // loading | on | error
      const [camError, setCamError] = useState('');
      const [manual, setManual] = useState('');
      const last = React.useRef({ code: '', t: 0 });
      const onCodeRef = React.useRef(onCode);
      onCodeRef.current = onCode;
      const regionId = React.useRef('zc-scan-' + Math.random().toString(36).slice(2)).current;

      useEffect(() => {
        let scanner = null, cancelled = false;
        (async () => {
          try {
            if (!window.isSecureContext || !navigator.mediaDevices) throw Object.assign(new Error('insecure'), { name: 'InsecureContext' });
            await loadScript(SCANNER_SRC);
            if (cancelled) return;
            const F = window.Html5QrcodeSupportedFormats;
            const formats = F ? [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.ITF, F.QR_CODE] : undefined;
            scanner = new window.Html5Qrcode(regionId, { verbose: false, formatsToSupport: formats });
            await scanner.start(
              { facingMode: 'environment' },
              { fps: 10, qrbox: (w, h) => ({ width: Math.floor(Math.min(w * 0.82, 340)), height: Math.floor(Math.min(h * 0.5, 170)) }) },
              (text) => {
                const now = Date.now();
                if (text === last.current.code && now - last.current.t < 2500) return;
                last.current = { code: text, t: now };
                try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) {}
                onCodeRef.current(text);
              },
              () => {}
            );
            if (cancelled) { scanner.stop().catch(() => {}); return; }
            setCamState('on');
          } catch (e) {
            const name = (e && e.name) || '';
            setCamError(
              name === 'NotAllowedError' || /permission/i.test(String(e)) ? '카메라 권한이 꺼져 있습니다. 브라우저 설정에서 카메라를 허용하거나 아래에 바코드 번호를 입력하세요.'
              : name === 'InsecureContext' ? '이 주소에서는 카메라를 쓸 수 없습니다. 아래에 바코드 번호를 입력하거나 바코드 스캐너 기기를 쓰세요.'
              : name === 'NotFoundError' || /no camera|NotFound/i.test(String(e)) ? '카메라를 찾지 못했습니다. 아래에 바코드 번호를 입력하거나 바코드 스캐너 기기를 쓰세요.'
              : '카메라를 시작하지 못했습니다. 아래에 바코드 번호를 입력해 주세요.'
            );
            setCamState('error');
          }
        })();
        return () => {
          cancelled = true;
          if (scanner) { try { scanner.stop().then(() => scanner.clear()).catch(() => {}); } catch (e) {} }
        };
      }, []);

      const submitManual = (e) => {
        e.preventDefault();
        const code = manual.trim();
        if (!code) return;
        onCodeRef.current(code);
        setManual('');
      };

      return (
        <div className="zc-scan" role="dialog" aria-modal="true" aria-label="바코드 스캐너">
          <div className="zc-scan-top">
            <span className="zc-scan-brand"><ZMark size={30} /><Wordmark /></span>
            <button className="zc-scan-close" onClick={onClose} aria-label="스캐너 닫기"><Icon name="close" size={22} /></button>
          </div>
          <div className="zc-scan-body">
            <p className="zc-scan-title">{title}</p>
            {hint && <p className="zc-scan-hint">{hint}</p>}
            <div className="zc-cam">
              <div id={regionId} className="zc-cam-region" />
              {camState !== 'on' && (
                <div className="zc-cam-overlay">
                  {camState === 'loading' ? <p>카메라를 켜는 중…</p> : <p>{camError}</p>}
                </div>
              )}
              <div className="zc-frame" aria-hidden="true"><i /><i /><i /><i /></div>
            </div>
            <form className="zc-manual" onSubmit={submitManual}>
              <Icon name="scan" size={18} />
              <input
                id="zc-manual-code"
                value={manual}
                onChange={e => setManual(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="바코드 번호 입력 · 스캐너 기기로 읽기"
              />
              <button type="submit">확인</button>
            </form>
            {children}
          </div>
        </div>
      );
    }

    // ============================================
    // 4-5. 엑셀 가져오기 미리보기
    // ============================================
    function ImportPreviewModal({ plan, fileName, onApply, onClose }) {
      const { adds, updates, same } = plan;
      return (
        <div className="zc-modal-bg" onClick={onClose}>
          <div className="zc-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="엑셀 가져오기 미리보기">
            <div className="zc-modal-head">
              <div><h3>엑셀 가져오기</h3><p>{fileName}</p></div>
              <button className="f-icon-btn" onClick={onClose} aria-label="닫기"><Icon name="close" size={20} /></button>
            </div>
            <div className="zc-import-kpis">
              <div className="tone-blue"><span>새 품목</span><b>{adds.length}</b></div>
              <div className="tone-orange"><span>변경</span><b>{updates.length}</b></div>
              <div className="tone-green"><span>변경 없음</span><b>{same}</b></div>
            </div>
            <div className="zc-import-list">
              {updates.slice(0, 60).map(u => (
                <div key={'u' + u.id} className="zc-import-row"><span className="f-badge is-low" style={{ marginLeft: 0 }}>변경</span><div><b>{u.name}</b><small>{u.text}</small></div></div>
              ))}
              {adds.slice(0, 60).map(a => (
                <div key={'a' + a.id} className="zc-import-row"><span className="f-badge is-pending" style={{ marginLeft: 0 }}>추가</span><div><b>{a.name}</b><small>{a.company} · 현재고 {a.currentStock} · 적정선 {a.safeStock}{a.barcode ? ' · ' + a.barcode : ''}</small></div></div>
              ))}
              {updates.length + adds.length === 0 && <p className="f-chart-empty">바뀌는 내용이 없습니다. 엑셀의 값이 지금 품목과 같아요.</p>}
              {updates.length + adds.length > 120 && <p className="f-chart-empty">외 {updates.length + adds.length - 120}건</p>}
            </div>
            <p className="zc-modal-note">같은 품목은 바코드, 없으면 제품명으로 찾습니다. 엑셀에서 비어 있는 칸은 바꾸지 않고, 엑셀에 없는 품목은 지우지 않습니다.</p>
            <div className="zc-modal-actions">
              <button className="zc-btn-ghost" onClick={onClose}>취소</button>
              <button className="zc-btn-primary" disabled={updates.length + adds.length === 0} onClick={onApply}>
                {adds.length + updates.length}건 적용하기
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ============================================
    // 4-6. 조사 완료 확인
    // ============================================
    function FinishCountModal({ summary, onFinish, onClose }) {
      return (
        <div className="zc-modal-bg" onClick={onClose}>
          <div className="zc-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="재고조사 완료">
            <div className="zc-modal-head">
              <div><h3>재고조사를 완료할까요?</h3><p>조사 완료 {summary.done}개 · 미조사 {summary.left}개 · 차이 {summary.diff}개</p></div>
              <button className="f-icon-btn" onClick={onClose} aria-label="닫기"><Icon name="close" size={20} /></button>
            </div>
            <p className="zc-modal-note" style={{ marginTop: 0 }}>
              '실물 수량 반영'을 누르면 조사한 품목의 현재 재고가 실물 수량으로 바뀝니다. 미조사 품목은 그대로 둡니다.
            </p>
            <div className="zc-modal-actions" style={{ flexWrap: 'wrap' }}>
              <button className="zc-btn-ghost" onClick={() => onFinish(false)}>기록만 남기고 완료</button>
              <button className="zc-btn-primary" onClick={() => onFinish(true)}>실물 수량 반영하고 완료</button>
            </div>
          </div>
        </div>
      );
    }

    // ============================================
    // 4-7. 금액 표시
    // ============================================
    const won = (n) => `${Math.round(n || 0).toLocaleString('ko-KR')}원`;
    const priceOf = (p) => Math.max(0, Number(p && p.price) || 0);

    // ============================================
    // 4-8. 바코드 라벨 (Code 128 B)
    // ============================================
    const CODE128_PATTERNS = ['212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112'];
    // 문자열을 막대 폭 배열로 바꾼다 (막대·빈칸 번갈아, 모듈 단위)
    const code128Widths = (text) => {
      const vals = [104];
      for (const ch of String(text)) {
        const c = ch.charCodeAt(0);
        if (c < 32 || c > 126) throw new Error('바코드에 쓸 수 없는 글자가 있습니다');
        vals.push(c - 32);
      }
      let sum = vals[0];
      for (let i = 1; i < vals.length; i++) sum += vals[i] * i;
      vals.push(sum % 103);
      vals.push(106);
      return vals.map(v => CODE128_PATTERNS[v]).join('').split('').map(Number);
    };
    const code128Svg = (text, heightMm = 14) => {
      const widths = code128Widths(text);
      const quiet = 10;
      const total = widths.reduce((a, b) => a + b, 0) + quiet * 2;
      let x = quiet, rects = '';
      widths.forEach((w, i) => { if (i % 2 === 0) rects += `<rect x="${x}" y="0" width="${w}" height="40"/>`; x += w; });
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} 40" preserveAspectRatio="none" style="width:100%;height:${heightMm}mm;display:block" shape-rendering="crispEdges"><rect width="${total}" height="40" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
    };
    const LABEL_SHEETS = {
      a4_24: { name: 'A4 24칸 (70×37mm)', cols: 3, rows: 8, w: 70, h: 37.125, bar: 12 },
      a4_10: { name: 'A4 10칸 (105×59mm)', cols: 2, rows: 5, w: 105, h: 59.4, bar: 18 },
    };
    const printLabels = (items, sheetKey) => {
      const sh = LABEL_SHEETS[sheetKey] || LABEL_SHEETS.a4_24;
      const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const perPage = sh.cols * sh.rows;
      const pages = [];
      for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage));
      const cells = (list) => list.map(p => `<div class="lb"><b>${esc(p.name)}</b><small>${esc([p.category, p.company].filter(Boolean).join(' · '))}</small>${code128Svg(p.barcode, sh.bar)}<code>${esc(p.barcode)}</code></div>`).join('');
      const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>바코드 라벨</title><style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; color: #000; }
        .page { width: 210mm; height: 297mm; display: grid; grid-template-columns: repeat(${sh.cols}, ${sh.w}mm); grid-auto-rows: ${sh.h}mm; page-break-after: always; overflow: hidden; }
        .page:last-child { page-break-after: auto; }
        .lb { padding: 3mm 4mm; display: flex; flex-direction: column; justify-content: center; gap: 1mm; overflow: hidden; }
        .lb b { font-size: ${sh.cols === 3 ? 9.5 : 13}pt; line-height: 1.2; max-height: 2.4em; overflow: hidden; }
        .lb small { font-size: ${sh.cols === 3 ? 7 : 9}pt; color: #444; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lb code { font: 600 ${sh.cols === 3 ? 8 : 10}pt ui-monospace, monospace; letter-spacing: .08em; text-align: center; }
        .tip { font: 13px sans-serif; padding: 12px 16px; background: #EAF1FF; color: #1D4ED8; }
        @media print { .tip { display: none; } }
        @media screen { body { background: #e5e7eb; } .page { background: #fff; margin: 12px auto; box-shadow: 0 2px 10px rgba(0,0,0,.15); } .lb { outline: 1px dashed #cbd5e1; outline-offset: -1px; } }
      </style></head><body>
        <div class="tip">인쇄 창에서 용지는 A4, 배율은 '실제 크기(100%)', 여백은 '없음'으로 맞춰 주세요. 점선은 화면에서만 보입니다.</div>
        ${pages.map(pg => `<div class="page">${cells(pg)}</div>`).join('')}
        <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 400); });<\/script>
      </body></html>`;
      const w = window.open('', '_blank');
      if (!w) return false;
      w.document.open(); w.document.write(html); w.document.close();
      return true;
    };

    // ============================================
    // 4-9. 입고 처리 창
    // ============================================
    function ReceiveModal({ order, onApply, onClose }) {
      const [rows, setRows] = useState(() => order.items.map(it => ({ name: it.name, ordered: it.qty, qty: it.qty })));
      const total = rows.reduce((a, r) => a + (Number(r.qty) || 0), 0);
      const setQty = (i, v) => setRows(prev => prev.map((r, j) => j === i ? { ...r, qty: v === '' ? '' : Math.max(0, Math.round(Number(v) || 0)) } : r));
      return (
        <div className="zc-modal-bg" onClick={onClose}>
          <div className="zc-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="입고 처리">
            <div className="zc-modal-head">
              <div><h3>{order.company} 입고 처리</h3><p>받은 수량을 확인하고 적용하면 재고에 더해집니다.</p></div>
              <button className="f-icon-btn" onClick={onClose} aria-label="닫기"><Icon name="close" size={20} /></button>
            </div>
            <div className="zc-receive-list">
              {rows.map((r, i) => (
                <div key={r.name} className="zc-receive-row">
                  <div className="min-w-0 flex-1"><b>{r.name}</b><small>발주 {r.ordered}개</small></div>
                  <div className="zc-scan-step zc-light-step">
                    <button onClick={() => setQty(i, Math.max(0, (Number(r.qty) || 0) - 1))} aria-label={`${r.name} 받은 수량 1 줄이기`}><Icon name="minus" size={18} strokeWidth={2} /></button>
                    <input id={`receive-${i}`} type="number" inputMode="numeric" min="0" value={r.qty} onChange={e => setQty(i, e.target.value)} aria-label={`${r.name} 받은 수량`} />
                    <button onClick={() => setQty(i, (Number(r.qty) || 0) + 1)} aria-label={`${r.name} 받은 수량 1 늘리기`}><Icon name="plus" size={18} strokeWidth={2} /></button>
                  </div>
                </div>
              ))}
            </div>
            <p className="zc-modal-note">입고는 사용량 통계에 들어가지 않습니다. 안 온 품목은 0으로 두면 됩니다.</p>
            <div className="zc-modal-actions">
              <button className="zc-btn-ghost" onClick={onClose}>취소</button>
              <button className="zc-btn-primary" disabled={total === 0} onClick={() => onApply(rows.map(r => ({ name: r.name, qty: Number(r.qty) || 0 })))}>
                {total}개 입고 처리
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ============================================
    // 4-10. 바코드 라벨 출력 창
    // ============================================
    function LabelModal({ products, onPrint, onClose }) {
      const [selected, setSelected] = useState(() => new Set(products.map(p => p.id)));
      const [sheet, setSheet] = useState('a4_24');
      const [copies, setCopies] = useState(1);
      const missing = products.filter(p => selected.has(p.id) && !p.barcode).length;
      const toggle = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
      const count = selected.size * copies;
      return (
        <div className="zc-modal-bg" onClick={onClose}>
          <div className="zc-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="바코드 라벨 출력">
            <div className="zc-modal-head">
              <div><h3>바코드 라벨 출력</h3><p>라벨을 약통에 붙이면 바코드 없는 약도 스캔으로 조사할 수 있어요.</p></div>
              <button className="f-icon-btn" onClick={onClose} aria-label="닫기"><Icon name="close" size={20} /></button>
            </div>
            <div className="zc-label-opts">
              <label htmlFor="label-sheet">라벨지
                <select id="label-sheet" value={sheet} onChange={e => setSheet(e.target.value)}>
                  {Object.entries(LABEL_SHEETS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                </select>
              </label>
              <label htmlFor="label-copies">품목당 장수
                <select id="label-copies" value={copies} onChange={e => setCopies(Number(e.target.value))}>
                  {[1, 2, 3, 4, 6].map(n => <option key={n} value={n}>{n}장</option>)}
                </select>
              </label>
            </div>
            <div className="zc-label-tools">
              <button onClick={() => setSelected(new Set(products.map(p => p.id)))}>전체 선택</button>
              <button onClick={() => setSelected(new Set(products.filter(p => !p.barcode).map(p => p.id)))}>바코드 없는 품목만</button>
              <button onClick={() => setSelected(new Set())}>선택 해제</button>
            </div>
            <div className="zc-import-list" style={{ maxHeight: 260 }}>
              {products.map(p => (
                <label key={p.id} className="zc-label-row">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                  <span className="min-w-0 flex-1"><b>{p.name}</b><small>{p.barcode ? p.barcode : '바코드 없음 · 새 번호를 붙입니다'}</small></span>
                </label>
              ))}
            </div>
            {missing > 0 && <p className="zc-modal-note">바코드가 없는 {missing}개 품목에는 ZC00001 형식의 번호를 새로 붙여 품목 정보에 저장합니다.</p>}
            <div className="zc-modal-actions">
              <button className="zc-btn-ghost" onClick={onClose}>취소</button>
              <button className="zc-btn-primary" disabled={selected.size === 0} onClick={() => onPrint([...selected], sheet, copies)}>
                <Icon name="printer" size={18} /> 라벨 {count}장 출력
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ============================================
    // 5. MAIN APP
    // ============================================
    function App() {
      // 사용 기록이 바뀌면 통계를 다시 계산하기 위한 카운터 (처음 한 번 예전 기록 정리)
      const [historyTick, setHistoryTick] = useState(() => {
        if (!safeStorage.get('filo_history_v2', false)) {
          safeStorage.set('filo_history', cleanupHistory(safeStorage.get('filo_history', [])));
          safeStorage.set('filo_history_v2', true);
        }
        return 0;
      });
      const [products, setProducts] = useState(() => {
        const saved = safeStorage.get('filo_products', []);
        // 판매 페이지의 '체험하기'로 들어왔고 아직 내 데이터가 없으면 샘플로 바로 시작
        if (saved.length === 0 && /[?&]demo\b/.test(window.location.search)) {
          safeStorage.set('filo_guide_seen', true);
          safeStorage.set('filo_demo', true);
          return defaultProducts;
        }
        return saved;
      });
      const [isDemo, setIsDemo] = useState(() => safeStorage.get('filo_demo', false));

      // 브라우저가 저장공간을 정리할 때 이 앱의 기록을 지우지 않도록 요청 (지원하는 브라우저에서만)
      useEffect(() => {
        if (products.length > 0 && !isDemo && navigator.storage && navigator.storage.persist) {
          navigator.storage.persisted().then(already => { if (!already) navigator.storage.persist().catch(() => {}); }).catch(() => {});
        }
      }, [products.length > 0, isDemo]);

      // 아이폰 · 아이패드에서 홈 화면에 추가하지 않고 쓰는 경우 안내 (오래 안 열면 브라우저가 기록을 지울 수 있음)
      const [showInstallHint, setShowInstallHint] = useState(() => {
        try {
          const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
          const standalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
          return ios && !standalone && !safeStorage.get('filo_install_hint_closed', false);
        } catch (e) { return false; }
      });
      const closeInstallHint = () => { safeStorage.set('filo_install_hint_closed', true); setShowInstallHint(false); };
      useEffect(() => { safeStorage.set('filo_demo', isDemo); }, [isDemo]);
      useEffect(() => {
        if (/[?&]demo\b/.test(window.location.search)) {
          try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}
        }
      }, []);

      // 재고 파악 주기 (weekly / monthly)
      const [stockCycle, setStockCycle] = useState(() => safeStorage.get('filo_stock_cycle', 'monthly'));
      useEffect(() => { safeStorage.set('filo_stock_cycle', stockCycle); }, [stockCycle]);

      // 주기 라벨 헬퍼
      const cycleLabel = stockCycle === 'weekly'
        ? { this: '이번 주', last: '지난 주', unit: '주' }
        : { this: '이번 달', last: '지난 달', unit: '월' };

      const [currentThemeKey, setCurrentThemeKey] = useState(() => {
        // head 스크립트가 정한 값(저장값 또는 기기 설정)을 그대로 사용. 구 테마 키(cream/forest 등)는 studio로 이전됨.
        const attr = document.documentElement.getAttribute('data-filo-theme');
        return themes[attr] ? attr : 'studio';
      });
      useEffect(() => {
        document.documentElement.setAttribute('data-filo-theme', currentThemeKey);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', currentThemeKey === 'night' ? '#0A0F1C' : '#F4F6FA');
      }, [currentThemeKey]);
      const toggleTheme = () => setCurrentThemeKey(k => (k === 'night' ? 'studio' : 'night'));

      const [viewMode, setViewMode] = useState('home');
      const [sidebarOpen, setSidebarOpen] = useState(false);
      const [searchQuery, setSearchQuery] = useState('');
      const [stockSearch, setStockSearch] = useState('');         // 재고조사 탭 검색
      const [masterSearch, setMasterSearch] = useState('');       // 마스터 관리 탭 검색
      const [toast, setToast] = useState(null);
      const [csvPreview, setCsvPreview] = useState(null);
      const [editingId, setEditingId] = useState(null);
      const [quickInputId, setQuickInputId] = useState(null);
      const [showSettings, setShowSettings] = useState(false);
      const [undoStack, setUndoStack] = useState([]);

      // 신규: 발주서 미리보기 모달 ({ company, info, customMessage } 또는 null)
      const [orderPreview, setOrderPreview] = useState(null);

      // 신규: 발주 이력 보기 모달
      const [showOrderHistory, setShowOrderHistory] = useState(false);

      // 신규: 거래처 단독 추가 모달
      const [showAddCompany, setShowAddCompany] = useState(false);

      // 신규: 빠른 차감 탭 카테고리 필터
      const [categoryFilter, setCategoryFilter] = useState('all');

      // 신규: 오늘 사용 히스토리 모달
      const [showTodayUsage, setShowTodayUsage] = useState(false);

      // 신규: 월별 통계 모달
      const [showStats, setShowStats] = useState(false);

      // 신규: 사용 가이드 모달 (첫 진입 자동 표시 + 설정에서 수동 열기)
      const [showGuide, setShowGuide] = useState(false);

      // 첫 방문 시 자동으로 가이드 표시
      useEffect(() => {
        const seen = safeStorage.get('filo_guide_seen', false);
        if (!seen) {
          // 0.6초 후 표시 (앱 마운트 안정화 후)
          const timer = setTimeout(() => setShowGuide(true), 600);
          return () => clearTimeout(timer);
        }
      }, []);

      // 신규: 발주 이력 (localStorage 영속화)
      const [orderHistory, setOrderHistory] = useState(() => safeStorage.get('filo_order_history', []));
      useEffect(() => { safeStorage.set('filo_order_history', orderHistory); }, [orderHistory]);

      // 신규: 거래처 마스터 (제품과 별개로 관리)
      const [companies, setCompanies] = useState(() => safeStorage.get('filo_companies', []));
      useEffect(() => { safeStorage.set('filo_companies', companies); }, [companies]);             // 되돌리기 스택

      // 발주 완료 처리 — 거래처 + 발주항목 해시로 식별
      const [completedOrders, setCompletedOrders] = useState(() =>
        safeStorage.get('filo_completed_orders', {}));
      useEffect(() => { safeStorage.set('filo_completed_orders', completedOrders); }, [completedOrders]);

      // 브랜딩 (사용자 커스터마이즈)
      const DEFAULT_BRANDING = { appName: 'ZEROCOUNT', tagline: '살롱 재고 · 재고조사', logoImage: '' };
      const [branding, setBranding] = useState(() => {
        const saved = safeStorage.get('filo_branding', null);
        if (!saved) return DEFAULT_BRANDING;
        // 예전 기본값을 그대로 쓰던 경우만 새 기본값으로 교체 (직접 바꾼 이름은 유지)
        const untouched = (saved.appName === 'FILO SYSTEM' && saved.tagline === 'Intelligent Premium Salon Automation')
          || (saved.appName === 'FILO' && saved.tagline === '살롱 약제 재고 · 발주')
          || (saved.appName === 'ZERO COUNT' && saved.tagline === '살롱 재고 · 재고조사');
        if (untouched) {
          return { ...DEFAULT_BRANDING, logoImage: saved.logoImage || '' };
        }
        return saved;
      });
      useEffect(() => { safeStorage.set('filo_branding', branding); }, [branding]);

      // 마지막 전체 백업 시각 (ISO 문자열, 백업 파일에는 포함하지 않음)
      const [lastBackup, setLastBackup] = useState(() => safeStorage.get('filo_last_backup', null));

      // 페이지 타이틀 동기화
      useEffect(() => {
        document.title = branding.appName === 'ZEROCOUNT' ? 'ZEROCOUNT' : `${branding.appName} · ZEROCOUNT`;
      }, [branding.appName]);

      // ESC 키로 모든 편집/모달 닫기
      useEffect(() => {
        const handler = (e) => {
          if (e.key === 'Escape') {
            setEditingId(null);
            setQuickInputId(null);
            setCsvPreview(null);
            setShowSettings(false);
            setOrderPreview(null);
            setShowOrderHistory(false);
            setShowAddCompany(false);
            setShowTodayUsage(false);
            setShowStats(false);
            setShowGuide(false);
          }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
      }, []);

      const [newProd, setNewProd] = useState({
        name: '', barcode: '', company: '', phone: '', category: '', safeStock: 0, currentStock: 0, price: '', image: ''
      });

      // ----- 재고조사 세션 -----
      const [counts, setCounts] = useState(() => safeStorage.get('filo_counts', []));
      useEffect(() => { safeStorage.set('filo_counts', counts); }, [counts]);
      const [openCountId, setOpenCountId] = useState(null);     // 보고 있는 조사 (없으면 목록 또는 진행 중 조사)
      const [countFilter, setCountFilterRaw] = useState('all');
      // 지금 필터에서 손댄 줄은 필터를 바꿀 때까지 목록에 남겨 둔다 (미조사 필터에서 한 자리 치자마자 줄이 사라지던 문제)
      const [countKeep, setCountKeep] = useState([]);
      const setCountFilter = (k) => { setCountFilterRaw(k); setCountKeep([]); };
      const keepCountRow = (id) => setCountKeep(prev => prev.includes(id) ? prev : [...prev, id]);
      const [countSearch, setCountSearch] = useState('');
      const [showFinishCount, setShowFinishCount] = useState(false);
      const activeCount = counts.find(c => c.status === 'active') || null;

      // ----- 주소 이전: 옛 주소에서 새 주소로 기록 보내기 -----
      const NEW_ORIGIN = window.ZC_NEW_ORIGIN || 'https://zerocount.vercel.app';
      const isOldOrigin = (window.ZC_OLD_ORIGINS || []).includes(window.location.origin);
      const [transferState, setTransferState] = useState('idle'); // idle | waiting | done | declined
      const startTransfer = () => {
        const payload = {};
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('filo_')) payload[k] = localStorage.getItem(k);
          }
        } catch (e) {}
        const w = window.open(NEW_ORIGIN + '/app/#transfer', '_blank');
        if (!w) { showToast('팝업이 막혀 있습니다. 브라우저에서 팝업을 허용해 주세요', 'error'); return; }
        setTransferState('waiting');
        let sent = false;
        const onMsg = (e) => {
          if (e.origin !== NEW_ORIGIN || !e.data) return;
          if (e.data.type === 'zc-transfer-ready' && !sent) { sent = true; w.postMessage({ type: 'zc-transfer', data: payload }, NEW_ORIGIN); }
          if (e.data.type === 'zc-transfer-done') {
            window.removeEventListener('message', onMsg);
            setTransferState(e.data.ok ? 'done' : 'declined');
          }
        };
        window.addEventListener('message', onMsg);
      };
      useEffect(() => {
        try {
          if (sessionStorage.getItem('zc_transferred')) {
            sessionStorage.removeItem('zc_transferred');
            setTimeout(() => showToast('옛 주소의 기록을 그대로 옮겨 왔습니다', 'success'), 600);
          }
        } catch (e) {}
      }, []);

      // ----- 입고 처리 · 바코드 라벨 · 적정선 추천 -----
      const [receiveOrder, setReceiveOrder] = useState(null);   // { company, items }
      const [showLabels, setShowLabels] = useState(false);
      const [recoDays, setRecoDays] = useState(() => safeStorage.get('filo_reco_days', 7));
      useEffect(() => { safeStorage.set('filo_reco_days', recoDays); }, [recoDays]);

      // ----- 바코드 스캔 / 엑셀 가져오기 -----
      const [scanMode, setScanMode] = useState(null);           // 'count' | 'quick' | 'assign' | null
      const [scanResult, setScanResult] = useState(null);       // { code, productId } 또는 { code, missing: true }
      const [scanQty, setScanQty] = useState(0);
      const [importPlan, setImportPlan] = useState(null);       // { plan, fileName }
      const [busy, setBusy] = useState(false);

      // 영속화 + 용량 초과 감지
      useEffect(() => {
        const result = safeStorage.set('filo_products', products);
        if (result && result.ok === false) {
          alert(
            '저장 공간이 부족합니다.\n\n' +
            '이미지가 너무 많거나 큽니다. 일부 제품의 이미지를 제거하거나 CSV로 백업 후 정리해주세요.\n\n' +
            `현재 사용량: 약 ${safeStorage.usageKB()}KB`
          );
        }
      }, [products]);
      useEffect(() => { safeStorage.set('filo_theme', currentThemeKey); }, [currentThemeKey]);


      const theme = themes[currentThemeKey];

      // ----- 토스트 (사용자 액션 피드백) -----
      const showToast = (message, type = 'info') => {
        setToast({ message, type, id: Date.now() });
        setTimeout(() => setToast(null), 1800);
      };
      // ----- 히스토리 로깅 (예측 기능 원료) -----
      const logHistory = (productId, productName, delta, source, opts = {}) => {
        try {
          const history = safeStorage.get('filo_history', []);
          if (source === 'quick') {
            netQuickEntry(history, productId, productName, delta, Date.now(), !!opts.force);
          } else {
            history.push({
              t: Date.now(),
              id: productId,
              name: productName,
              productName: productName,
              delta,
              source
            });
          }
          // 최근 1000건만 유지
          if (history.length > 1000) history.splice(0, history.length - 1000);
          safeStorage.set('filo_history', history);
          setHistoryTick(t => t + 1);
        } catch (e) { /* ignore */ }
      };

      // 오늘 사용 목록에서 '잘못 누름': 기록을 지우고 재고를 되돌린다
      const cancelUsage = (u) => {
        const qty = Math.abs(u.delta);
        if (!window.confirm(`${u.productName} ${qty}개 사용 기록을 지우고 재고를 ${qty}개 되돌릴까요?`)) return;
        const history = safeStorage.get('filo_history', []);
        const idx = history.findIndex(h => h.t === u.t && h.id === u.id);
        if (idx < 0) return;
        history.splice(idx, 1);
        safeStorage.set('filo_history', history);
        setProducts(prev => prev.map(p => p.id === u.id ? { ...p, currentStock: p.currentStock + qty } : p));
        setHistoryTick(t => t + 1);
        showToast(`${u.productName.slice(0, 14)} ${qty}개 사용을 취소했습니다`, 'success');
      };

      // ----- 햅틱 피드백 (모바일 지원시) -----
      const haptic = (ms = 10) => {
        try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
      };

      // ----- 재고조사 핸들러 -----
      const createCount = () => {
        if (activeCount) { setOpenCountId(activeCount.id); return; }
        if (products.length === 0) { showToast('먼저 품목을 등록하세요', 'error'); return; }
        const d = new Date();
        const sameMonth = counts.filter(c => new Date(c.createdAt).getMonth() === d.getMonth() && new Date(c.createdAt).getFullYear() === d.getFullYear()).length;
        const snapshot = {};
        products.forEach(p => { snapshot[p.id] = { system: p.currentStock, name: p.name, company: p.company, category: p.category || '', barcode: p.barcode || '', price: priceOf(p) }; });
        const session = {
          id: Date.now(), name: `${d.getMonth() + 1}월 재고조사${sameMonth ? ' ' + (sameMonth + 1) + '차' : ''}`,
          createdAt: Date.now(), finishedAt: null, status: 'active', applied: false, snapshot, actual: {}
        };
        setCounts(prev => [session, ...prev]);
        setOpenCountId(session.id);
        setCountFilter('all');
        showToast(`'${session.name}'을 시작했습니다`, 'success');
      };
      const setCountActual = (sessionId, productId, qty) => {
        setCounts(prev => prev.map(c => {
          if (c.id !== sessionId || c.status !== 'active') return c;
          const actual = { ...c.actual };
          if (qty === null || qty === '' || isNaN(Number(qty))) delete actual[productId];
          else {
            const p = products.find(x => x.id === productId);
            actual[productId] = { qty: Math.max(0, Math.round(Number(qty))), t: Date.now(), system: c.snapshot[productId] ? undefined : (p ? p.currentStock : 0) };
          }
          return { ...c, actual };
        }));
      };
      const renameCount = (sessionId, name) => {
        setCounts(prev => prev.map(c => c.id === sessionId ? { ...c, name: name.slice(0, 40) } : c));
      };
      const finishCount = (apply) => {
        if (!activeCount) return;
        const rows = buildCountRows(activeCount, products);
        if (apply) {
          const map = new Map(rows.filter(r => r.actual != null && !r.removed).map(r => [r.id, r.actual]));
          products.forEach(p => {
            if (map.has(p.id) && map.get(p.id) !== p.currentStock) logHistory(p.id, p.name, map.get(p.id) - p.currentStock, 'count');
          });
          setProducts(prev => prev.map(p => map.has(p.id) ? { ...p, currentStock: map.get(p.id) } : p));
        }
        setCounts(prev => prev.map(c => c.id === activeCount.id ? { ...c, status: 'done', finishedAt: Date.now(), applied: !!apply } : c));
        setShowFinishCount(false);
        showToast(apply ? '실물 수량을 반영하고 조사를 완료했습니다' : '조사를 완료했습니다', 'success');
      };
      const deleteCount = (sessionId) => {
        if (!window.confirm('이 재고조사 기록을 삭제할까요? 재고 수량은 바뀌지 않습니다.')) return;
        setCounts(prev => prev.filter(c => c.id !== sessionId));
        setOpenCountId(null);
      };

      // ----- 바코드 스캔 처리 -----
      const findByBarcode = (code) => {
        const c = String(code).trim();
        return products.find(p => p.barcode && String(p.barcode) === c) || null;
      };
      const openScan = (mode) => { setScanResult(null); setScanMode(mode); };
      const closeScan = () => { setScanMode(null); setScanResult(null); };
      const handleScanCode = (code) => {
        if (scanMode === 'assign') {
          const dup = findByBarcode(code);
          setNewProd(prev => ({ ...prev, barcode: String(code).trim() }));
          showToast(dup ? `이미 '${dup.name}'에 쓰인 바코드입니다` : '바코드를 입력했습니다', dup ? 'error' : 'success');
          closeScan();
          return;
        }
        const p = findByBarcode(code);
        if (!p) { setScanResult({ code, missing: true }); return; }
        if (scanMode === 'count' && activeCount) {
          const a = activeCount.actual[p.id];
          const snap = activeCount.snapshot[p.id];
          setScanQty(a ? a.qty : (snap ? snap.system : p.currentStock));
        }
        setScanResult({ code, productId: p.id });
      };
      const registerMissingBarcode = (code) => {
        closeScan();
        setNewProd(prev => ({ ...prev, barcode: String(code).trim() }));
        setViewMode('manage');
        showToast('바코드를 넣어 두었습니다. 나머지 정보를 입력하세요', 'success');
      };

      // ----- 엑셀 가져오기 / 내보내기 -----
      const handleExcelUpload = async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        setBusy(true);
        try {
          const rows = await readSheetRows(file);
          setImportPlan({ plan: planImport(rows, products), fileName: file.name });
        } catch (err) {
          showToast(err.message || '파일을 읽지 못했습니다', 'error');
        } finally { setBusy(false); }
      };
      const applyImport = () => {
        if (!importPlan) return;
        const { adds, updates } = importPlan.plan;
        const upd = new Map(updates.map(u => [u.id, u.vals]));
        setProducts(prev => [...prev.map(p => upd.has(p.id) ? { ...p, ...upd.get(p.id) } : p), ...adds]);
        setImportPlan(null);
        if (isDemo) setIsDemo(false);
        showToast(`새 품목 ${adds.length}개, 변경 ${updates.length}개를 적용했습니다`, 'success');
      };
      const runExport = async (fn) => {
        setBusy(true);
        try { await fn(); } catch (err) { showToast(err.message || '파일을 만들지 못했습니다', 'error'); } finally { setBusy(false); }
      };

      // ----- 입고 처리: 받은 수량을 재고에 더하고 발주를 마무리 -----
      const applyReceive = (company, rows) => {
        const got = rows.filter(r => r.qty > 0);
        const byName = new Map(got.map(r => [r.name, r.qty]));
        products.forEach(p => {
          if (p.company === company && byName.has(p.name)) {
            logHistory(p.id, p.name, byName.get(p.name), 'restock');
          }
        });
        setProducts(prev => prev.map(p => byName.has(p.name) && p.company === company ? { ...p, currentStock: p.currentStock + byName.get(p.name) } : p));
        setCompletedOrders(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => { if (k.startsWith(company + '::')) delete next[k]; });
          return next;
        });
        logOrderHistory(company, { phone: (products.find(p => p.company === company) || {}).phone, items: got }, 'receive');
        setReceiveOrder(null);
        showToast(`${company} ${got.reduce((a, r) => a + r.qty, 0)}개 입고 처리했습니다`, 'success');
      };

      // ----- 바코드 라벨: 번호 없는 품목에 ZC 번호를 붙이고 출력 -----
      const handlePrintLabels = (ids, sheetKey, copies) => {
        const used = new Set(products.map(p => p.barcode).filter(Boolean));
        let seq = products.reduce((m, p) => { const mm = /^ZC(\d{5})$/.exec(p.barcode || ''); return mm ? Math.max(m, Number(mm[1])) : m; }, 0);
        const assigned = {};
        ids.forEach(id => {
          const p = products.find(x => x.id === id);
          if (p && !p.barcode) {
            let code; do { seq += 1; code = 'ZC' + String(seq).padStart(5, '0'); } while (used.has(code));
            used.add(code); assigned[id] = code;
          }
        });
        const next = products.map(p => assigned[p.id] ? { ...p, barcode: assigned[p.id] } : p);
        if (Object.keys(assigned).length) setProducts(next);
        const list = [];
        ids.forEach(id => { const p = next.find(x => x.id === id); if (p) for (let i = 0; i < copies; i++) list.push(p); });
        if (!printLabels(list, sheetKey)) { showToast('팝업이 막혀 있습니다. 브라우저에서 팝업을 허용해 주세요', 'error'); return; }
        setShowLabels(false);
        showToast(Object.keys(assigned).length ? `${Object.keys(assigned).length}개 품목에 새 바코드를 붙였습니다` : '라벨을 열었습니다', 'success');
      };

      // ----- 핸들러들 -----
      const handleStockChange = (id, value) => {
        const num = value === '' ? 0 : Math.max(0, Number(value));
        setProducts(prev => prev.map(p => p.id === id ? { ...p, currentStock: num } : p));
      };

      // 빠른 차감/증가 (일일 사용용) + Undo 스택 적재
      const handleQuickAdjust = (id, delta) => {
        const product = products.find(p => p.id === id);
        if (!product) return;
        const newStock = Math.max(0, product.currentStock + delta);
        if (newStock === product.currentStock) return;

        const previousStock = product.currentStock;
        setProducts(prev => prev.map(p =>
          p.id === id ? { ...p, currentStock: newStock } : p
        ));
        logHistory(id, product.name, delta, 'quick');
        haptic(delta < 0 ? 8 : 15);

        // Undo 스택 — 최근 10개만 유지
        setUndoStack(prev => {
          const next = [...prev, { id, previousStock, productName: product.name, t: Date.now() }];
          if (next.length > 10) next.shift();
          return next;
        });

        // 알림 강화: 적정선 진입 (이전엔 충분 → 이제 부족)
        if (delta < 0 && newStock < product.safeStock && previousStock >= product.safeStock) {
          haptic(40); // 강한 진동
          showToast(`🔔 ${product.name.slice(0, 16)} — 발주 대상 진입`, 'warn');
        }
        // 알림 강화: 재고 0 도달 (품절)
        else if (delta < 0 && newStock === 0 && previousStock > 0) {
          haptic(60); // 가장 강한 진동
          showToast(`⚠ ${product.name.slice(0, 16)} — 품절! 즉시 발주 필요`, 'error');
        }
      };

      // ----- Undo 마지막 차감 액션 -----
      const handleUndo = () => {
        if (undoStack.length === 0) {
          showToast('되돌릴 작업이 없습니다', 'info');
          return;
        }
        const last = undoStack[undoStack.length - 1];
        const cur = products.find(p => p.id === last.id);
        const back = last.previousStock - (cur ? cur.currentStock : last.previousStock);
        setProducts(prev => prev.map(p =>
          p.id === last.id ? { ...p, currentStock: last.previousStock } : p
        ));
        setUndoStack(prev => prev.slice(0, -1));
        if (back !== 0) logHistory(last.id, last.productName, back, 'quick', { force: true });
        haptic(20);
        showToast(`되돌리기: ${last.productName.slice(0, 14)}`, 'success');
      };

      // ----- 이미지 압축 (Base64, max 400px, 평균 30KB) -----
      const compressImage = (file, maxSize = 192, quality = 0.8, keepAlpha = false) => {
        return new Promise((resolve, reject) => {
          if (!file.type.startsWith('image/')) {
            reject(new Error('이미지 파일이 아닙니다'));
            return;
          }
          // 파일 자체가 너무 크면 거부 (10MB 초과)
          if (file.size > 10 * 1024 * 1024) {
            reject(new Error('파일이 너무 큽니다 (10MB 이하)'));
            return;
          }

          const reader = new FileReader();
          reader.onerror = () => reject(new Error('파일 읽기 실패'));
          reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error('이미지 로드 실패'));
            img.onload = () => {
              let { width, height } = img;
              // 비율 유지하며 max 안에 들어가도록
              if (width > height) {
                if (width > maxSize) { height *= maxSize / width; width = maxSize; }
              } else {
                if (height > maxSize) { width *= maxSize / height; height = maxSize; }
              }
              const canvas = document.createElement('canvas');
              canvas.width = Math.round(width);
              canvas.height = Math.round(height);
              const ctx = canvas.getContext('2d');
              // 부드러운 리사이즈
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              // 투명 배경 로고는 PNG로 유지 (JPG로 바꾸면 배경이 검게 됨)
              const dataUrl = keepAlpha && /png|webp|gif|svg/.test(file.type) ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality);
              resolve(dataUrl);
            };
            img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        });
      };

      // ----- 제품 정보 일괄 수정 (모든 필드) -----
      const handleUpdateProduct = (id, patch) => {
        setProducts(prev => prev.map(p =>
          p.id === id ? { ...p, ...patch } : p
        ));
        showToast('수정 완료', 'success');
      };

      // ----- 거래처 일괄 수정 (같은 거래처의 모든 제품 동기화) -----
      const handleUpdateCompany = (oldName, newName, newPhone) => {
        setProducts(prev => prev.map(p =>
          p.company === oldName
            ? { ...p, company: newName.trim() || oldName, phone: (newPhone || p.phone).replace(/[^0-9]/g, '') }
            : p
        ));
        showToast(`거래처 정보 수정 (${oldName})`, 'success');
      };

      // ----- 제품 이미지 업로드 핸들러 -----
      const handleProductImageUpload = async (id, file) => {
        try {
          const dataUrl = await compressImage(file);
          handleUpdateProduct(id, { image: dataUrl });
        } catch (err) {
          showToast('이미지 업로드 실패: ' + err.message, 'error');
        }
      };

      // ----- 신규 제품 등록시 이미지 업로드 -----
      const handleNewImageUpload = async (file) => {
        try {
          const dataUrl = await compressImage(file);
          setNewProd(prev => ({ ...prev, image: dataUrl }));
          showToast('이미지 첨부됨', 'success');
        } catch (err) {
          showToast('이미지 처리 실패: ' + err.message, 'error');
        }
      };

      // ----- 로고 이미지 업로드 -----
      const handleLogoUpload = async (file) => {
        try {
          // 로고: 160px, 투명 배경 유지
          const dataUrl = await compressImage(file, 160, 0.85, true);
          setBranding(prev => ({ ...prev, logoImage: dataUrl }));
          showToast('로고가 업데이트되었습니다', 'success');
        } catch (err) {
          showToast('로고 업로드 실패: ' + err.message, 'error');
        }
      };

      // ----- 브랜딩 초기화 -----
      const resetBranding = () => {
        if (window.confirm('앱 이름, 태그라인, 로고를 모두 기본값으로 되돌리시겠습니까?')) {
          setBranding(DEFAULT_BRANDING);
          showToast('브랜딩 초기화 완료', 'success');
        }
      };
      // ----- 발주 완료 처리 -----
      // 거래처+발주 품목 해시로 고유 키 생성 (재고가 다시 채워지면 자동으로 같은 발주가 사라짐)
      const makeOrderKey = (company, items) => {
        const sig = items.map(it => `${it.name}:${it.qty}`).sort().join('|');
        return `${company}::${sig}`;
      };

      const handleMarkOrderComplete = (company, info) => {
        const key = makeOrderKey(company, info.items);
        setCompletedOrders(prev => ({ ...prev, [key]: Date.now() }));
        // 이력에도 기록 (채널: complete)
        logOrderHistory(company, info, 'complete');
        haptic(15);
        showToast(`${company} 발주 완료 처리`, 'success');
      };

      const handleUnmarkOrderComplete = (company, info) => {
        const key = makeOrderKey(company, info.items);
        setCompletedOrders(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        showToast(`${company} 완료 표시 해제`, 'info');
      };

      // 오래된 완료 표시 자동 정리 (30일 이상)
      useEffect(() => {
        const now = Date.now();
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
        const stale = Object.entries(completedOrders).filter(([k, t]) => now - t > THIRTY_DAYS);
        if (stale.length > 0) {
          setCompletedOrders(prev => {
            const next = { ...prev };
            stale.forEach(([k]) => delete next[k]);
            return next;
          });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      // 거래처 목록 (자동완성용)
      const companyList = useMemo(() => {
        const set = new Set(products.map(p => p.company).filter(Boolean));
        return Array.from(set).sort();
      }, [products]);

      // 거래처별 마지막 전화번호 (자동 매칭)
      const companyPhoneMap = useMemo(() => {
        const map = {};
        products.forEach(p => { if (p.company && p.phone) map[p.company] = p.phone; });
        return map;
      }, [products]);

      // ----- 전체 데이터 초기화 (위험 작업, 이중 확인) -----
      const handleResetAll = () => {
        const first = window.confirm(
          '⚠ 모든 데이터를 영구 삭제합니다.\n\n' +
          '· 제품 마스터 (' + products.length + '개)\n' +
          '· 변동 히스토리\n' +
          '· 발주 완료 표시\n' +
          '· 브랜딩 (앱 이름/로고)\n\n' +
          '이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?'
        );
        if (!first) return;
        const second = window.confirm('정말 모든 데이터를 삭제합니다. 한 번 더 확인합니다.');
        if (!second) return;

        try {
          // filo_ 로 시작하는 모든 데이터 삭제 (거래처·발주 이력 포함). 첫 방문 가이드 표시 여부는 유지.
          const keys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('filo_') && k !== 'filo_guide_seen') keys.push(k);
          }
          keys.forEach(k => localStorage.removeItem(k));
          showToast('모든 데이터가 삭제되었습니다. 새로고침합니다...', 'info');
          setTimeout(() => window.location.reload(), 1200);
        } catch (e) {
          showToast('초기화 실패: ' + e.message, 'error');
        }
      };

      // ----- 빈 상태로 시작 (가이드 · 샘플 배너 공용) -----
      const startEmpty = () => {
        setProducts([]);
        setCompanies([]);
        setOrderHistory([]);
        setCompletedOrders({});
        try { localStorage.removeItem('filo_history'); } catch (e) {}
        setIsDemo(false);
        showToast('내 약제를 등록해 시작하세요', 'success');
        setViewMode('manage');
      };

      // ----- 전체 백업 (JSON) / 복원 -----
      // 제품·거래처·발주 이력·사용 히스토리·설정까지 filo_ 데이터를 모두 한 파일로 저장합니다.
      const BACKUP_EXCLUDE = ['filo_last_backup'];
      const BACKUP_KEEP_ON_RESTORE = ['filo_last_backup', 'filo_guide_seen'];

      const downloadBackup = () => {
        try {
          const data = {};
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith('filo_') || BACKUP_EXCLUDE.includes(k)) continue;
            const raw = localStorage.getItem(k);
            try { data[k] = JSON.parse(raw); } catch (e) { data[k] = raw; }
          }
          if (Object.keys(data).length === 0) {
            showToast('백업할 데이터가 없습니다', 'error');
            return;
          }
          const now = new Date();
          const payload = {
            app: 'zerocount',
            version: 1,
            exportedAt: now.toISOString(),
            data
          };
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          const pad = (n) => String(n).padStart(2, '0');
          const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `zerocount_backup_${ts}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          const iso = now.toISOString();
          safeStorage.set('filo_last_backup', iso);
          setLastBackup(iso);
          const n = Array.isArray(data.filo_products) ? data.filo_products.length : 0;
          showToast(`전체 백업 완료 (제품 ${n}개)`, 'success');
        } catch (e) {
          showToast('백업 실패: ' + e.message, 'error');
        }
      };

      const handleBackupRestore = (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onerror = () => showToast('파일을 읽을 수 없습니다', 'error');
        reader.onload = (ev) => {
          let parsed;
          try {
            parsed = JSON.parse(ev.target.result);
          } catch (err) {
            showToast('백업 파일이 아닙니다 (JSON 형식 오류)', 'error');
            return;
          }
          const data = parsed && (parsed.app === 'zerocount' || parsed.app === 'filo') && parsed.data && typeof parsed.data === 'object' ? parsed.data : null;
          const keys = data ? Object.keys(data).filter(k => k.startsWith('filo_') && !BACKUP_EXCLUDE.includes(k)) : [];
          if (!data || keys.length === 0) {
            showToast('ZEROCOUNT 백업 파일이 아닙니다', 'error');
            return;
          }
          const count = Array.isArray(data.filo_products) ? data.filo_products.length : 0;
          const when = parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString('ko-KR') : '알 수 없음';
          const ok = window.confirm(
            '백업 파일로 복원합니다.\n\n' +
            '· 백업 시각: ' + when + '\n' +
            '· 제품: ' + count + '개\n\n' +
            '현재 이 기기의 데이터는 백업 내용으로 완전히 교체됩니다.\n' +
            '(복원 전에 현재 데이터를 먼저 백업해 두는 것을 권장합니다)\n\n' +
            '계속하시겠습니까?'
          );
          if (!ok) return;

          // 실패 시 되돌릴 수 있도록 현재 상태 스냅샷
          const snapshot = {};
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith('filo_')) snapshot[k] = localStorage.getItem(k);
            }
            Object.keys(snapshot)
              .filter(k => !keys.includes(k) && !BACKUP_KEEP_ON_RESTORE.includes(k))
              .forEach(k => localStorage.removeItem(k));
            keys.forEach(k => localStorage.setItem(k, JSON.stringify(data[k])));
            showToast('복원 완료. 새로고침합니다...', 'success');
            setTimeout(() => window.location.reload(), 900);
          } catch (err) {
            // 롤백
            try {
              Object.keys(snapshot).forEach(k => localStorage.setItem(k, snapshot[k]));
              keys.filter(k => !(k in snapshot)).forEach(k => localStorage.removeItem(k));
            } catch (e2) {}
            showToast('복원 실패 (기존 데이터는 유지됨): ' + err.message, 'error');
          }
        };
        reader.readAsText(file);
      };

      // ----- CSV Export -----
      const downloadCSV = () => {
        const header = ['제품명', '거래처', '전화번호', '현재고', '적정선', '이미지URL'];
        const rows = products.map(p => [
          p.name, p.company, p.phone, p.currentStock, p.safeStock, p.image
        ]);
        const csv = [header, ...rows]
          .map(row => row.map(cell => {
            const s = String(cell ?? '');
            // 콤마/따옴표/개행 포함시 따옴표로 감싸기
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          }).join(','))
          .join('\n');

        // BOM 추가 (엑셀 한글 호환)
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ts = new Date().toISOString().slice(0, 10);
        a.download = `filo_inventory_${ts}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`CSV 내보내기 완료 (${products.length}개)`, 'success');
      };

      // ----- CSV Import (간단한 파서) -----
      const parseCSV = (text) => {
        // BOM 제거
        text = text.replace(/^\uFEFF/, '').trim();
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) return [];

        const parseLine = (line) => {
          const result = [];
          let cur = '';
          let inQuote = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuote) {
              if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; }
              else if (ch === '"') inQuote = false;
              else cur += ch;
            } else {
              if (ch === '"') inQuote = true;
              else if (ch === ',') { result.push(cur); cur = ''; }
              else cur += ch;
            }
          }
          result.push(cur);
          return result;
        };

        // 첫 줄은 헤더 (스킵)
        return lines.slice(1).filter(l => l.trim()).map(line => {
          const [name, company, phone, currentStock, safeStock, image] = parseLine(line);
          return {
            name: (name || '').trim(),
            company: (company || '').trim(),
            phone: (phone || '').replace(/[^0-9]/g, ''),
            currentStock: Math.max(0, parseInt(currentStock) || 0),
            safeStock: Math.max(1, parseInt(safeStock) || 5),
            image: (image || '').trim()
          };
        }).filter(p => p.name && p.company);
      };

      const handleCSVUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const parsed = parseCSV(ev.target.result);
            if (parsed.length === 0) {
              showToast('CSV에서 유효한 데이터를 찾을 수 없습니다', 'error');
              return;
            }
            setCsvPreview(parsed);
          } catch (err) {
            showToast('CSV 파싱 실패: ' + err.message, 'error');
          }
        };
        reader.readAsText(file, 'UTF-8');
        e.target.value = ''; // 같은 파일 재선택 가능
      };

      const confirmCSVImport = (mode) => {
        if (!csvPreview) return;
        const items = csvPreview.map((p, i) => ({ ...p, id: Date.now() + i }));

        if (mode === 'replace') {
          setProducts(items);
          showToast(`전체 교체 완료 (${items.length}개)`, 'success');
        } else {
          setProducts(prev => [...prev, ...items]);
          showToast(`추가 완료 (+${items.length}개)`, 'success');
        }
        setCsvPreview(null);
      };

      const handleAddProduct = (e) => {
        e.preventDefault();
        if (!newProd.name || !newProd.company || !newProd.phone) {
          alert('필수 항목들을 채워주세요.');
          return;
        }
        const bc = (newProd.barcode || '').trim();
        const dup = bc && products.find(p => p.barcode && String(p.barcode) === bc);
        if (dup) { showToast(`바코드가 '${dup.name}'와 겹칩니다`, 'error'); return; }
        const item = {
          id: Date.now(),
          name: newProd.name.trim(),
          barcode: bc,
          company: newProd.company.trim(),
          phone: newProd.phone.replace(/[^0-9]/g, ''),
          category: (newProd.category || '').trim(),
          safeStock: Math.max(1, Number(newProd.safeStock) || 1),
          currentStock: Math.max(0, Number(newProd.currentStock) || 0),
          price: Math.max(0, Math.round(Number(newProd.price) || 0)),
          image: newProd.image.trim()
        };
        setProducts(prev => [...prev, item]);
        setNewProd({ name: '', barcode: '', company: '', phone: '', category: '', safeStock: 0, currentStock: 0, price: '', image: '' });
        if (isDemo) setIsDemo(false);
        showToast(`'${item.name}'을 등록했습니다`, 'success');
      };

      const handleDeleteProduct = (id) => {
        if (window.confirm('선택하신 제품을 마스터 리스트에서 완전히 지우시겠습니까?')) {
          setProducts(prev => prev.filter(p => p.id !== id));
        }
      };

      // 거래처별 발주 분류
      const groupedOrders = useMemo(() => {
        const needed = products.filter(p => p.currentStock < p.safeStock);
        const groups = {};
        needed.forEach(p => {
          if (!groups[p.company]) {
            groups[p.company] = { phone: p.phone, items: [] };
          }
          groups[p.company].items.push({ name: p.name, qty: p.safeStock - p.currentStock });
        });
        return groups;
      }, [products]);

      // 발주중인 제품명 Set (발주 완료 처리된 거래처에 속한 제품들)
      const orderingProductNames = useMemo(() => {
        const set = new Set();
        Object.entries(groupedOrders).forEach(([company, info]) => {
          const key = makeOrderKey(company, info.items);
          if (completedOrders[key]) {
            info.items.forEach(it => set.add(it.name));
          }
        });
        return set;
      }, [groupedOrders, completedOrders]);

      // 발주서 텍스트 생성 (SMS / 복사 공통)
      const buildOrderText = (company, info) => {
        const itemString = info.items.map(item => `- ${item.name}: ${item.qty}개`).join('\n');
        const salonLabel = branding.appName && !['ZEROCOUNT', 'ZERO COUNT'].includes(branding.appName) ? `${branding.appName} ` : '';
        return `[${salonLabel}발주 요청]\n\n안녕하세요 사장님,\n아래 제품 발주 요청드립니다.\n\n${itemString}\n\n확인 후 배송 부탁드립니다. 감사합니다.`;
      };

      // SMS 딥링크 — 사용자 커스텀 앱 이름 반영 + 이력 로깅
      const sendSmsMessage = (company, info, customText) => {
        const textBody = customText || buildOrderText(company, info);
        logOrderHistory(company, info, 'sms', customText);
        window.location.href = `sms:${info.phone}?body=${encodeURIComponent(textBody)}`;
      };

      // 클립보드 복사 — 카톡/메모장/어디든 붙여넣기
      const copyOrderText = async (company, info, customText) => {
        const text = customText || buildOrderText(company, info);
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            haptic(15);
            showToast(`${company} 발주서 복사됨`, 'success');
            return true;
          }
          throw new Error('Clipboard API not available');
        } catch (err) {
          try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.top = '0';
            ta.style.left = '0';
            ta.style.opacity = '0';
            ta.style.pointerEvents = 'none';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            if (ok) {
              haptic(15);
              showToast(`${company} 발주서 복사됨`, 'success');
              return true;
            } else {
              throw new Error('execCommand failed');
            }
          } catch (e2) {
            showToast('복사 실패 — 직접 선택하여 복사해주세요', 'error');
            return false;
          }
        }
      };

      // ===== 발주 이력 로깅 =====
      const logOrderHistory = (company, info, channel, customMessage) => {
        const entry = {
          id: Date.now(),
          t: Date.now(),
          company,
          phone: info.phone,
          items: info.items.map(it => ({ name: it.name, qty: it.qty })),
          totalQty: info.items.reduce((sum, it) => sum + it.qty, 0),
          channel, // 'sms' | 'copy' | 'preview'
          message: customMessage || null
        };
        setOrderHistory(prev => {
          const next = [entry, ...prev]; // 최신순
          // 최근 500건만 유지
          if (next.length > 500) next.length = 500;
          return next;
        });
      };

      // ===== 거래처 마스터 추가 (제품 없이도 등록 가능) =====
      const handleAddCompany = (name, phone, memo) => {
        const cleanName = name.trim();
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (!cleanName || !cleanPhone) {
          showToast('거래처명과 전화번호는 필수입니다', 'error');
          return false;
        }
        // 중복 체크 (이름 기준)
        if (companies.some(c => c.name === cleanName) || products.some(p => p.company === cleanName)) {
          showToast(`이미 등록된 거래처입니다: ${cleanName}`, 'warn');
          return false;
        }
        setCompanies(prev => [...prev, {
          id: Date.now(),
          name: cleanName,
          phone: cleanPhone,
          memo: (memo || '').trim()
        }]);
        showToast(`거래처 등록 완료: ${cleanName}`, 'success');
        return true;
      };

      const handleDeleteCompany = (id) => {
        const c = companies.find(x => x.id === id);
        if (!c) return;
        // 해당 거래처에 연결된 제품이 있는지 확인
        const linkedProducts = products.filter(p => p.company === c.name);
        const msg = linkedProducts.length > 0
          ? `"${c.name}" 거래처를 삭제하시겠습니까?\n(연결된 제품 ${linkedProducts.length}개의 거래처 정보는 그대로 유지됩니다)`
          : `"${c.name}" 거래처를 삭제하시겠습니까?`;
        if (window.confirm(msg)) {
          setCompanies(prev => prev.filter(x => x.id !== id));
          showToast('거래처 삭제됨', 'info');
        }
      };

      // 통합 거래처 목록 (마스터 + 제품에서 추출)
      const allCompanyList = useMemo(() => {
        const set = new Set();
        companies.forEach(c => set.add(c.name));
        products.forEach(p => { if (p.company) set.add(p.company); });
        return Array.from(set).sort();
      }, [companies, products]);

      // 카테고리 목록 (마스터 제품에서 추출)
      const categoryList = useMemo(() => {
        const set = new Set();
        products.forEach(p => { if (p.category) set.add(p.category); });
        return Array.from(set).sort();
      }, [products]);

      // 오늘 사용 내역 (차감 기록 중 오늘 날짜만)
      const todayUsage = useMemo(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const startMs = todayStart.getTime();
        const allHistory = safeStorage.get('filo_history', []);
        return allHistory
          .filter(h => h.t >= startMs && h.delta < 0 && h.source !== 'count') // 차감(사용)만, 재고조사 보정 제외
          .map(h => ({ ...h, productName: h.productName || h.name || '알 수 없음' }))
          .sort((a, b) => b.t - a.t);
      }, [products, showTodayUsage, historyTick]); // 차감 · 정정 · 취소 시 재계산
      const todayQty = todayUsage.reduce((a, u) => a + Math.abs(u.delta), 0);

      // ----- 적정선 추천: 최근 4주 빠른 차감 기록 기준 -----
      const safeStockReco = useMemo(() => {
        const DAY = 86400000, now = Date.now(), from = now - 28 * DAY;
        const hist = safeStorage.get('filo_history', []);
        const firstSeen = {}, used = {};
        hist.forEach(h => {
          if (h.id == null) return;
          if (firstSeen[h.id] == null || h.t < firstSeen[h.id]) firstSeen[h.id] = h.t;
          if (h.source === 'quick' && h.delta < 0 && h.t >= from) used[h.id] = (used[h.id] || 0) + -h.delta;
        });
        return products.map(p => {
          const qty = used[p.id] || 0;
          const days = firstSeen[p.id] == null ? 0 : Math.min(28, (now - Math.max(firstSeen[p.id], from)) / DAY);
          if (days < 7 || qty < 3) return null;
          const perDay = qty / days;
          const rec = Math.max(1, Math.ceil(perDay * recoDays));
          return { id: p.id, name: p.name, current: p.safeStock, rec, qty, days: Math.round(days), perDay };
        }).filter(r => r && r.rec !== r.current);
      }, [products, historyTick, recoDays]);
      const applyReco = (list) => {
        const m = new Map(list.map(r => [r.id, r.rec]));
        setProducts(prev => prev.map(p => m.has(p.id) ? { ...p, safeStock: m.get(p.id) } : p));
        showToast(`${list.length}개 품목의 적정선을 바꿨습니다`, 'success');
      };

      // ----- 약제비: 재고 금액 · 이번 달 / 지난 달 사용 금액 -----
      const costStats = useMemo(() => {
        const priced = products.filter(p => priceOf(p) > 0);
        if (!priced.length) return null;
        const priceById = new Map(products.map(p => [p.id, priceOf(p)]));
        const now = new Date();
        const thisStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
        let thisMonth = 0, lastMonth = 0; const byItem = {};
        safeStorage.get('filo_history', []).forEach(h => {
          if (!(h.delta < 0) || h.source === 'count') return;
          const amt = -h.delta * (priceById.get(h.id) || 0);
          if (!amt) return;
          if (h.t >= thisStart) { thisMonth += amt; byItem[h.id] = (byItem[h.id] || 0) + amt; }
          else if (h.t >= lastStart) lastMonth += amt;
        });
        const top = Object.entries(byItem).sort((a, b) => b[1] - a[1]).slice(0, 5)
          .map(([id, amt]) => ({ name: (products.find(p => String(p.id) === id) || {}).name || '삭제된 품목', amt }));
        return {
          stockValue: priced.reduce((a, p) => a + p.currentStock * priceOf(p), 0),
          thisMonth, lastMonth, top, priced: priced.length, total: products.length,
        };
      }, [products, historyTick]);

      // 월별 통계 계산
      const monthlyStats = useMemo(() => {
        const allHistory = safeStorage.get('filo_history', []);
        const now = new Date();

        let thisStart, lastStart, lastEnd;
        if (stockCycle === 'weekly') {
          // 이번 주 시작 (월요일 기준)
          const day = now.getDay(); // 0=일
          const diff = day === 0 ? 6 : day - 1; // 월요일까지의 일수
          const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
          monday.setHours(0, 0, 0, 0);
          thisStart = monday.getTime();
          lastStart = thisStart - 7 * 24 * 60 * 60 * 1000;
          lastEnd = thisStart;
        } else {
          thisStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
          lastEnd = thisStart;
        }

        const thisEntries = allHistory.filter(h => h.t >= thisStart && h.delta < 0 && h.source !== 'count');
        const lastEntries = allHistory.filter(h => h.t >= lastStart && h.t < lastEnd && h.delta < 0 && h.source !== 'count');

        const thisMonthQty = thisEntries.reduce((s, h) => s + Math.abs(h.delta), 0);
        const lastMonthQty = lastEntries.reduce((s, h) => s + Math.abs(h.delta), 0);

        const productQty = {};
        thisEntries.forEach(h => {
          const pname = h.productName || h.name || '알 수 없음';
          productQty[pname] = (productQty[pname] || 0) + Math.abs(h.delta);
        });
        const topProducts = Object.entries(productQty)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        const thisMonthOrders = (orderHistory || []).filter(o => o.t >= thisStart).length;
        const lastMonthOrders = (orderHistory || []).filter(o => o.t >= lastStart && o.t < lastEnd).length;

        return {
          thisMonthQty,
          lastMonthQty,
          diffPct: lastMonthQty > 0 ? Math.round((thisMonthQty - lastMonthQty) / lastMonthQty * 100) : null,
          topProducts,
          thisMonthOrders,
          lastMonthOrders,
          totalRecords: allHistory.length
        };
      }, [products, orderHistory, showStats, stockCycle, historyTick]);

      // 거래처별 전화번호 통합 매핑
      const allPhoneMap = useMemo(() => {
        const map = {};
        // 제품에서 추출
        products.forEach(p => { if (p.company && p.phone) map[p.company] = p.phone; });
        // 거래처 마스터로 덮어쓰기 (마스터가 우선)
        companies.forEach(c => { if (c.name && c.phone) map[c.name] = c.phone; });
        return map;
      }, [companies, products]);

      // 이미지 로드 실패 폴백
      const handleImgError = (e) => {
        if (e.target.src !== FALLBACK_IMAGE) e.target.src = FALLBACK_IMAGE;
      };

      const navShortageCount = products.filter(p => p.currentStock < p.safeStock && !orderingProductNames.has(p.name)).length;

      return (
        <div className={`min-h-screen ${theme.bg} ${theme.text} transition-colors duration-300 font-sans antialiased flex flex-col md:flex-row`}>

          {/* ====== 좌측 사이드바 (데스크탑: 고정, 모바일: 슬라이드) ====== */}
          {sidebarOpen && (
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <aside className={`
            hidden md:flex md:sticky top-0 left-0
            w-64 h-screen flex-shrink-0
            f-sidebar flex-col p-5
          `}>
            {/* 브랜드 */}
            <div className="mb-8 f-brand">
              {branding.logoImage
                ? <img src={branding.logoImage} alt="" className="w-[30px] h-[30px] object-contain flex-shrink-0" />
                : <span className="f-brand-mark"><ZMark size={22} /></span>}
              <div className="min-w-0 flex-1">
                <h1 className="f-brand-name">{branding.appName === 'ZEROCOUNT' ? <Wordmark /> : branding.appName}</h1>
                <p className="f-brand-sub">{branding.tagline}</p>
              </div>
            </div>

            {/* 메뉴 */}
            <p className="f-side-label">메뉴</p>
            <nav className="f-side-nav flex-1" aria-label="주요 메뉴">
              {NAV_ITEMS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setViewMode(m.key)}
                  className={`f-side-link ${viewMode === m.key ? 'is-active' : ''}`}
                  aria-current={viewMode === m.key ? 'page' : undefined}
                >
                  <Icon name={m.key} size={20} />
                  <span>{m.label}</span>
                  {m.key === 'dashboard' && navShortageCount > 0 && <span className="f-tab-dot">{navShortageCount}</span>}
                </button>
              ))}
            </nav>

            {/* 하단 설정 */}
            <div className="mt-4 pt-4 f-side-foot flex flex-col gap-1">
              <button onClick={toggleTheme} className="f-side-link">
                <Icon name={currentThemeKey === 'night' ? 'sun' : 'moon'} size={20} />
                <span>{currentThemeKey === 'night' ? '밝은 화면' : '어두운 화면'}</span>
              </button>
              <button onClick={() => setShowSettings(true)} className="f-side-link">
                <Icon name="settings" size={20} />
                <span>설정</span>
              </button>
              <div className="f-side-user">
                <span className="f-avatar">{(branding.appName || 'F').trim().charAt(0)}</span>
                <div className="min-w-0">
                  <b>{branding.appName}</b>
                  <small>이 기기에 저장됨</small>
                </div>
              </div>
            </div>
          </aside>

          {/* 모바일 하단 탭바 */}
          <nav className="f-tabbar md:hidden" aria-label="주요 메뉴">
            {NAV_ITEMS.map(m => (
              <button
                key={m.key}
                onClick={() => { setViewMode(m.key); window.scrollTo(0, 0); }}
                className={`f-tab ${viewMode === m.key ? 'is-active' : ''}`}
                aria-current={viewMode === m.key ? 'page' : undefined}
              >
                <span className="f-tab-icon"><Icon name={m.key} size={20} /></span>
                <span>{m.label}</span>
                {m.key === 'dashboard' && navShortageCount > 0 && <span className="f-tab-dot">{navShortageCount}</span>}
              </button>
            ))}
          </nav>

                    {/* ====== 메인 컨텐츠 영역 ====== */}
          <main className="flex-1 min-w-0 p-4 md:p-8 pb-28 md:pb-12">

            {/* 모바일 상단바 */}
            <div className="f-topbar md:hidden">
              <div className="f-brand">
                {branding.logoImage
                  ? <img src={branding.logoImage} alt="" className="w-[30px] h-[30px] object-contain flex-shrink-0" />
                  : <span className="f-brand-mark"><ZMark size={22} /></span>}
                <div className="min-w-0">
                  <h1 className="f-brand-name">{branding.appName === 'ZEROCOUNT' ? <Wordmark /> : branding.appName}</h1>
                  <p className="f-brand-sub">{branding.tagline}</p>
                </div>
              </div>
              <div className="flex items-center">
                <button onClick={toggleTheme} className="f-icon-btn" aria-label={currentThemeKey === 'night' ? '밝은 화면으로' : '어두운 화면으로'}>
                  <Icon name={currentThemeKey === 'night' ? 'sun' : 'moon'} size={20} />
                </button>
                <button onClick={() => setShowSettings(true)} className="f-icon-btn" aria-label="설정">
                  <Icon name="settings" size={20} />
                </button>
              </div>
            </div>

          {isOldOrigin && (
            <div className="zc-move-banner" role="status">
              {transferState === 'done' ? (
                <>
                  <p><b>기록을 옮겼습니다.</b> 앞으로는 새 주소 <b>zerocount.vercel.app</b> 을 써 주세요. 홈 화면 아이콘도 새 주소로 다시 추가해 주세요.</p>
                  <a className="zc-btn-primary" href={NEW_ORIGIN + '/app/'}>새 주소 열기</a>
                </>
              ) : (
                <>
                  <p><b>주소가 zerocount.vercel.app 으로 바뀌었어요.</b> 이 폰에 있는 기록을 새 주소로 옮겨 주세요. 버튼 한 번이면 됩니다.</p>
                  <button className="zc-btn-primary" onClick={startTransfer} disabled={transferState === 'waiting'}>
                    {transferState === 'waiting' ? '옮기는 중…' : transferState === 'declined' ? '다시 시도' : '기록 가지고 새 주소로 이동'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* 헤더는 사이드바로 대체됨 */}

          {/* TAB 0: 빠른 차감 (일일 사용) */}
          {/* TAB: 홈 대시보드 */}
          {viewMode === 'home' && (() => {
            const total = products.length;
            const shortage = products.filter(p => p.currentStock < p.safeStock);
            const outCount = products.filter(p => p.currentStock === 0).length;
            const lowCount = shortage.length - outCount;
            const okCount = total - shortage.length;
            const okPct = total ? Math.round((okCount / total) * 100) : 0;
            const needOrder = shortage.filter(p => !orderingProductNames.has(p.name));
            const lastOrderT = (orderHistory || []).reduce((m, o) => Math.max(m, o.t || 0), 0);
            const now = new Date();
            const weekday = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];

            // 최근 7일 사용량 (차감 기록 기준)
            const day0 = new Date(); day0.setHours(0, 0, 0, 0); day0.setDate(day0.getDate() - 6);
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(day0); d.setDate(day0.getDate() + i);
              return { start: d.getTime(), label: `${d.getMonth() + 1}.${d.getDate()}`, qty: 0 };
            });
            safeStorage.get('filo_history', []).forEach(h => {
              if (!(h.delta < 0) || h.source === 'count' || h.t < days[0].start) return;
              for (let i = days.length - 1; i >= 0; i--) {
                if (h.t >= days[i].start) { days[i].qty += -h.delta; break; }
              }
            });
            const weekTotal = days.reduce((a, d) => a + d.qty, 0);
            const maxQty = Math.max(1, ...days.map(d => d.qty));

            // 도넛: 정상 / 부족 / 품절
            const R = 52, C = 2 * Math.PI * R;
            const segs = total ? [
              { v: okCount, color: 'var(--f-accent)' },
              { v: lowCount, color: 'var(--f-warn)' },
              { v: outCount, color: 'var(--f-alert)' },
            ] : [];
            let acc = 0;

            const attention = [...shortage]
              .sort((a, b) => (a.currentStock / a.safeStock) - (b.currentStock / b.safeStock))
              .slice(0, 6);

            return (
              <div className="max-w-6xl mx-auto">
                <section className="f-hero">
                  <div className="relative z-[1] min-w-0">
                    <p className="f-hero-date">{now.getMonth() + 1}월 {now.getDate()}일 ({weekday})</p>
                    <h2>약장 현황을<br />한눈에 확인하세요</h2>
                    <p>{total === 0 ? '품목을 등록하면 약장 현황이 여기에 보여요.' : needOrder.length > 0 ? `지금 발주가 필요한 약이 ${needOrder.length}개 있어요.` : '모든 약이 적정선 위에 있어요.'}</p>
                  </div>
                  <button className="f-hero-btn" onClick={() => setViewMode('quick')}>
                    빠른 차감 시작 <Icon name="arrow" size={16} strokeWidth={2.4} />
                  </button>
                </section>

                {showInstallHint && !isDemo && (
                  <div className="f-notice">
                    <p><b>홈 화면에 추가해 주세요.</b> 아이폰은 오래 열지 않으면 브라우저가 기록을 지울 수 있어요. 공유 버튼 → '홈 화면에 추가'를 누르면 앱처럼 열리고 더 안전하게 보관됩니다.</p>
                    <button onClick={closeInstallHint} className="zc-btn-ghost" style={{ height: 36 }}>닫기</button>
                  </div>
                )}
                {isDemo ? (
                  <div className="f-notice is-demo">
                    <p><b>샘플 데이터</b>로 체험 중입니다. 차감, 발주 문자 미리보기까지 마음껏 눌러 보세요.</p>
                    <button onClick={startEmpty} className="f-notice-btn">내 약제로 시작</button>
                  </div>
                ) : products.length > 0 && (!lastBackup || (Date.now() - new Date(lastBackup).getTime()) > 14 * 86400000) && (
                  <div className="f-notice">
                    <p>
                      {lastBackup
                        ? `마지막 백업이 ${Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000)}일 전입니다.`
                        : '아직 백업한 적이 없습니다.'}
                      {' '}폰을 바꾸거나 브라우저 기록을 지우면 데이터가 사라질 수 있어요.
                    </p>
                    <button onClick={downloadBackup} className="f-notice-btn">지금 백업</button>
                  </div>
                )}


                {total === 0 ? (
                  <section className="f-panel" style={{ marginBottom: 16 }}>
                    <div className="zc-empty">
                      <img src="empty-boxes.webp" width="128" height="128" alt="" className="zc-empty-img" />
                      <b>등록된 품목이 없어요</b>
                      <p>품목을 하나씩 등록하거나, 정리해 둔 엑셀을 올려 한 번에 시작하세요.</p>
                      <button className="zc-btn-primary" onClick={() => setViewMode('manage')}>품목 등록하기</button>
                    </div>
                  </section>
                ) : (<>
                {activeCount ? (() => {
                  const sm = countSummary(buildCountRows(activeCount, products));
                  return (
                    <button className="zc-active-card" onClick={() => { setViewMode('stocktake'); setOpenCountId(activeCount.id); }}>
                      <div className="zc-active-left">
                        <span className="f-badge is-pending" style={{ marginLeft: 0 }}>재고조사 진행중</span>
                        <b>{activeCount.name}</b>
                        <small>전체 {sm.total} · 조사 완료 {sm.done} · 미조사 {sm.left} · 차이 {sm.diff}</small>
                      </div>
                      <div className="zc-active-right">
                        <span className="zc-pct">{sm.pct}%</span>
                        <span className="zc-progress"><i style={{ width: `${sm.pct}%` }} /></span>
                      </div>
                    </button>
                  );
                })() : null}

                <div className="f-kpis">
                  <div className="f-kpi tone-blue">
                    <span className="f-kpi-icon"><Icon name="box" size={20} /></span>
                    <div><p className="f-kpi-label">등록 품목</p><p className="f-kpi-value">{total}<small>개</small></p></div>
                  </div>
                  <div className="f-kpi tone-green">
                    <span className="f-kpi-icon"><Icon name="check" size={20} /></span>
                    <div><p className="f-kpi-label">정상 재고</p><p className="f-kpi-value">{okPct}<small>%</small></p></div>
                  </div>
                  <button className="f-kpi tone-orange" onClick={() => setViewMode('dashboard')}>
                    <span className="f-kpi-icon"><Icon name="alert" size={20} /></span>
                    <div><p className="f-kpi-label">발주 필요</p><p className="f-kpi-value">{needOrder.length}<small>건</small></p></div>
                  </button>
                  <div className="f-kpi tone-blue">
                    <span className="f-kpi-icon"><Icon name="clock" size={20} /></span>
                    <div>
                      <p className="f-kpi-label">최근 발주</p>
                      <p className="f-kpi-value">
                        {lastOrderT ? `${new Date(lastOrderT).getMonth() + 1}.${new Date(lastOrderT).getDate()}` : '–'}
                        {lastOrderT ? <small>({['일','월','화','수','목','금','토'][new Date(lastOrderT).getDay()]})</small> : null}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="f-panels">
                  <section className="f-panel">
                    <div className="f-panel-head">
                      <div><h3 className="f-panel-title">재고 상태</h3><p className="f-panel-sub">적정선 기준</p></div>
                    </div>
                    <div className="f-donut-wrap">
                      <div className="f-donut">
                        <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
                          <circle cx="66" cy="66" r={R} fill="none" stroke="var(--f-surface-2)" strokeWidth="14" />
                          {segs.map((sg, i) => {
                            if (!sg.v) return null;
                            const len = (sg.v / total) * C;
                            const el = <circle key={i} cx="66" cy="66" r={R} fill="none" stroke={sg.color} strokeWidth="14"
                              strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-acc} strokeLinecap="butt" />;
                            acc += len;
                            return el;
                          })}
                        </svg>
                        <div className="f-donut-center"><div><b>{okPct}%</b><small>정상</small></div></div>
                      </div>
                      <ul className="f-legend">
                        <li><i style={{ background: 'var(--f-accent)' }} />정상<b>{okCount}</b></li>
                        <li><i style={{ background: 'var(--f-warn)' }} />부족<b>{lowCount}</b></li>
                        <li><i style={{ background: 'var(--f-alert)' }} />품절<b>{outCount}</b></li>
                      </ul>
                    </div>
                  </section>

                  <section className="f-panel">
                    <div className="f-panel-head">
                      <div><h3 className="f-panel-title">최근 7일 사용량</h3><p className="f-panel-sub">빠른 차감 기록 · 합계 {weekTotal}개</p></div>
                      <button className="f-link-btn" onClick={() => setShowStats(true)}>월별 통계 <Icon name="arrow" size={14} strokeWidth={2.2} /></button>
                    </div>
                    <div className="f-bars" role="img" aria-label={`최근 7일 사용량 ${days.map(d => d.label + ' ' + d.qty + '개').join(', ')}`}>
                      {days.map((d, i) => (
                        <div key={d.start} className={`f-bar ${i === 6 ? 'is-today' : ''} ${d.qty === 0 ? 'is-zero' : ''}`}>
                          {d.qty > 0 && <span>{d.qty}</span>}
                          <i style={{ height: `${(d.qty / maxQty) * 100}%` }} />
                        </div>
                      ))}
                    </div>
                    <div className="f-bar-labels">{days.map((d, i) => <span key={d.start}>{i === 6 ? '오늘' : d.label}</span>)}</div>
                    {weekTotal === 0 && <p className="f-chart-empty">아직 사용 기록이 없어요. 빠른 차감에서 − 를 누르면 여기에 쌓입니다.</p>}
                  </section>
                </div>

                {costStats ? (
                  <section className="f-panel" style={{ marginBottom: 16 }}>
                    <div className="f-panel-head">
                      <div><h3 className="f-panel-title">약제비</h3><p className="f-panel-sub">단가를 넣은 {costStats.priced}개 품목 기준 · 빠른 차감 사용량 × 단가</p></div>
                    </div>
                    <div className="zc-cost-grid">
                      <div><span>재고 금액</span><b className="f-num">{won(costStats.stockValue)}</b></div>
                      <div><span>이번 달 사용</span><b className="f-num">{won(costStats.thisMonth)}</b>
                        {costStats.lastMonth > 0 && <small className={costStats.thisMonth > costStats.lastMonth ? 'is-up' : 'is-down'}>지난 달 {won(costStats.lastMonth)} 대비 {costStats.thisMonth >= costStats.lastMonth ? '+' : '−'}{Math.abs(Math.round((costStats.thisMonth - costStats.lastMonth) / costStats.lastMonth * 100))}%</small>}
                      </div>
                      <div><span>지난 달 사용</span><b className="f-num">{won(costStats.lastMonth)}</b></div>
                    </div>
                    {costStats.top.length > 0 && (
                      <div className="zc-cost-top">
                        <p className="f-panel-sub" style={{ marginBottom: 6 }}>이번 달 약제비가 많은 약</p>
                        {costStats.top.map((t, i) => (
                          <div key={t.name + i} className="zc-cost-row">
                            <span className="truncate">{t.name}</span>
                            <i style={{ width: `${Math.max(4, (t.amt / costStats.top[0].amt) * 100)}%` }} />
                            <b className="f-num">{won(t.amt)}</b>
                          </div>
                        ))}
                      </div>
                    )}
                    {costStats.priced < costStats.total && <p className="f-chart-empty">단가가 없는 품목 {costStats.total - costStats.priced}개는 계산에서 빠졌습니다.</p>}
                  </section>
                ) : (
                  <button className="zc-active-card" style={{ borderStyle: 'dashed' }} onClick={() => setViewMode('manage')}>
                    <div className="zc-active-left">
                      <b>약제비를 보려면 단가를 넣어 주세요</b>
                      <small>품목 관리에서 단가를 넣거나 엑셀의 '단가' 열로 한 번에 올리면, 재고 금액과 이번 달 약제비가 여기에 보여요.</small>
                    </div>
                    <Icon name="arrow" size={18} />
                  </button>
                )}

                <section className="f-panel" style={{ marginBottom: 16 }}>
                  <div className="f-panel-head">
                    <div><h3 className="f-panel-title">확인이 필요한 품목</h3><p className="f-panel-sub">적정선 아래로 내려간 약, 남은 비율이 낮은 순</p></div>
                    {shortage.length > 0 && <button className="f-link-btn" onClick={() => setViewMode('dashboard')}>발주하기 <Icon name="arrow" size={14} strokeWidth={2.2} /></button>}
                  </div>
                  {attention.length === 0 ? (
                    total === 0 ? (
                      <div className="zc-empty">
                        <img src="empty-boxes.webp" width="128" height="128" alt="" className="zc-empty-img" />
                        <b>등록된 품목이 없어요</b>
                        <p>품목을 하나씩 등록하거나, 정리해 둔 엑셀을 올려 한 번에 시작하세요.</p>
                        <button className="zc-btn-primary" onClick={() => setViewMode('manage')}>품목 등록하기</button>
                      </div>
                    ) : <p className="f-chart-empty" style={{ marginTop: 0 }}>적정선 아래로 내려간 약이 없어요.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="f-table">
                        <thead><tr><th>품목</th><th className="f-hide-sm">거래처</th><th>재고</th><th>상태</th></tr></thead>
                        <tbody>
                          {attention.map(p => {
                            const st = p.currentStock === 0 ? 'out' : orderingProductNames.has(p.name) ? 'pending' : 'low';
                            return (
                              <tr key={p.id}>
                                <td className="f-td-name">{p.name}</td>
                                <td className="f-hide-sm" style={{ color: 'var(--f-sub)' }}>{p.company}</td>
                                <td className="f-num">{p.currentStock} <span style={{ color: 'var(--f-sub)' }}>/ {p.safeStock}</span></td>
                                <td><span className={`f-badge is-${st}`} style={{ marginLeft: 0 }}>{{ out: '품절', pending: '입고 대기', low: '발주 필요' }[st]}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                </>)}

                <div className="f-quick-grid">
                  {[
                    { key: 'quick', label: '빠른 차감', tone: 'tone-blue' },
                    { key: 'stocktake', label: activeCount ? '재고조사 이어서' : '재고조사', tone: 'tone-green' },
                    { key: 'dashboard', label: '발주', tone: 'tone-orange' },
                    { key: 'manage', label: '품목 관리', tone: 'tone-blue' },
                  ].map(q => (
                    <button key={q.key} className={`f-quick ${q.tone}`} onClick={() => setViewMode(q.key)}>
                      <span className="f-kpi-icon"><Icon name={q.key} size={18} /></span>
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {viewMode === 'quick' && (() => {
            // 1단계: 검색 필터
            let filtered = searchQuery.trim()
              ? products.filter(p =>
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (p.barcode && String(p.barcode).includes(searchQuery.trim())))
              : products;

            // 2단계: 카테고리 필터
            if (categoryFilter !== 'all') {
              if (categoryFilter === '__none__') {
                filtered = filtered.filter(p => !p.category);
              } else {
                filtered = filtered.filter(p => p.category === categoryFilter);
              }
            }

            // 정렬: 이름순 가나다 (차감해도 순서 유지)
            // 부족분은 이미 카드의 색상/배지로 강조되므로 정렬 불필요
            const sorted = [...filtered].sort((a, b) =>
              a.name.localeCompare(b.name, 'ko')
            );

            // 발주 필요(아직 안 보낸 것) + 발주중(보낸 것) 분리
            const shortageCount = products.filter(p => p.currentStock < p.safeStock && !orderingProductNames.has(p.name)).length;
            const orderingCount = products.filter(p => p.currentStock < p.safeStock && orderingProductNames.has(p.name)).length;
            const hasUnclassified = products.some(p => !p.category);

            return (
              <div className="max-w-3xl mx-auto">
                <header className="f-page-head">
                  <div className="min-w-0">
                    <p className="f-eyebrow">Daily use</p>
                    <h2 className="f-title">빠른 차감</h2>
                  </div>
                  <button
                    onClick={() => setShowTodayUsage(true)}
                    className="f-chip-btn"
                    title="오늘 차감한 약품 목록 보기"
                  >
                    <Icon name="list" size={16} />
                    오늘 사용 <span className="f-num">{todayQty}</span>
                  </button>
                </header>

                {/* 상태 요약: 발주 필요 / 입고 대기 / 오늘 사용 */}
                <div className="f-status">
                  <button
                    onClick={() => setViewMode('dashboard')}
                    className={`f-status-cell ${shortageCount > 0 ? 'is-alert' : ''}`}
                  >
                    <span className="f-status-label">발주 필요</span>
                    <span className="f-status-value">{shortageCount}<small>건</small></span>
                    {shortageCount > 0 && <span className="f-status-cta">발주하기 <Icon name="arrow" size={12} strokeWidth={2.5} /></span>}
                  </button>
                  <button
                    onClick={() => setViewMode('dashboard')}
                    className={`f-status-cell ${orderingCount > 0 ? 'is-pending' : ''}`}
                  >
                    <span className="f-status-label">입고 대기</span>
                    <span className="f-status-value">{orderingCount}<small>건</small></span>
                  </button>
                  <div className="f-status-cell">
                    <span className="f-status-label">오늘 사용</span>
                    <span className="f-status-value">{todayQty}<small>개</small></span>
                  </div>
                </div>

                {/* 카테고리 필터 */}
                <div className="f-chips" role="group" aria-label="카테고리">
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={`f-chip ${categoryFilter === 'all' ? 'is-active' : ''}`}
                  >
                    전체 <span className="f-num">{products.length}</span>
                  </button>
                  {CATEGORIES.map(c => {
                    const count = products.filter(p => p.category === c.key).length;
                    const active = categoryFilter === c.key;
                    return (
                      <button
                        key={c.key}
                        onClick={() => setCategoryFilter(c.key)}
                        className={`f-chip ${active ? 'is-active' : ''} ${count === 0 ? 'is-empty' : ''}`}
                        style={{ '--cat': c.color.hex }}
                      >
                        <i className="f-dot" />
                        {c.key} <span className="f-num">{count}</span>
                      </button>
                    );
                  })}
                  {hasUnclassified && (
                    <button
                      onClick={() => setCategoryFilter('__none__')}
                      className={`f-chip ${categoryFilter === '__none__' ? 'is-active' : ''}`}
                    >
                      미분류 <span className="f-num">{products.filter(p => !p.category).length}</span>
                    </button>
                  )}
                </div>

                {/* 검색 + 되돌리기 */}
                <div className="f-toolbar">
                  <label className="f-search">
                    <Icon name="search" size={18} />
                    <input
                      id="quick-search"
                      type="search"
                      placeholder="제품명 또는 거래처 검색"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </label>
                  <button onClick={() => openScan('quick')} className="f-ghost-btn" aria-label="바코드로 찾기">
                    <Icon name="scan" size={18} />
                    <span className="hidden sm:inline">스캔</span>
                  </button>
                  <button
                    onClick={handleUndo}
                    disabled={undoStack.length === 0}
                    title={undoStack.length > 0 ? `되돌리기: ${undoStack[undoStack.length-1].productName.slice(0,12)}` : '되돌릴 작업 없음'}
                    className="f-ghost-btn"
                  >
                    <Icon name="undo" size={18} />
                    <span className="hidden sm:inline">되돌리기</span>
                    {undoStack.length > 0 && <span className="f-num">{undoStack.length}</span>}
                  </button>
                </div>

                <ul className="f-list">
                  {sorted.length === 0 && (searchQuery || products.length > 0 ? (
                    <li className="f-empty">검색 결과가 없습니다</li>
                  ) : (
                    <li className="f-empty zc-empty">
                      <img src="empty-boxes.webp" width="128" height="128" alt="" className="zc-empty-img" />
                      <b>등록된 품목이 없어요</b>
                      <p>품목을 하나씩 등록하거나, 정리해 둔 엑셀을 올려 한 번에 시작하세요.</p>
                      <button className="zc-btn-primary" onClick={() => setViewMode('manage')}>품목 등록하기</button>
                    </li>
                  ))}
                  {sorted.map(product => {
                    const isShortage = product.currentStock < product.safeStock;
                    const isCritical = product.currentStock === 0;
                    const isOrdering = isShortage && orderingProductNames.has(product.name);
                    const state = isCritical && !isOrdering ? 'out' : isOrdering ? 'pending' : isShortage ? 'low' : 'ok';
                    const catStyle = getCategoryStyle(product.category);
                    const scaleMax = Math.max(product.safeStock * 1.5, product.currentStock, 1);
                    const fillPct = Math.min(100, (product.currentStock / scaleMax) * 100);
                    const safePct = Math.min(100, (product.safeStock / scaleMax) * 100);
                    const badgeText = { out: '품절', pending: '입고 대기', low: '발주 필요' }[state];

                    return (
                      <li
                        key={product.id}
                        className={`f-item is-${state}`}
                        style={catStyle ? { '--cat': catStyle.color.hex } : undefined}
                      >
                        <ProductThumb product={product} size={44} />

                        <div className="f-item-body">
                          <div className="f-item-meta">
                            <span className="truncate">{product.company}</span>
                            {catStyle && <span className="f-cat"><i className="f-dot" />{catStyle.key}</span>}
                            {badgeText && <span className={`f-badge is-${state}`}>{badgeText}</span>}
                          </div>
                          <h3 className="f-item-name">{product.name}</h3>
                        </div>

                        <div className="f-item-foot">
                          <div className="f-gauge-wrap">
                            <div className="f-gauge" role="img" aria-label={`현재 ${product.currentStock}개, 적정선 ${product.safeStock}개`}>
                              <span className="f-gauge-fill" style={{ width: `${fillPct}%` }} />
                              <span className="f-gauge-mark" style={{ left: `${safePct}%` }} />
                            </div>
                            <div className="f-gauge-label">
                              <span>적정선 <b className="f-num">{product.safeStock}</b></span>
                              {isShortage && <span>부족 <b className="f-num">{product.safeStock - product.currentStock}</b></span>}
                            </div>
                          </div>

                          <div className="f-stepper">
                            <button
                              onClick={() => handleQuickAdjust(product.id, -1)}
                              disabled={product.currentStock === 0}
                              className="f-step"
                              aria-label={`${product.name} 1개 차감`}
                            >
                              <Icon name="minus" size={20} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => setQuickInputId(product.id)}
                              className="f-count"
                              aria-label="수량 직접 입력"
                              title="탭하여 직접 입력"
                            >
                              {product.currentStock}
                            </button>
                            <button
                              onClick={() => handleQuickAdjust(product.id, 1)}
                              className="f-step"
                              aria-label={`${product.name} 1개 추가`}
                            >
                              <Icon name="plus" size={20} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}

          {/* TAB 1: 재고조사 (조사 세션) */}
          {viewMode === 'stocktake' && (() => {
            const viewing = counts.find(c => c.id === openCountId) || null;
            const session = viewing || null;

            // ---------- 목록 화면 ----------
            if (!session) {
              return (
                <div className="max-w-5xl mx-auto">
                  <header className="f-page-head">
                    <div className="min-w-0">
                      <p className="f-eyebrow">Stock count</p>
                      <h2 className="f-title">재고조사</h2>
                    </div>
                    <button className="zc-btn-primary" onClick={createCount}>
                      <Icon name="plus" size={18} strokeWidth={2.2} /> {activeCount ? '진행 중인 조사 열기' : '재고조사 생성'}
                    </button>
                  </header>
                  <p className={`text-sm ${theme.subText} mb-5`} style={{ marginTop: -6 }}>조사를 만들면 지금의 전산 재고를 기록해 두고, 실물 수량을 입력하는 대로 차이를 계산합니다.</p>

                  {activeCount && (() => {
                    const sm = countSummary(buildCountRows(activeCount, products));
                    return (
                      <button className="zc-active-card" onClick={() => setOpenCountId(activeCount.id)}>
                        <div className="zc-active-left">
                          <span className="f-badge is-pending" style={{ marginLeft: 0 }}>진행중</span>
                          <b>{activeCount.name}</b>
                          <small>{fmtDateTime(activeCount.createdAt)} 시작 · 조사 {sm.done}/{sm.total} · 차이 {sm.diff}</small>
                        </div>
                        <div className="zc-active-right">
                          <span className="zc-pct">{sm.pct}%</span>
                          <span className="zc-progress"><i style={{ width: `${sm.pct}%` }} /></span>
                        </div>
                      </button>
                    );
                  })()}

                  <section className="f-panel">
                    <div className="f-panel-head"><div><h3 className="f-panel-title">재고조사 목록</h3><p className="f-panel-sub">전체 {counts.length}건</p></div></div>
                    {counts.length === 0 ? (
                      <div className="zc-empty">
                        <img src="empty-boxes.webp" width="128" height="128" alt="" className="zc-empty-img" />
                        <b>아직 재고조사 기록이 없어요</b>
                        <p>'재고조사 생성'을 누르고 약장을 돌며 바코드를 찍거나 수량을 입력하세요. 전산 재고와 다른 품목은 자동으로 표시됩니다.</p>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="f-table">
                          <thead><tr><th>번호</th><th>조사명</th><th className="f-hide-sm">기간</th><th>상태</th><th>진행률</th><th className="f-hide-sm">차이</th></tr></thead>
                          <tbody>
                            {counts.map((c, i) => {
                              const sm = countSummary(buildCountRows(c, products));
                              return (
                                <tr key={c.id} className="zc-click" onClick={() => setOpenCountId(c.id)}>
                                  <td className="f-num" style={{ color: 'var(--f-sub)' }}>{counts.length - i}</td>
                                  <td className="f-td-name">{c.name}</td>
                                  <td className="f-hide-sm f-num" style={{ color: 'var(--f-sub)' }}>{fmtShortDate(c.createdAt)}{c.finishedAt ? ' ~ ' + fmtShortDate(c.finishedAt) : ' ~'}</td>
                                  <td><span className={`f-badge ${c.status === 'active' ? 'is-pending' : 'is-ok'}`} style={{ marginLeft: 0 }}>{c.status === 'active' ? '진행중' : '완료'}</span></td>
                                  <td><span className="zc-cell-progress"><span className="zc-progress"><i style={{ width: `${sm.pct}%`, background: c.status === 'done' ? 'var(--f-ok)' : undefined }} /></span><span className="f-num">{sm.pct}%</span></span></td>
                                  <td className="f-hide-sm f-num">{sm.diff}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </div>
              );
            }

            // ---------- 조사 상세 화면 ----------
            const rows = buildCountRows(session, products);
            const sm = countSummary(rows);
            const isActive = session.status === 'active';
            const q = countSearch.trim().toLowerCase();
            const shown = rows
              .filter(r => countKeep.includes(r.id) || countFilter === 'all' ? true : countFilter === 'left' ? r.actual == null : countFilter === 'done' ? r.actual != null : (r.diff != null && r.diff !== 0))
              .filter(r => !q || r.name.toLowerCase().includes(q) || r.company.toLowerCase().includes(q) || (r.barcode && r.barcode.includes(q)));
            const R = 42, C = 2 * Math.PI * R;

            return (
              <div className="max-w-5xl mx-auto">
                <button className="zc-back" onClick={() => { setOpenCountId(null); setCountSearch(''); setCountKeep([]); }}>
                  <Icon name="back" size={18} /> 재고조사 목록
                </button>
                <header className="f-page-head" style={{ alignItems: 'flex-start' }}>
                  <div className="min-w-0 flex-1">
                    <p className="f-eyebrow">{isActive ? '진행 중' : session.applied ? '완료 · 재고 반영됨' : '완료 · 기록만'} · {fmtDateTime(session.createdAt)} 시작</p>
                    {isActive ? (
                      <input
                        id="count-name"
                        className="zc-title-input"
                        value={session.name}
                        onChange={e => renameCount(session.id, e.target.value)}
                        aria-label="조사 이름"
                      />
                    ) : <h2 className="f-title">{session.name}</h2>}
                  </div>
                  {!isActive && (
                    <button className="f-icon-btn" onClick={() => deleteCount(session.id)} aria-label="조사 기록 삭제" title="조사 기록 삭제"><Icon name="close" size={18} /></button>
                  )}
                </header>

                <div className="zc-progress-grid">
                  <section className="f-panel zc-progress-card">
                    <div className="f-donut" style={{ width: 108, height: 108 }}>
                      <svg width="108" height="108" viewBox="0 0 108 108" aria-hidden="true">
                        <circle cx="54" cy="54" r={R} fill="none" stroke="var(--f-surface-2)" strokeWidth="12" />
                        <circle cx="54" cy="54" r={R} fill="none" stroke={isActive ? 'var(--f-accent)' : 'var(--f-ok)'} strokeWidth="12" strokeLinecap="round"
                          strokeDasharray={`${(sm.pct / 100) * C} ${C}`} />
                      </svg>
                      <div className="f-donut-center"><div><b style={{ fontSize: 22 }}>{sm.pct}%</b><small>진행률</small></div></div>
                    </div>
                    <ul className="f-legend">
                      <li><i style={{ background: 'var(--f-sub)' }} />전체 항목<b>{sm.total}</b></li>
                      <li><i style={{ background: 'var(--f-accent)' }} />조사 완료<b>{sm.done}</b></li>
                      <li><i style={{ background: 'var(--f-line-strong)' }} />미조사<b>{sm.left}</b></li>
                    </ul>
                  </section>
                  <section className={`f-kpi ${sm.diff ? 'tone-red' : 'tone-green'}`}>
                    <span className="f-kpi-icon"><Icon name={sm.diff ? 'alert' : 'check'} size={20} /></span>
                    <div>
                      <p className="f-kpi-label">재고 차이</p>
                      <p className="f-kpi-value">{sm.diff}<small>개 품목</small></p>
                      <p className="f-panel-sub" style={{ marginTop: 4 }}>실물 − 전산 합계 {sm.diffQty > 0 ? '+' : ''}{sm.diffQty}개{sm.hasPrice ? ` · ${sm.diffAmount > 0 ? '+' : sm.diffAmount < 0 ? '−' : ''}${won(Math.abs(sm.diffAmount))}` : ''}</p>
                    </div>
                  </section>
                </div>

                {isActive && (
                  <button className="zc-scan-cta" onClick={() => openScan('count')}>
                    <span className="zc-scan-cta-icon"><Icon name="scan" size={24} /></span>
                    <span><b>바코드 스캔으로 조사하기</b><small>찍을 때마다 실물 수량을 바로 입력합니다</small></span>
                    <Icon name="arrow" size={18} />
                  </button>
                )}

                <div className="f-chips" role="group" aria-label="조사 항목 필터">
                  {[
                    ['all', '전체', sm.total], ['left', '미조사', sm.left], ['done', '조사 완료', sm.done], ['diff', '차이 있음', sm.diff],
                  ].map(([k, label, n]) => (
                    <button key={k} className={`f-chip ${countFilter === k ? 'is-active' : ''}`} onClick={() => setCountFilter(k)}>
                      {label} <span className="f-num">{n}</span>
                    </button>
                  ))}
                </div>

                <div className="f-toolbar">
                  <label className="f-search">
                    <Icon name="search" size={18} />
                    <input
                      id="count-search"
                      type="search"
                      placeholder="제품명 · 거래처 · 바코드"
                      value={countSearch}
                      onChange={e => setCountSearch(e.target.value)}
                    />
                  </label>
                </div>

                <ul className="f-list">
                  {shown.length === 0 && <li className="f-empty">{q ? '검색 결과가 없습니다' : '해당하는 품목이 없습니다'}</li>}
                  {shown.map(r => {
                    const st = r.actual == null ? 'left' : r.diff === 0 ? 'match' : r.diff > 0 ? 'over' : 'under';
                    return (
                      <li key={r.id} className={`zc-count-row is-${st}`}>
                        <div className="zc-count-info">
                          <b>{r.name}</b>
                          <small>{r.company}{r.barcode ? ` · ${r.barcode}` : ''}{r.removed ? ' · 삭제된 품목' : ''}{r.added ? ' · 조사 중 추가' : ''}</small>
                        </div>
                        <div className="zc-count-nums">
                          <div className="zc-num-box"><span>전산</span><b className="f-num">{r.system}</b></div>
                          {isActive && !r.removed && (
                            <button type="button" className="zc-step-btn" aria-label={`${r.name} 실물 1 빼기`}
                              disabled={(r.actual == null ? r.system : r.actual) <= 0}
                              onClick={() => { keepCountRow(r.id); setCountActual(session.id, r.id, Math.max(0, (r.actual == null ? r.system : r.actual) - 1)); }}>−</button>
                          )}
                          <div className="zc-num-box is-input">
                            <label htmlFor={`count-${r.id}`}>실물</label>
                            {isActive && !r.removed ? (
                              <input
                                id={`count-${r.id}`}
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min="0"
                                placeholder="–"
                                value={r.actual == null ? '' : r.actual}
                                onFocus={e => { keepCountRow(r.id); try { e.target.select(); } catch (_) {} }}
                                onChange={e => { keepCountRow(r.id); setCountActual(session.id, r.id, e.target.value === '' ? null : e.target.value); }}
                              />
                            ) : <b className="f-num">{r.actual == null ? '–' : r.actual}</b>}
                          </div>
                          {isActive && !r.removed && (
                            <button type="button" className="zc-step-btn" aria-label={`${r.name} 실물 1 더하기`}
                              onClick={() => { keepCountRow(r.id); setCountActual(session.id, r.id, (r.actual == null ? r.system : r.actual) + 1); }}>+</button>
                          )}
                          <div className="zc-diff">
                            {st === 'left' ? (
                              isActive && !r.removed
                                ? <button className="zc-same-btn" onClick={() => { keepCountRow(r.id); setCountActual(session.id, r.id, r.system); }} title="전산 재고와 같음">일치</button>
                                : <span className="zc-diff-pill is-left">미조사</span>
                            ) : (
                              <span className={`zc-diff-pill is-${st}`}>{st === 'match' ? '일치' : st === 'over' ? `+${r.diff}` : `−${Math.abs(r.diff)}`}</span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="zc-count-actions">
                  <button className="zc-btn-ghost" disabled={busy} onClick={() => runExport(() => exportCountXlsx(session, rows))}>
                    <Icon name="sheet" size={18} /> 엑셀 다운로드
                  </button>
                  <button className="zc-btn-ghost" onClick={() => { if (!printCountReport(session, rows, branding.appName)) showToast('팝업이 막혀 있습니다. 브라우저에서 팝업을 허용해 주세요', 'error'); }}>
                    <Icon name="printer" size={18} /> PDF 저장
                  </button>
                  {isActive && (
                    <button className="zc-btn-primary" onClick={() => setShowFinishCount(true)}>
                      <Icon name="check" size={18} /> 조사 완료
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

                    {/* TAB 2: 발주 대시보드 */}
          {viewMode === 'dashboard' && (() => {
            const allEntries = Object.entries(groupedOrders);
            const pending = allEntries.filter(([c, info]) => !completedOrders[makeOrderKey(c, info.items)]);
            const completed = allEntries.filter(([c, info]) => completedOrders[makeOrderKey(c, info.items)]);

            return (
            <div className="max-w-3xl mx-auto">
              <div className="mb-6">
                <header className="f-page-head" style={{ marginBottom: 6 }}>
                  <div className="min-w-0">
                    <p className="f-eyebrow">Orders · 대기 {pending.length} · 완료 {completed.length}</p>
                    <h2 className="f-title">거래처별 발주</h2>
                  </div>
                  <button
                    onClick={() => setShowOrderHistory(true)}
                    className="f-chip-btn"
                    title="과거 발주 이력 보기"
                  >
                    <Icon name="list" size={16} />
                    이력 <span className="f-num">{orderHistory.length}</span>
                  </button>
                </header>
                <div>
                  <p className={`text-sm ${theme.subText}`}>적정선 아래로 떨어진 품목을 거래처별로 묶었습니다. 문자를 보낸 뒤 '완료'를 누르면 목록에서 내려갑니다.</p>
                </div>
              </div>

              {allEntries.length === 0 ? (
                <div className={`text-center py-16 border font-light text-base ${theme.surface} ${theme.subText}`}>
                  현재 모든 살롱 약제 및 헤어 스튜디오 전용 제품의 재고가 충분합니다.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 대기 중인 발주 */}
                  {pending.map(([company, info]) => {
                    const editKey = `company:${company}`;
                    const isEditing = editingId === editKey;

                    return (
                      <div key={company} className={`border p-5 transition-all ${theme.surface}`}>
                        {!isEditing ? (
                          <div className={`flex justify-between items-center border-b ${theme.border} pb-3 mb-4 gap-3`}>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-normal tracking-wide truncate">{company}</h3>
                              <p className={`text-sm ${theme.subText} mt-0.5 font-mono`}>연락처: {formatPhone(info.phone)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => setEditingId(editKey)}
                                className="px-2.5 py-1.5 text-sm border border-current opacity-50 hover:opacity-100 transition-all"
                                aria-label="거래처 정보 수정"
                                title="거래처 정보 수정"
                              >
                                ✎
                              </button>
                              <a
                                href={`tel:${info.phone}`}
                                className="px-3 py-1.5 text-sm border border-current opacity-80 tracking-wider hover:bg-neutral-500/10 transition-all"
                              >
                                전화
                              </a>
                            </div>
                          </div>
                        ) : (
                          <CompanyEditor
                            theme={theme}
                            originalName={company}
                            originalPhone={info.phone}
                            onSave={(newName, newPhone) => {
                              handleUpdateCompany(company, newName, newPhone);
                              setEditingId(null);
                            }}
                            onCancel={() => setEditingId(null)}
                          />
                        )}

                        <div className="space-y-2.5 mb-4">
                          {info.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-base gap-3">
                              <span className="opacity-90 font-light flex-1">{item.name}</span>
                              <span className={`${theme.badge} font-medium whitespace-nowrap`}>부족분 +{item.qty}개</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col gap-2">
                          {/* 메인 액션: 문자 발주 (전체 너비) */}
                          <button
                            onClick={() => sendSmsMessage(company, info)}
                            className={`w-full text-sm py-3 tracking-widest font-medium transition-all uppercase ${theme.pointBtn}`}
                          >
                            문자 발주 전송
                          </button>

                          {/* 보조 액션: 미리보기 + 복사 + 완료 */}
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => setOrderPreview({ company, info })}
                              className="py-2.5 text-sm tracking-wider border border-current opacity-80 hover:opacity-100 active:scale-95 transition-all flex items-center justify-center gap-1"
                              title="발주서 미리보기 및 메시지 편집"
                            >
                              미리보기
                            </button>
                            <button
                              onClick={() => {
                                copyOrderText(company, info);
                                logOrderHistory(company, info, 'copy');
                              }}
                              className="py-2.5 text-sm tracking-wider border border-current opacity-80 hover:opacity-100 active:scale-95 transition-all flex items-center justify-center gap-1"
                              title="발주서 텍스트 복사"
                            >
                              복사
                            </button>
                            <button
                              onClick={() => handleMarkOrderComplete(company, info)}
                              className="py-2.5 text-sm tracking-wider border border-current opacity-70 hover:opacity-100 transition-all"
                              title="발주를 보냈음을 표시"
                            >
                              ✓ 완료
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* 완료된 발주 (시각적으로 약하게) */}
                  {completed.length > 0 && (
                    <div className="pt-4">
                      <h3 className={`text-xs ${theme.subText} tracking-[0.3em] uppercase font-mono mb-3`}>
                        입고 대기 ({completed.length})
                      </h3>
                      <div className="space-y-2">
                        {completed.map(([company, info]) => (
                          <div key={company} className={`flex flex-wrap items-center justify-between gap-2 p-3 border ${theme.surface} transition-all`}>
                            <div className="flex-1 min-w-[170px]">
                              <p className="text-base font-light truncate">{company}</p>
                              <p className={`text-xs ${theme.subText} font-mono`}>
                                {info.items.length}개 품목 · {info.items.reduce((a, b) => a + b.qty, 0)}개 발주
                              </p>
                            </div>
                            <div className="flex gap-2 ml-auto">
                              <button
                                onClick={() => handleUnmarkOrderComplete(company, info)}
                                className="zc-btn-ghost"
                                style={{ height: 38, fontSize: 13 }}
                              >
                                발주 취소
                              </button>
                              <button
                                onClick={() => setReceiveOrder({ company, items: info.items })}
                                className="zc-btn-primary"
                                style={{ height: 38, fontSize: 13 }}
                              >
                                <Icon name="box" size={16} /> 입고 처리
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })()}

          {/* TAB 3: 마스터 관리 */}
          {viewMode === 'manage' && (
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">

              {/* 등록 폼 */}
              <div className="md:col-span-1">
                <div className="mb-4">
                  <p className="f-eyebrow">Items</p>
                  <div className="flex items-end justify-between mb-1 gap-2">
                    <h2 className="f-title">새 약제 등록</h2>
                    <button
                      onClick={() => setShowAddCompany(true)}
                      className={`px-2.5 py-1 text-xs tracking-widest uppercase border border-current opacity-60 hover:opacity-100 transition-all flex-shrink-0 font-mono whitespace-nowrap`}
                      title="제품 없이 거래처만 추가"
                    >
                      + 거래처
                    </button>
                  </div>
                  <p className={`text-sm ${theme.subText} mt-1`}>살롱에서 새로 도입한 아이롱 펌제나 염색약, 클리닉 제품군을 등록합니다.</p>
                </div>

                <form onSubmit={handleAddProduct} className={`border p-4 space-y-4 ${theme.surface}`}>
                  <div>
                    <label className="block text-sm uppercase tracking-wider mb-1 opacity-70">제품 이름 *</label>
                    <input
                      type="text"
                      required
                      placeholder="예: 프리미엄 치오 오일"
                      value={newProd.name}
                      onChange={e => setNewProd({...newProd, name: e.target.value})}
                      className={`w-full p-2.5 text-sm focus:outline-none border ${theme.inputBg}`}
                    />
                  </div>
                  <div>
                    <label htmlFor="new-barcode" className="block text-sm uppercase tracking-wider mb-1 opacity-70">바코드 (선택)</label>
                    <div className="flex gap-2">
                      <input
                        id="new-barcode"
                        type="text"
                        inputMode="numeric"
                        placeholder="스캔하거나 번호 입력"
                        value={newProd.barcode}
                        onChange={e => setNewProd({...newProd, barcode: e.target.value})}
                        className={`flex-1 min-w-0 p-2.5 text-sm focus:outline-none border ${theme.inputBg}`}
                      />
                      <button type="button" onClick={() => openScan('assign')} className="zc-scan-btn" aria-label="바코드 스캔">
                        <Icon name="scan" size={18} /> 스캔
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm uppercase tracking-wider mb-1 opacity-70">거래처 및 제조사명 *</label>
                    <input
                      type="text"
                      required
                      list="filo-company-list"
                      placeholder="예: 동양재료상사"
                      value={newProd.company}
                      onChange={e => {
                        const v = e.target.value;
                        // 통합 목록에서 전화번호 자동 채우기 (거래처 마스터 우선)
                        const matched = allPhoneMap[v];
                        setNewProd(prev => ({
                          ...prev,
                          company: v,
                          phone: matched || prev.phone
                        }));
                      }}
                      className={`w-full p-2.5 text-sm focus:outline-none border ${theme.inputBg}`}
                    />
                    <datalist id="filo-company-list">
                      {allCompanyList.map(c => <option key={c} value={c} />)}
                    </datalist>
                    {allCompanyList.length > 0 && (
                      <p className={`text-xs ${theme.subText} mt-1`}>
                        기존 거래처 선택 시 전화번호 자동 입력 ({allCompanyList.length}개 등록됨)
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm uppercase tracking-wider mb-1 opacity-70">거래처 전화번호 *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      placeholder="예: 010-1234-5678"
                      value={formatPhone(newProd.phone)}
                      onChange={e => setNewProd({...newProd, phone: e.target.value.replace(/[^0-9]/g, '')})}
                      className={`w-full p-2.5 text-sm focus:outline-none border ${theme.inputBg}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm uppercase tracking-wider mb-1 opacity-70">카테고리 (선택)</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {CATEGORIES.map(c => {
                        const active = newProd.category === c.key;
                        return (
                          <button
                            type="button"
                            key={c.key}
                            onClick={() => setNewProd({...newProd, category: active ? '' : c.key})}
                            className={`py-3 text-sm tracking-wide transition-all border-2 ${
                              active
                                ? `${c.color.bg} ${c.color.text} font-semibold`
                                : 'border-current opacity-30 hover:opacity-70'
                            }`}
                            style={active ? { borderColor: c.color.hex } : {}}
                          >
                            {c.key}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm uppercase tracking-wider mb-1 opacity-70">안전 적정선</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={newProd.safeStock}
                        onChange={e => setNewProd({...newProd, safeStock: e.target.value})}
                        className={`w-full p-2.5 text-sm text-center focus:outline-none border ${theme.inputBg}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm uppercase tracking-wider mb-1 opacity-70">초기 현재고</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={newProd.currentStock}
                        onChange={e => setNewProd({...newProd, currentStock: e.target.value})}
                        className={`w-full p-2.5 text-sm text-center focus:outline-none border ${theme.inputBg}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="new-price" className="block text-sm uppercase tracking-wider mb-1 opacity-70">단가 (원, 선택)</label>
                    <input
                      id="new-price"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      placeholder="예: 18000 · 넣으면 약제비가 계산돼요"
                      value={newProd.price}
                      onChange={e => setNewProd({...newProd, price: e.target.value})}
                      className={`w-full p-2.5 text-sm focus:outline-none border ${theme.inputBg}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm uppercase tracking-wider mb-1 opacity-70">제품 이미지 (선택)</label>
                    <div className="space-y-2">
                      {newProd.image && (
                        <div className="flex items-center gap-2">
                          <img src={newProd.image} alt="" className="w-14 h-14 object-cover border border-current opacity-90" />
                          <button
                            type="button"
                            onClick={() => setNewProd({...newProd, image: ''})}
                            className="text-xs opacity-50 hover:opacity-100 underline"
                          >
                            제거
                          </button>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <label className={`p-2.5 text-xs text-center tracking-wider border border-current opacity-70 hover:opacity-100 transition-all cursor-pointer`}>
                          촬영
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleNewImageUpload(e.target.files[0])}
                          />
                        </label>
                        <label className={`p-2.5 text-xs text-center tracking-wider border border-current opacity-70 hover:opacity-100 transition-all cursor-pointer`}>
                          갤러리
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleNewImageUpload(e.target.files[0])}
                          />
                        </label>
                      </div>
                      <input
                        type="url"
                        placeholder="또는 이미지 URL 직접 입력"
                        value={newProd.image.startsWith('data:') ? '' : newProd.image}
                        onChange={e => setNewProd({...newProd, image: e.target.value})}
                        className={`w-full p-2 text-xs focus:outline-none border ${theme.inputBg}`}
                      />
                    </div>
                  </div>
                  <button type="submit" className={`w-full text-sm py-2.5 tracking-wider font-medium ${theme.pointBtn}`}>
                    마스터 리스트에 추가하기
                  </button>
                </form>
              </div>

              {/* 등록된 리스트 */}
              <div className="md:col-span-2">
                <div className="mb-4">
                  <h2 className="text-xl font-bold tracking-tight">
                    등록된 품목 <span className="f-num opacity-60">{products.length}</span>
                  </h2>
                  <p className={`text-sm ${theme.subText} mt-1`}>연필 버튼으로 이름·거래처·적정선을 고칠 수 있습니다.</p>
                </div>

                {/* 마스터 검색바 */}
                {products.length > 5 && (
                  <div className="mb-3">
                    <input
                      type="search"
                      placeholder="제품명 또는 거래처로 검색..."
                      value={masterSearch}
                      onChange={e => setMasterSearch(e.target.value)}
                      className={`w-full px-3 py-2 text-sm focus:outline-none border ${theme.inputBg}`}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  {products.length === 0 && (
                    <div className={`text-center py-12 border ${theme.surface} ${theme.subText} text-sm`}>
                      등록된 제품이 없습니다. 좌측 폼에서 첫 제품을 등록해주세요.
                    </div>
                  )}
                  {(() => {
                    const masterFiltered = masterSearch.trim()
                      ? products.filter(p =>
                          p.name.toLowerCase().includes(masterSearch.toLowerCase()) ||
                          p.company.toLowerCase().includes(masterSearch.toLowerCase()))
                      : products;

                    if (masterSearch && masterFiltered.length === 0) {
                      return (
                        <div className={`text-center py-8 border ${theme.surface} ${theme.subText} text-sm`}>
                          "{masterSearch}" 검색 결과 없음
                        </div>
                      );
                    }

                    return masterFiltered.map(product => {
                    const isEditing = editingId === product.id;
                    return (
                      <div key={product.id} className={`border text-sm ${theme.surface} transition-all`}>
                        {/* 기본 카드 */}
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <ProductThumb product={product} size={40} />
                            <div className="min-w-0">
                              <p className="font-semibold leading-snug [overflow-wrap:anywhere]">{product.name}</p>
                              <p className={`text-xs ${theme.subText} font-mono truncate`}>
                                {product.company}{product.phone ? ` · ${formatPhone(product.phone)}` : ''} · 재고 {product.currentStock}/{product.safeStock}{product.barcode ? ` · ${product.barcode}` : ''}{priceOf(product) ? ` · ${won(priceOf(product))}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0 ml-3">
                            <button
                              onClick={() => setEditingId(isEditing ? null : product.id)}
                              className={`px-2.5 py-1.5 border border-current ${isEditing ? 'opacity-100' : 'opacity-50'} hover:opacity-100 text-sm transition-all`}
                              aria-label="수정"
                              title={isEditing ? '편집 닫기' : '수정'}
                            >
                              {isEditing ? '✕' : '✎'}
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="px-2.5 py-1.5 border border-red-900/30 text-red-400 hover:bg-red-900/20 text-sm font-light transition-all"
                            >
                              삭제
                            </button>
                          </div>
                        </div>

                        {/* 인라인 편집 펼침 */}
                        {isEditing && (
                          <ProductEditor
                            theme={theme}
                            product={product}
                            companyList={allCompanyList}
                            categoryList={categoryList}
                            onSave={(patch) => {
                              handleUpdateProduct(product.id, patch);
                              setEditingId(null);
                            }}
                            onCancel={() => setEditingId(null)}
                            onImageUpload={(file) => handleProductImageUpload(product.id, file)}
                          />
                        )}
                      </div>
                    );
                  });
                  })()}
                </div>
              </div>

              {/* 거래처 마스터 섹션 (전체 너비) */}
              <div className="md:col-span-3">
                <div className={`border p-5 ${theme.surface}`}>
                  <div className="flex items-baseline justify-between mb-4 gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-light tracking-wide">거래처 마스터</h3>
                      <p className={`text-xs ${theme.subText} mt-1`}>
                        제품 없이도 거래처를 미리 등록하면 신규 제품 등록시 자동완성됩니다
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddCompany(true)}
                      className={`px-3 py-1.5 text-xs tracking-widest uppercase border border-current opacity-70 hover:opacity-100 transition-all flex-shrink-0 font-mono`}
                    >
                      + 추가
                    </button>
                  </div>

                  {companies.length === 0 ? (
                    <div className={`text-center py-6 border ${theme.border} ${theme.subText} text-sm`}>
                      등록된 거래처가 없습니다. 우측 상단 "+ 추가" 버튼으로 등록하세요.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {companies.map(c => {
                        const linkedCount = products.filter(p => p.company === c.name).length;
                        return (
                          <div key={c.id} className={`flex items-center justify-between p-3 border text-sm ${theme.border}`}>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{c.name}</p>
                              <p className={`text-xs ${theme.subText} font-mono truncate`}>
                                📞 {formatPhone(c.phone)}
                                {linkedCount > 0 && (
                                  <span className="ml-2 opacity-70">· 제품 {linkedCount}개</span>
                                )}
                              </p>
                              {c.memo && (
                                <p className={`text-xs ${theme.subText} italic truncate mt-0.5`}>
                                  💬 {c.memo}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteCompany(c.id)}
                              className="ml-2 px-2.5 py-1.5 border border-red-900/30 text-red-400 hover:bg-red-900/20 text-sm font-light transition-all flex-shrink-0"
                            >
                              삭제
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 적정선 추천 (전체 너비) */}
              <div className="md:col-span-3">
                <section className="f-panel">
                  <div className="f-panel-head" style={{ flexWrap: 'wrap' }}>
                    <div>
                      <h3 className="f-panel-title">적정선 추천</h3>
                      <p className="f-panel-sub">최근 4주 동안 빠른 차감으로 쓴 양을 보고, 다음 입고까지 버틸 만큼을 추천합니다.</p>
                    </div>
                    <div className="zc-seg" role="group" aria-label="추천 기준">
                      {[[7, '1주 치'], [14, '2주 치']].map(([d, l]) => (
                        <button key={d} className={recoDays === d ? 'is-on' : ''} onClick={() => setRecoDays(d)}>{l}</button>
                      ))}
                    </div>
                  </div>
                  {safeStockReco.length === 0 ? (
                    <p className="f-chart-empty" style={{ marginTop: 0 }}>추천할 품목이 없어요. 빠른 차감 기록이 7일 이상, 3개 이상 쌓인 품목부터 추천이 나옵니다.</p>
                  ) : (
                    <>
                      <div className="zc-reco-list">
                        {safeStockReco.map(r => (
                          <div key={r.id} className="zc-reco-row">
                            <div className="min-w-0 flex-1">
                              <b>{r.name}</b>
                              <small>최근 {r.days}일 {r.qty}개 사용 · 하루 약 {r.perDay < 1 ? r.perDay.toFixed(1) : Math.round(r.perDay * 10) / 10}개</small>
                            </div>
                            <span className="zc-reco-change f-num">{r.current} → <b>{r.rec}</b></span>
                            <button className="zc-btn-ghost" style={{ height: 36, fontSize: 13 }} onClick={() => applyReco([r])}>적용</button>
                          </div>
                        ))}
                      </div>
                      <div className="zc-modal-actions" style={{ marginTop: 12 }}>
                        <button className="zc-btn-primary" onClick={() => applyReco(safeStockReco)}>{safeStockReco.length}개 모두 적용</button>
                      </div>
                    </>
                  )}
                </section>
              </div>

              {/* 엑셀 가져오기 / 내보내기 (전체 너비) */}
              <div className="md:col-span-3">
                <section className="f-panel">
                  <div className="f-panel-head">
                    <div>
                      <h3 className="f-panel-title">엑셀 · 바코드 라벨</h3>
                      <p className="f-panel-sub">정리해 둔 엑셀(.xlsx)이나 CSV를 올리면 새 품목은 추가하고, 이미 있는 품목은 바뀐 값만 고칩니다.</p>
                    </div>
                  </div>
                  <div className="zc-excel-grid zc-excel-grid-4">
                    <label className={`zc-excel-card tone-blue ${busy ? 'is-busy' : ''}`}>
                      <span className="f-kpi-icon"><Icon name="upload" size={20} /></span>
                      <div><b>엑셀 · CSV 업로드</b><small>미리보기에서 확인 후 적용</small></div>
                      <input id="excel-upload" type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" disabled={busy} />
                    </label>
                    <button className="zc-excel-card tone-green" disabled={busy || products.length === 0} onClick={() => runExport(() => exportProductsXlsx(products, false))}>
                      <span className="f-kpi-icon"><Icon name="download" size={20} /></span>
                      <div><b>엑셀로 내보내기</b><small>현재 {products.length}개 품목</small></div>
                    </button>
                    <button className="zc-excel-card tone-orange" disabled={busy} onClick={() => runExport(() => exportProductsXlsx(products, true))}>
                      <span className="f-kpi-icon"><Icon name="sheet" size={20} /></span>
                      <div><b>엑셀 양식 받기</b><small>제목 줄이 들어 있는 빈 양식</small></div>
                    </button>
                    <button className="zc-excel-card tone-blue" disabled={products.length === 0} onClick={() => setShowLabels(true)}>
                      <span className="f-kpi-icon"><Icon name="scan" size={20} /></span>
                      <div><b>바코드 라벨 출력</b><small>바코드 없는 약에 붙일 라벨</small></div>
                    </button>
                  </div>
                  <p className="f-chart-empty">열 제목: 제품명(필수), 바코드, 카테고리, 거래처, 전화번호, 현재고, 적정선, 단가. 바코드 열은 엑셀에서 '텍스트' 형식으로 두면 앞자리 0이 지워지지 않습니다.</p>
                </section>
              </div>

            </div>
          )}

          {/* 설정 패널 — 브랜딩 커스터마이즈 */}
          {showSettings && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
              onClick={() => setShowSettings(false)}
            >
              <div
                className={`${theme.surface} border max-w-md w-full max-h-[85vh] overflow-y-auto`}
                onClick={e => e.stopPropagation()}
              >
                <div className={`p-5 border-b ${theme.border} flex items-center justify-between`}>
                  <div>
                    <h3 className="text-base font-light tracking-wide">앱 브랜딩</h3>
                    <p className={`text-xs ${theme.subText} mt-1 font-mono tracking-widest uppercase`}>Custom Identity</p>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-lg opacity-50 hover:opacity-100 w-8 h-8 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {/* 로고 업로드 */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-2 opacity-60">로고 이미지</label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 border border-current opacity-90 flex items-center justify-center bg-black/10 flex-shrink-0">
                        {branding.logoImage ? (
                          <img src={branding.logoImage} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className={`text-[11px] ${theme.subText} tracking-widest font-mono`}>NONE</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="block p-2 text-xs text-center tracking-wider border border-current opacity-70 hover:opacity-100 transition-all cursor-pointer">
                          로고 이미지 선택
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                          />
                        </label>
                        {branding.logoImage && (
                          <button
                            onClick={() => setBranding({...branding, logoImage: ''})}
                            className="block w-full p-2 text-xs tracking-wider border border-current opacity-50 hover:opacity-100 transition-all"
                          >
                            로고 제거
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 앱 이름 */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1 opacity-60">앱 이름</label>
                    <input
                      type="text"
                      value={branding.appName}
                      onChange={e => setBranding({...branding, appName: e.target.value})}
                      maxLength="30"
                      className={`w-full p-2.5 text-base focus:outline-none border tracking-wider ${theme.inputBg}`}
                    />
                    <p className={`text-xs ${theme.subText} mt-1`}>헤더, 발주 문자, 페이지 제목에 사용</p>
                  </div>

                  {/* 태그라인 */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1 opacity-60">태그라인</label>
                    <input
                      type="text"
                      value={branding.tagline}
                      onChange={e => setBranding({...branding, tagline: e.target.value})}
                      maxLength="60"
                      className={`w-full p-2.5 text-sm focus:outline-none border ${theme.inputBg}`}
                    />
                  </div>

                  {/* 미리보기 */}
                  <div className={`border ${theme.border} p-4`}>
                    <p className={`text-[11px] ${theme.subText} tracking-widest mb-2 uppercase font-mono`}>Preview</p>
                    <div className="flex items-center gap-3">
                      {branding.logoImage && (
                        <img src={branding.logoImage} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-lg font-light tracking-[0.2em] font-display truncate">{branding.appName}</div>
                        <div className={`text-xs ${theme.subText} tracking-[0.3em] font-mono uppercase truncate`}>{branding.tagline}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={resetBranding}
                    className="w-full py-2 text-xs tracking-widest uppercase border border-current opacity-40 hover:opacity-100 transition-all"
                  >
                    모두 기본값으로 초기화
                  </button>

                  {/* 데이터 사용량 정보 */}
                  <div className={`pt-4 mt-2 border-t ${theme.border}`}>
                    <div className="flex justify-between items-center text-xs">
                      <span className={`${theme.subText} tracking-widest uppercase font-mono`}>저장 공간 사용량</span>
                      <span className="font-mono">{safeStorage.usageKB()} KB / ~5,000 KB</span>
                    </div>
                    <p className={`text-xs ${theme.subText} mt-1.5 leading-relaxed`}>
                      모든 데이터는 이 기기에만 저장됩니다.
                      폰을 바꾸거나 브라우저 데이터를 지우면 기록이 사라지니
                      아래 '전체 백업'을 주기적으로 받아 두세요.
                    </p>
                  </div>

                  {/* 재고 파악 주기 */}
                  <div className={`pt-4 mt-2 border-t ${theme.border}`}>
                    <p className={`text-xs ${theme.subText} tracking-widest uppercase font-mono mb-2`}>
                      재고 파악 주기
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setStockCycle('weekly')}
                        className={`py-2.5 text-sm tracking-wide border-2 transition-all ${
                          stockCycle === 'weekly'
                            ? `${theme.pointBtn} border-transparent`
                            : 'border-current opacity-50 hover:opacity-100'
                        }`}
                      >
                        주 단위
                      </button>
                      <button
                        onClick={() => setStockCycle('monthly')}
                        className={`py-2.5 text-sm tracking-wide border-2 transition-all ${
                          stockCycle === 'monthly'
                            ? `${theme.pointBtn} border-transparent`
                            : 'border-current opacity-50 hover:opacity-100'
                        }`}
                      >
                        월 단위
                      </button>
                    </div>
                    <p className={`text-xs ${theme.subText} mt-1.5`}>
                      현재: <span className="font-medium">{cycleLabel.this}</span> 기준으로 통계가 표시됩니다
                    </p>
                  </div>

                  {/* 전체 백업 / 복원 */}
                  <div className={`pt-4 mt-2 border-t ${theme.border}`}>
                    <p className={`text-xs ${theme.subText} tracking-widest uppercase font-mono mb-2`}>
                      전체 백업 · 복원
                    </p>
                    <p className={`text-xs mb-2.5 ${lastBackup ? theme.subText : 'text-amber-500'}`}>
                      {lastBackup
                        ? '마지막 백업: ' + new Date(lastBackup).toLocaleString('ko-KR')
                        : '아직 백업한 적이 없습니다. 지금 한 번 받아 두세요.'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={downloadBackup}
                        className={`p-3 text-left border ${theme.border} hover:opacity-80 transition-all`}
                      >
                        <div className="text-sm font-medium mb-0.5">↓ 전체 백업</div>
                        <div className={`text-xs ${theme.subText} leading-snug`}>제품·거래처·발주 이력·설정 전부</div>
                      </button>
                      <label className={`p-3 text-left border ${theme.border} hover:opacity-80 transition-all cursor-pointer block`}>
                        <div className="text-sm font-medium mb-0.5">↑ 백업 복원</div>
                        <div className={`text-xs ${theme.subText} leading-snug`}>백업 파일(.json) 선택</div>
                        <input
                          type="file"
                          accept=".json,application/json"
                          onChange={handleBackupRestore}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className={`text-xs ${theme.subText} mt-2 leading-relaxed`}>
                      백업 파일은 카카오톡 '나에게 보내기'나 구글 드라이브에 보관해 두면 폰을 바꿔도 복원할 수 있습니다.
                    </p>
                  </div>

                  {/* 사용 가이드 다시 보기 */}
                  <div className={`pt-4 mt-2 border-t ${theme.border}`}>
                    <button
                      onClick={() => { setShowGuide(true); setShowSettings(false); }}
                      className={`w-full p-3 text-left border ${theme.border} hover:opacity-80 transition-all`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium tracking-wide">사용 가이드 다시 보기</p>
                          <p className={`text-xs ${theme.subText} mt-0.5`}>
                            5단계 빠른 시작 가이드
                          </p>
                        </div>
                        <span className="text-base opacity-50 flex-shrink-0">→</span>
                      </div>
                    </button>
                  </div>

                  {/* 사용 통계 (월별) */}
                  <div className={`pt-4 mt-2 border-t ${theme.border}`}>
                    <button
                      onClick={() => { setShowStats(true); setShowSettings(false); }}
                      className={`w-full p-3 text-left border ${theme.border} hover:opacity-80 transition-all`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium tracking-wide">사용 통계 (월별)</p>
                          <p className={`text-xs ${theme.subText} mt-0.5`}>
                            이번 달 / 지난 달 비교 · 제품별 사용량 랭킹
                          </p>
                        </div>
                        <span className="text-base opacity-50 flex-shrink-0">→</span>
                      </div>
                    </button>
                  </div>

                  {/* 위험 영역 — 전체 초기화 */}
                  <div className={`pt-4 mt-2 border-t border-red-900/30`}>
                    <p className={`text-xs text-red-400 tracking-widest uppercase font-mono mb-2`}>
                      위험 구역
                    </p>
                    <p className={`text-xs ${theme.subText} mb-2.5 leading-relaxed`}>
                      모든 제품, 히스토리, 브랜딩 설정을 영구 삭제합니다.
                      먼저 '전체 백업'을 받아 두세요.
                    </p>
                    <button
                      onClick={handleResetAll}
                      className="w-full py-2 text-xs tracking-widest uppercase border border-red-900/40 text-red-400 hover:bg-red-900/10 transition-all"
                    >
                      전체 데이터 영구 삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 직접 수량 입력 모달 (빠른 차감 탭에서 숫자 탭) */}
          {quickInputId !== null && (() => {
            const product = products.find(p => p.id === quickInputId);
            if (!product) return null;
            return (
              <QuickInputModal
                theme={theme}
                product={product}
                onSave={(newStock) => {
                  setProducts(prev => prev.map(p =>
                    p.id === quickInputId ? { ...p, currentStock: Math.max(0, newStock) } : p
                  ));
                  logHistory(product.id, product.name, newStock - product.currentStock, 'manual');
                  setQuickInputId(null);
                  showToast('재고가 설정되었습니다', 'success');
                }}
                onCancel={() => setQuickInputId(null)}
              />
            );
          })()}

          {/* 발주서 미리보기 + 편집 모달 */}
          {orderPreview && (
            <OrderPreviewModal
              theme={theme}
              preview={orderPreview}
              branding={branding}
              onSend={(text) => sendSmsMessage(orderPreview.company, orderPreview.info, text)}
              onCopy={(text) => {
                copyOrderText(orderPreview.company, orderPreview.info, text);
                logOrderHistory(orderPreview.company, orderPreview.info, 'preview', text);
              }}
              onClose={() => setOrderPreview(null)}
            />
          )}

          {/* 발주 이력 모달 */}
          {showOrderHistory && (
            <OrderHistoryModal
              theme={theme}
              history={orderHistory}
              onClose={() => setShowOrderHistory(false)}
              onClear={() => setOrderHistory([])}
            />
          )}

          {/* 거래처 단독 추가 모달 */}
          {showAddCompany && (
            <AddCompanyModal
              theme={theme}
              onAdd={handleAddCompany}
              onClose={() => setShowAddCompany(false)}
            />
          )}

          {/* 오늘 사용 히스토리 모달 */}
          {showTodayUsage && (
            <TodayUsageModal
              theme={theme}
              usage={todayUsage}
              onCancel={cancelUsage}
              onClose={() => setShowTodayUsage(false)}
            />
          )}

          {/* 월별 통계 모달 */}
          {showStats && (
            <StatsModal
              theme={theme}
              stats={monthlyStats}
              cycleLabel={cycleLabel}
              onClose={() => setShowStats(false)}
            />
          )}

          {/* 바코드 스캐너 */}
          {scanMode && (() => {
            const p = scanResult && scanResult.productId ? products.find(x => x.id === scanResult.productId) : null;
            const titles = {
              count: ['바코드를 스캔하거나', '번호를 입력하세요'],
              quick: ['차감할 약의 바코드를', '스캔하세요'],
              assign: ['등록할 약의 바코드를', '스캔하세요'],
            };
            const hint = scanMode === 'count' && activeCount ? activeCount.name : null;
            return (
              <ScanModal title={<>{titles[scanMode][0]}<br />{titles[scanMode][1]}</>} hint={hint} onCode={handleScanCode} onClose={closeScan}>
                {scanResult && scanResult.missing && (
                  <div className="zc-scan-result">
                    <div className="zc-scan-item"><span className="zc-scan-thumb"><Icon name="alert" size={20} /></span>
                      <div className="min-w-0"><small>등록되지 않은 바코드</small><b className="f-num">{scanResult.code}</b></div></div>
                    <button className="zc-scan-submit" onClick={() => registerMissingBarcode(scanResult.code)}>이 바코드로 품목 등록</button>
                  </div>
                )}
                {p && scanMode === 'count' && activeCount && (() => {
                  const snap = activeCount.snapshot[p.id];
                  const system = snap ? snap.system : p.currentStock;
                  return (
                    <div className="zc-scan-result">
                      <div className="zc-scan-item">
                        <ProductThumb product={p} size={44} />
                        <div className="min-w-0 flex-1"><small>{p.company} · 전산 {system}</small><b>{p.name}</b></div>
                        <div className="zc-scan-step">
                          <button onClick={() => setScanQty(q => Math.max(0, q - 1))} aria-label="1 줄이기"><Icon name="minus" size={20} strokeWidth={2} /></button>
                          <input id="scan-qty" type="number" inputMode="numeric" min="0" value={scanQty} onChange={e => setScanQty(Math.max(0, Number(e.target.value) || 0))} aria-label="실물 수량" />
                          <button onClick={() => setScanQty(q => q + 1)} aria-label="1 늘리기"><Icon name="plus" size={20} strokeWidth={2} /></button>
                        </div>
                      </div>
                      <button className="zc-scan-submit" onClick={() => {
                        setCountActual(activeCount.id, p.id, scanQty);
                        showToast(`${p.name} 실물 ${scanQty}개 (${scanQty - system === 0 ? '일치' : (scanQty - system > 0 ? '+' : '') + (scanQty - system)})`, 'success');
                        setScanResult(null);
                      }}>
                        등록하기 <Icon name="check" size={18} />
                      </button>
                    </div>
                  );
                })()}
                {p && scanMode === 'quick' && (
                  <div className="zc-scan-result">
                    <div className="zc-scan-item">
                      <ProductThumb product={p} size={44} />
                      <div className="min-w-0 flex-1"><small>{p.company} · 적정선 {p.safeStock}</small><b>{p.name}</b></div>
                      <div className="zc-scan-step">
                        <button onClick={() => handleQuickAdjust(p.id, -1)} disabled={p.currentStock === 0} aria-label="1개 차감"><Icon name="minus" size={20} strokeWidth={2} /></button>
                        <strong className="f-num">{p.currentStock}</strong>
                        <button onClick={() => handleQuickAdjust(p.id, 1)} aria-label="1개 추가"><Icon name="plus" size={20} strokeWidth={2} /></button>
                      </div>
                    </div>
                    <button className="zc-scan-submit" onClick={() => setScanResult(null)}>다음 약 스캔 <Icon name="arrow" size={18} /></button>
                  </div>
                )}
              </ScanModal>
            );
          })()}

          {receiveOrder && (
            <ReceiveModal order={receiveOrder} onApply={(rows) => applyReceive(receiveOrder.company, rows)} onClose={() => setReceiveOrder(null)} />
          )}

          {showLabels && (
            <LabelModal products={[...products].sort((a, b) => a.name.localeCompare(b.name, 'ko'))} onPrint={handlePrintLabels} onClose={() => setShowLabels(false)} />
          )}

          {importPlan && (
            <ImportPreviewModal plan={importPlan.plan} fileName={importPlan.fileName} onApply={applyImport} onClose={() => setImportPlan(null)} />
          )}

          {showFinishCount && activeCount && (
            <FinishCountModal summary={countSummary(buildCountRows(activeCount, products))} onFinish={finishCount} onClose={() => setShowFinishCount(false)} />
          )}

          {/* 사용 가이드 모달 (첫 방문 자동 + 설정에서 수동) */}
          {showGuide && (
            <GuideModal
              theme={theme}
              stockCycle={stockCycle}
              setStockCycle={setStockCycle}
              onStartEmpty={startEmpty}
              onStartSample={() => {
                setProducts(defaultProducts);
                setIsDemo(true);
                showToast('샘플 데이터로 둘러봅니다', 'success');
              }}
              onClose={() => setShowGuide(false)}
            />
          )}

          {/* CSV 미리보기 모달 */}
          {csvPreview && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
              onClick={() => setCsvPreview(null)}
            >
              <div
                className={`${theme.surface} border max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col`}
                onClick={e => e.stopPropagation()}
              >
                <div className={`p-5 border-b ${theme.border}`}>
                  <h3 className="text-base font-light tracking-wide">CSV 미리보기</h3>
                  <p className={`text-sm ${theme.subText} mt-1 font-mono`}>
                    {csvPreview.length}개의 제품이 발견되었습니다
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                  <div className="space-y-1.5">
                    {csvPreview.slice(0, 50).map((p, i) => (
                      <div key={i} className={`flex items-center gap-3 p-2 border ${theme.border} text-sm`}>
                        <span className={`${theme.subText} font-mono text-xs w-6`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{p.name}</div>
                          <div className={`text-xs ${theme.subText} font-mono truncate`}>
                            {p.company} · {p.phone} · 재고 {p.currentStock}/{p.safeStock}
                          </div>
                        </div>
                      </div>
                    ))}
                    {csvPreview.length > 50 && (
                      <div className={`text-center text-sm ${theme.subText} py-2`}>
                        ... 외 {csvPreview.length - 50}개
                      </div>
                    )}
                  </div>
                </div>

                <div className={`p-4 border-t ${theme.border} flex flex-col md:flex-row gap-2`}>
                  <button
                    onClick={() => setCsvPreview(null)}
                    className="flex-1 py-2.5 text-sm tracking-wider border border-current opacity-60 hover:opacity-100 transition-all"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => confirmCSVImport('append')}
                    className="flex-1 py-2.5 text-sm tracking-wider border border-current opacity-80 hover:opacity-100 transition-all"
                  >
                    기존 데이터에 추가
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`현재 ${products.length}개 데이터가 삭제되고 ${csvPreview.length}개로 교체됩니다. 진행하시겠습니까?`)) {
                        confirmCSVImport('replace');
                      }
                    }}
                    className={`flex-1 py-2.5 text-sm tracking-wider font-medium ${theme.pointBtn}`}
                  >
                    전체 교체
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 토스트 알림 */}
          {toast && (
            <div
              key={toast.id}
              className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-3 text-sm font-medium border rounded-full ${theme.surface} shadow-2xl`}
              style={{ animation: 'filoToast 1.8s ease-out forwards' }}
            >
              {toast.message}
            </div>
          )}

          </main>
        </div>
      );
    }

    // ============================================
    // 5. MOUNT
    // ============================================
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);

    // 로딩 스크린 페이드아웃
    setTimeout(() => {
      const loader = document.getElementById('filo-loader');
      if (loader) {
        loader.classList.add('fade-out');
        setTimeout(() => loader.remove(), 400);
      }
    }, 300);

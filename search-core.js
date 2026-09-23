/* KRNO shared smart-search core (site + invoice) */
'use strict';
/* ---------- smart bilingual search ---------- */
const AR_DIG = { '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
                 '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9' };
function normAr(s) {
  return (s || '')
    .replace(/[\u064B-\u0652\u0640]/g, '')          // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ا{2,}/g, 'ا')
    .replace(/[٠-٩۰-۹]/g, (d) => AR_DIG[d] || d)
    .toLowerCase();
}
/* Egyptian-Arabic → English catalog vocabulary */
const SYN_RAW = [
  [['كوب','كوبايه','كبايه','كوبايات','كبايات','اكواب','كوبات','كاس','كاسات','كوبايا'],'cup'],
  [['غطا','اغطيه','الغطا','غطيان','غطاء'],'lid'],
  [['علبه','علب','عبوه','عبوات','علبة','باكت','باك','علبة'],'container box'],
  [['طبق','اطباق','طباق','اطبق'],'plate'],
  [['صينيه','صواني','صوانى','صينيات'],'tray'],
  [['سلطانيه','سلطانيات','زبديه','زبديات','طاسه'],'bowl'],
  [['شوكه','شوك','شوكات'],'fork'],
  [['سكينه','سكاكين','سكين'],'knife'],
  [['معلقه','معالق','ملعقه','ملاعق','معلقات'],'spoon'],
  [['ادوات','المائده','كاتلري','موائد'],'cutlery'],
  [['فوم','فلين','الفوم'],'foam'],
  [['مفصلي','مفصليه','مفصلية','هينجد','باكب'],'hinged'],
  [['مدور','مدوره','دايري','دايريه','راوند'],'round'],
  [['مربع','مربعه','مربعات'],'square'],
  [['مستطيل','مستطيله','مستطيلات'],'rectangular'],
  [['مشروبات','مشروب','عصير','عصاير','سوفت','شرب'],'beverage'],
  [['حلويات','حلواني','حلا','ديسرت'],'sweet dessert'],
  [['صوص','صلصه','صلصات','طحينه','مخلل'],'sauce'],
  [['سوشي','سوشى'],'sushi'],
  [['كيك','تورته','تورتة','جاتوه','كيكات'],'cake'],
  [['جبنه','جبن','جبنة','رومي'],'cheese'],
  [['لبن','البان','زبادي','رايب','روب','مهلبية'],'dairy'],
  [['وجبه','وجبات','ميل','وجبة'],'meal'],
  [['سخن','ساخن','حراري','حار'],'hot'],
  [['بارد','بارده','مثلج','ثلج'],'cold'],
  [['اونصه','اونسه','اونس','أونصة','اوقية'],'oz'],
  [['مللي','ملي','مل','سم3'],'ml'],
  [['كيلو','كيلوجرام','كجم'],'kilo'],
  [['كيس','اكياس','شنطه','شنط','اكياس'],'bag'],
  [['بلاستيك','بلاستك','بلاستيكي'],'pet pp ps'],
  [['شفاف','شفافه','بلور','كريستال'],'transparent'],
  [['اسود','سودا','أسود'],'black'],
  [['ابيض','بيضا','أبيض'],'white'],
  [['دهبي','ذهبى','دهب','ذهبي'],'gold'],
  [['تركي','تركى','توركي','تورك'],'turkish'],
  [['محكم','محكمه','امان'],'safety'],
  [['عزومه','عزومات','مناسبات','حفلات'],'party'],
  [['مطعم','مطاعم','كافيه','كافيهات','مقهي','مقاهي'],''],
  [['تغليف','تعبئه','تعبئة','باكيجنج'],'packaging'],
];
const SYN = new Map();
for (const [terms, en] of SYN_RAW)
  for (const t of terms) SYN.set(normAr(t), en.split(' ').filter(Boolean));

window.KrnoSearch = {
  normAr,
  build(products) {
    let HAY = null;
    const hay = (p) => {
      if (!HAY) {
        HAY = new Map();
        for (const x of products) {
          const raw = (x.code + ' ' + x.title + ' ' + x.group + ' ' + x.section + ' ' +
                       x.material + ' ' + x.capacity + ' ' + x.specs.map((s) => s.join(' ')).join(' ')).toLowerCase();
          HAY.set(x.id, raw + ' ' + normAr(x.code).replace(/[^a-z0-9]/g, ''));
        }
      }
      return HAY.get(p.id);
    };
    const expand = (q) => {
      const groups = [], echo = [];
      for (const tok of q.split(/\s+/).filter(Boolean)) {
        const nt = normAr(tok);
        const syn = SYN.get(nt);
        if (syn && syn.length) { groups.push([tok.toLowerCase(), ...syn]); echo.push([tok, syn[0].toUpperCase()]); }
        else groups.push([nt]);
      }
      return { groups, echo };
    };
    /* EN stem: cup/cups -> cup (keep both) */
    const variants = (t) => {
      const v = [t];
      if (/[a-z0-9]$/.test(t) && /s$/.test(t)) v.push(t.slice(0, -1));
      return v;
    };
    const W_SPLIT = /[^a-z\u0600-\u06FF0-9]+/;
    const PHRASE_BONUS = 15;
    const search = (q, limit = 12) => {
      const qt = String(q || '').trim();
      if (!qt) return [];
      const nq = normAr(qt);
      let toks = qt.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t));
      toks = toks.flatMap((t) => {
        const runs = t.match(/[0-9]+|[\p{L}]+/gu) || [];
        return runs.length > 1 ? runs : [t];
      });
      if (!toks.length) return [];
      const scored = [];
      for (const p of products) {
        const h = normAr(hay(p));
        const codeN = normAr(p.code), titleN = normAr(p.title);
        const grpN = normAr(p.group), secN = normAr(p.section);
        const matN = normAr(p.material), capN = normAr(p.capacity);
        const codeFlat = codeN.replace(/[^a-z0-9]/g, '');
        const titleWords = titleN.split(W_SPLIT).filter(Boolean);
        const grpWords = (grpN + ' ' + secN).split(W_SPLIT).filter(Boolean);
        /* multi-word exact/prefix code match: "K-92-12", "k 92 12" */
        if (toks.length > 1 && codeFlat.length >= 3) {
          const qFlat = nq.replace(/[^a-z0-9]/g, '');
          if (qFlat.length >= 4) {
            if (codeFlat === qFlat) { scored.push({ p, score: 1000 }); continue; }
            if (codeFlat.indexOf(qFlat) === 0) { scored.push({ p, score: 960 }); continue; }
          }
        }
        let total = 0, ok = true;
        for (const tok of toks) {
          const nt = normAr(tok);
          let best = 0;
          if (/^[0-9]+$/.test(nt)) {
            const words = (codeN + ' ' + titleN + ' ' + capN).split(W_SPLIT).filter(Boolean);
            if (words.includes(nt)) best = 90;
            else if (words.some((w) => w.indexOf(nt) === 0)) best = 74;
            if (best === 0) { ok = false; break; }
            total += best;
            continue;
          }
          for (const v of variants(nt)) {
            if (!v || v.length < 1) continue;
            const vFlat = v.replace(/[^a-z0-9]/g, '');
            let sc = 0;
            if (vFlat.length >= 3 && codeFlat && codeFlat === vFlat) sc = 100;
            else if (codeN === v) sc = 100;
            else if (titleN === v) sc = 95;
            else if (v.length >= 2 && codeN.indexOf(v) === 0) sc = 88;
            else if (v.length >= 2 && titleN.indexOf(v) === 0) sc = 84;
            else if (titleWords.includes(v)) sc = 78;
            else if (grpN === v || secN === v) sc = 76;
            else if (grpWords.includes(v)) sc = 72;
            else if (capN === v || matN === v) sc = 70;
            else if (h.indexOf(v) !== -1) sc = 60;
            if (sc > best) best = sc;
          }
          if (best === 0) {
            const synTerms = (SYN.get(nt) || []).map((t2) => normAr(t2));
            for (const st of synTerms) {
              if (!st) continue;
              if (titleWords.includes(st) || titleN.indexOf(st) === 0) { best = 58; break; }
              if (h.indexOf(st) !== -1) { best = 50; break; }
            }
          }
          if (best === 0) { ok = false; break; }
          total += best;
        }
        if (!ok) continue;
        if (nq.length > 2 && /[a-z\u0600-\u06FF]/.test(nq) && h.indexOf(nq) !== -1) total += PHRASE_BONUS;
        scored.push({ p, score: total });
      }
      scored.sort((a, b) => b.score - a.score || a.p.title.length - b.p.title.length || (a.p.code < b.p.code ? -1 : 1));
      return scored.slice(0, limit);
    };
    return { hay, expand, search };
  },
};


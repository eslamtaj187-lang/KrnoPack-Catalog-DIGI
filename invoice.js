/* ============ KRNO internal invoice system — staff only ============ */
'use strict';

/* ---------- CONFIG ---------- */
const STAFF_PASS = 'krno2026';      // ← غيّر كود الدخول من هنا
const DRAFT_KEY = 'krno_invoice_draft3';
const COMPANY_KEY = 'krno_inv_company';
const BANK_KEY = 'krno_inv_bank';
const HIST_KEY = 'krno_inv_history';
const COLS_KEY = 'krno_inv_cols';
const LANG_KEY = 'krno_inv_lang';
const FT_CONTAINER_CBM = 68;        // 40ft Container Qty = 68 / CBM

const PRODUCTS = window.KRNO_DATA.products;
const PRICE_DATA = window.KRNO_PRICES || { company: {}, meta: {} };
const KS = window.KrnoSearch.build(PRODUCTS);
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const money = (n) => num(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/* ---------- I18N (commercial terms) ---------- */
const I18N = {
  en: {
    gateTitle: 'Internal Invoice System', gateSub: 'For the sales department only — not available to customers',
    passPh: 'Passcode', enter: 'Enter', gateErr: 'Wrong passcode — try again',
    appTitle: 'Internal Invoice System', appSub: 'Internal only — not for publishing or customers',
    save: 'Save', newInv: 'New', history: 'History', excel: 'Export Excel', print: 'Print / PDF',
    copy: 'Copy Summary', columns: 'Columns', settings: '⚙ Company Settings',
    setT: 'Company details (shown on the printed invoice) — all editable',
    sName: 'Company name', sNamePh: 'KRNO Plastic Factory', sAddr1: 'Address line 1', sAddr2: 'Address line 2',
    sAddr3: 'Address line 3', sTel: 'Phone', sPrefix: 'Invoice no. prefix',
    saveSet: 'Save settings', resetSet: 'Restore defaults', close: 'Close',
    colT: 'Show / hide columns (calculations are not affected)',
    tots: 'Totals', totT: 'Show / hide totals (visual only — calculations are not affected)',
    hNo: 'No.', hTitle: 'Title', hDate: 'Date', hCust: 'Customer', hCur: 'Cur.', hTotal: 'Total', hItems: 'Items', hSaved: 'Last saved',
    histT: 'Saved invoices', histEmpty: 'No saved invoices yet — press “Save” after finishing an invoice.',
    bkT: 'Backup / restore',
    bkHint: 'The backup file (JSON) includes: saved invoices, company & bank settings, language preference and column visibility. It never touches the catalog data.',
    bkExport: 'Export backup (JSON)', bkImport: 'Import backup',
    customer: 'Customer information', customerHint: 'Paste from Excel as-is — line breaks are kept',
    customerPh: 'ABC COMPANY LTD\nIndustrial Zone, Cairo\nEgypt\nTel: +20 xxx xxx xxxx\nEmail: example@email.com\nContact Person: Ahmed',
    no: 'Invoice No.', date: 'Date', currency: 'Currency', title: 'Invoice title',
    addItems: 'Add items', addHint: 'From the catalog or a free row — every cell stays editable',
    pickPh: 'Search by code, name, or Arabic: cup, lid, كوباية، غطا، صينية…',
    freeRow: '＋ Free row (not in catalog)',
    items: 'Invoice items', itemsHint: 'Every cell is editable directly', empty: 'No items yet — search above or add a free row',
    thDesc: 'Description', thCode: 'Item Code', thWeight: 'Unit Weight (g)', thPcs: 'Pieces per Carton',
    thDims: 'Carton Dimensions', thCbm: 'CBM', thBoxes: 'Cartons', thPrice: 'Price per Carton',
    thTotal: 'Total Value', thQ40: '40ft Container Qty', thDisc: 'Price in USD', del: 'Delete',
    tBoxes: 'Total Cartons', tPcs: 'Total Pieces', tNetW: 'Net Weight — auto (kg)', tGrossW: 'Gross Weight (kg)',
    tSub: 'Subtotal', tFreight: 'Freight', tVat: 'VAT %', tNet: 'NET TOTAL',
    discPct: 'Discount % (for Price in USD)', usdRate: 'USD Rate (EGP per $)',
    convHint: 'Price in USD = (Price EGP × (1 − Discount%)) ÷ USD Rate — computed only when the invoice currency is EGP; otherwise “—”.',
    plChip: 'List:', plTitle: 'Price Lists',
    plT: 'Price lists (Item Code + Price) — prices auto-fill when adding items',
    plHint: 'Upload any Excel sheet whose header row contains an “Item Code” and a “Price / Price Per Carton” column (the KRNO export sheet reads as-is). Auto-filled prices stay fully editable, and the catalog is never touched.',
    plUpload: '⬆ Upload price list (.xlsx)', plApplyBtn: '⇩ Apply prices to invoice',
    plPrices: 'prices',
    plLoaded: 'Price list loaded: {n} prices', plNone: 'Could not find Item Code / Price columns in this file',
    plErr: 'Could not read the file — make sure it is .xlsx', plNoActive: 'No active price list selected',
    plApplied: 'Prices applied to {n} items', plNoMatch: 'No invoice item matches this list',
    plEmpty: 'No lists yet — upload a sheet with Item Code + Price columns', plDelQ: 'Delete this price list?',
    notes: 'Invoice notes (shown in print)', notesPh: 'Extra notes for the customer…',
    bankT: 'Invoice terms & bank (shown at the bottom of the printed invoice — editable)',
    foot: 'Draft auto-saves on this device · KRNO Sales Tools · v2026',
    pNo: 'No.:', pDate: 'Date:', pCustomer: 'CUSTOMER', pNotes: 'NOTES', pDetails: 'OTHER DETAILS',
    pStamp: 'Company Stamp', pNetW: 'Net Weight', pGrossW: 'Gross Weight', kg: 'kg',
    pTotal: 'TOTAL', pBank: 'Bank details:',
    add: 'Add', bk: '🗂 Backup', seller: 'From (Seller)',
    saved: 'Invoice saved to history', copied: 'Summary copied to clipboard', exported: 'Excel file exported',
    xlsErr: 'Excel library failed to load — check the connection and reload',
    bkExported: 'Backup file downloaded', bkImported: 'Backup restored', bkInvalid: 'Invalid backup file',
    deleted: 'Invoice deleted', duped: 'Invoice duplicated',
    confirmNew: 'Start a new invoice? The current draft will be cleared (saved invoices stay in History).',
    confirmDel: 'Delete this invoice from history?',
    confirmImport: 'Import this backup? It will replace saved invoices and current settings.',
    open: 'Open', dup: 'Duplicate', delH: 'Delete', pdf: 'PDF', xls: 'Excel',
  },
  ar: {
    gateTitle: 'نظام الفواتير الداخلي', gateSub: 'لقسم المبيعات فقط — غير متاح للعملاء',
    passPh: 'كود الدخول', enter: 'دخول', gateErr: 'كود غير صحيح — حاول تاني',
    appTitle: 'نظام الفواتير الداخلي', appSub: 'داخلي فقط — غير مخصص للنشر أو للعملاء',
    save: 'حفظ', newInv: 'جديدة', history: 'السجل', excel: 'تصدير Excel', print: 'طباعة / PDF',
    copy: 'نسخ ملخص', columns: 'الأعمدة', settings: '⚙ إعدادات الشركة',
    setT: 'بيانات الشركة (تظهر في الفاتورة المطبوعة) — كلها قابلة للتعديل',
    sName: 'اسم الشركة', sNamePh: 'KRNO Plastic Factory', sAddr1: 'العنوان سطر 1', sAddr2: 'العنوان سطر 2',
    sAddr3: 'العنوان سطر 3', sTel: 'التليفون', sPrefix: 'بادئة رقم الفاتورة',
    saveSet: 'حفظ الإعدادات', resetSet: 'استرجاع الافتراضي', close: 'إغلاق',
    colT: 'إظهار / إخفاء الأعمدة (الحسابات مش متأثرة)',
    tots: 'الإجماليات', totT: 'إظهار / إخفاء الإجماليات (للعرض بس — الحسابات مش متأثرة)',
    hNo: 'الرقم', hTitle: 'العنوان', hDate: 'التاريخ', hCust: 'العميل', hCur: 'العملة', hTotal: 'الصافي', hItems: 'أصناف', hSaved: 'آخر حفظ',
    histT: 'الفواتير المحفوظة', histEmpty: 'مفيش فواتير محفوظة لسه — اضغط «حفظ» بعد ما تكمل الفاتورة.',
    bkT: 'نسخ احتياطي / استعادة',
    bkHint: 'ملف النسخة الاحتياطية (JSON) فيه: الفواتير المحفوظة، إعدادات الشركة والبنك، تفضيل اللغة، وإظهار/إخفاء الأعمدة. مش بيفضش على بيانات الكتالوج أبدًا.',
    bkExport: 'تحميل نسخة احتياطية (JSON)', bkImport: 'استيراد نسخة احتياطية',
    customer: 'بيانات العميل', customerHint: 'انسخ ولزق من Excel زي ما هو — الأسطر محفوظة',
    customerPh: 'ABC COMPANY LTD\nIndustrial Zone, Cairo\nEgypt\nTel: +20 xxx xxx xxxx\nEmail: example@email.com\nContact Person: Ahmed',
    no: 'رقم الفاتورة', date: 'التاريخ', currency: 'العملة', title: 'عنوان الفاتورة',
    addItems: 'إضافة أصناف', addHint: 'من الكتالوج أو سطر حر — وكل خلية بعد كده تقدر تعدلها',
    pickPh: 'ابحث بالكود أو الاسم أو بالعربي: كوباية، غطا، صينية، cup، lid…',
    freeRow: '＋ سطر حر (صنف مش في الكتالوج)',
    items: 'أصناف الفاتورة', itemsHint: 'كل الخلايا قابلة للتعديل مباشرة', empty: 'مفيش أصناف لسه — ابحث فوق أو ضيف سطر حر',
    thDesc: 'البيان', thCode: 'الكود', thWeight: 'وزن القطعة (جرام)', thPcs: 'قطعة / كرتونة',
    thDims: 'مقاس الكرتونة', thCbm: 'CBM', thBoxes: 'كراتين', thPrice: 'سعر الكرتونة',
    thTotal: 'الإجمالي', thQ40: 'كمية كونتينر 40 قدم', thDisc: 'السعر بالدولار', del: 'حذف',
    tBoxes: 'إجمالي الكراتين', tPcs: 'إجمالي القطع', tNetW: 'الوزن الصافي — تلقائي (كجم)', tGrossW: 'الوزن التقريبي (كجم)',
    tSub: 'الإجمالي قبل الشحن والضريبة', tFreight: 'الشحن', tVat: 'الضريبة %', tNet: 'صافي الفاتورة',
    discPct: 'نسبة الخصم % (لعمود السعر بالدولار)', usdRate: 'سعر الدولار (ج.م لكل $)',
    convHint: 'السعر بالدولار = (السعر بالجنيه × (1 − نسبة الخصم)) ÷ سعر الدولار — بتتحسب فقط لما عملة الفاتورة جنيه مصري؛ وإلا بتظهر «—».',
    plChip: 'قائمة:', plTitle: 'قوائم الأسعار',
    plT: 'قوائم أسعار (كود الصنف + السعر) — السعر بيتحط تلقائي عند إضافة أي صنف',
    plHint: 'ارفع أي شيت Excel فيه صف عناوين بأعمدة «Item Code» و«Price / Price Per Carton» (شيت التصدير بتاعكم بيتقري زي ما هو). الأسعار اللي بتنزل تلقائي بتفضل قابلة للتعديل، ومفيش أي مساس ببيانات الكتالوج.',
    plUpload: '⬆ رفع قائمة أسعار (.xlsx)', plApplyBtn: '⇩ تطبيق الأسعار على الفاتورة',
    plPrices: 'سعر',
    plLoaded: 'القائمة اتحمّلت: {n} سعر', plNone: 'مش لاقي أعمدة كود الصنف والسعر في الملف ده',
    plErr: 'ملف مش مقدور عليه — اتأكد إنه xlsx', plNoActive: 'مفيش قائمة أسعار مفعّلة',
    plApplied: 'تم تحديث أسعار {n} صنف', plNoMatch: 'ولا صنف في الفاتورة مطابق للقائمة دي',
    plEmpty: 'مفيش قوائم لسه — ارفع شيت فيه عمود كود الصنف وعمود السعر', plDelQ: 'تمسح قائمة الأسعار دي؟',
    notes: 'ملاحظات الفاتورة (تظهر في الطباعة)', notesPh: 'ملاحظات إضافية للعميل…',
    bankT: 'شروط الفاتورة والبنك (تظهر أسفل الفاتورة المطبوعة — قابلة للتعديل)',
    foot: 'مسودة الفاتورة بتتحفظ تلقائيًا على الجهاز · KRNO Sales Tools · v2026',
    pNo: 'رقم:', pDate: 'التاريخ:', pCustomer: 'العميل', pNotes: 'ملاحظات', pDetails: 'تفاصيل أخرى',
    pStamp: 'ختم الشركة', pNetW: 'الوزن الصافي', pGrossW: 'الوزن التقريبي', kg: 'كجم',
    pTotal: 'الإجمالي', pBank: 'بيانات البنك:',
    add: 'إضافة', bk: '🗂 نسخ احتياطي', seller: 'من (البايع)',
    saved: 'تم حفظ الفاتورة في السجل', copied: 'تم نسخ الملخص', exported: 'تم تصدير ملف Excel',
    xlsErr: 'مكتبة Excel مش محملة — اتأكد من الاتصال وعدّل',
    bkExported: 'تم تحميل ملف النسخة الاحتياطية', bkImported: 'تم استرجاع النسخة الاحتياطية', bkInvalid: 'ملف نسخة احتياطية غير صالح',
    deleted: 'تم حذف الفاتورة', duped: 'تم إنشاء نسخة من الفاتورة',
    confirmNew: 'فاتورة جديدة؟ المسودة الحالية هتتمسح (الفواتير المحفوظة بتفضل في السجل).',
    confirmDel: 'تمسح الفاتورة دي من السجل؟',
    confirmImport: 'تستورد النسخة دي؟ هتستبدل الفواتير المحفوظة والإعدادات الحالية.',
    open: 'فتح', dup: 'نسخة', delH: 'حذف', pdf: 'PDF', xls: 'Excel',
  },
};
let LANG = 'en';
try { LANG = localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { /* ignore */ }
if (!I18N[LANG]) LANG = 'en';
const T = (k) => (I18N[LANG] && I18N[LANG][k]) || (I18N.en[k] || k);

/* ---------- static data (company + bank defaults from user's sheet) ---------- */
const BANK_DEFAULTS = {
  bank: 'Commercial international bank (CIB) — Smart village branch, Building F22 - Giza - EGYPT',
  acc: '100017426488',
  swift: 'CIBEEGCX 119',
  iban: 'EG100010009500000100017426488',
  terms: 'Prices are ExWork/FOB/CIF\nDelivery: 10 days after receiving the down payment.\nPayment: 100% cash against documents',
  cert: 'We certify that this invoice is authentic and the only one issued by us for the goods described here in, that it shows their exact value without any deduction and their origin is Egyptian.',
};
function company() {
  try { return Object.assign({}, PRICE_DATA.company, JSON.parse(localStorage.getItem(COMPANY_KEY) || '{}')); }
  catch (e) { return PRICE_DATA.company; }
}
function bank() {
  try { return Object.assign({}, BANK_DEFAULTS, JSON.parse(localStorage.getItem(BANK_KEY) || '{}')); }
  catch (e) { return BANK_DEFAULTS; }
}
function saveBank() {
  localStorage.setItem(BANK_KEY, JSON.stringify({
    bank: $('#bBank').value, acc: $('#bAcc').value, swift: $('#bSwift').value,
    iban: $('#bIban').value, terms: $('#bTerms').value, cert: $('#bCert').value,
  }));
}

/* ---------- columns & visibility ---------- */
const COLS = [
  { id: 'desc' }, { id: 'code' }, { id: 'weight' }, { id: 'pcs' }, { id: 'dims' },
  { id: 'cbm' }, { id: 'boxes' }, { id: 'price' }, { id: 'total' }, { id: 'q40' }, { id: 'disc' },
];
let colVis = {};
try { colVis = Object.assign({ desc: true, code: true, weight: true, pcs: true, dims: true, cbm: true,
  boxes: true, price: true, total: true, q40: true, disc: true }, JSON.parse(localStorage.getItem(COLS_KEY) || '{}')); }
catch (e) { /* defaults */ }
const visCols = () => COLS.filter((c) => colVis[c.id]);

/* ---------- totals visibility (independent from columns; visual only) ---------- */
const TOTS_KEY = 'krno_inv_tots';
const TOTS = [
  { id: 'boxes', key: 'tBoxes' }, { id: 'pcs', key: 'tPcs' },
  { id: 'netw', key: 'tNetW' }, { id: 'grossw', key: 'tGrossW' },
  { id: 'sub', key: 'tSub' }, { id: 'freight', key: 'tFreight' },
  { id: 'vat', key: 'tVat' }, { id: 'net', key: 'tNet' },
];
const defaultTots = () => ({ boxes: true, pcs: true, netw: true, grossw: true, sub: true, freight: true, vat: true, net: true });
let totVis = defaultTots();
try { totVis = Object.assign(defaultTots(), JSON.parse(localStorage.getItem(TOTS_KEY) || '{}')); } catch (e) { /* defaults */ }
function applyTotVis() {
  document.querySelectorAll('[data-tot]').forEach((el) => {
    el.classList.toggle('is-off', totVis[el.getAttribute('data-tot')] === false);
  });
}
function renderTotsList() {
  const el = $('#totsList'); if (!el) return;
  el.innerHTML = TOTS.map((c) => `<label class="col-chk"><input type="checkbox" data-t="${c.id}" ${totVis[c.id] ? 'checked' : ''}> ${esc(T(c.key))}</label>`).join('');
}
function setTotVis(next, persist) {
  totVis = Object.assign(defaultTots(), next || {});
  if (persist !== false) localStorage.setItem(TOTS_KEY, JSON.stringify(totVis));
  renderTotsList(); applyTotVis();
}
function applyColVis() {
  document.querySelectorAll('.col').forEach((el) => {
    const c = [...el.classList].find((x) => x.indexOf('col-') === 0);
    if (!c) return;
    const id = c.slice(4);
    el.classList.toggle('is-hidden', !colVis[id]);
  });
}

/* ---------- state ---------- */
let items = [];   // {id, desc, code, weight(g), pcs, dims, cbm, boxes, price, q40}
let currentNo = null;

function meta() {
  return {
    no: $('#mNo').value, date: $('#mDate').value, cur: $('#mCur').value, title: $('#mTitle').value,
    cInfo: $('#cInfo').value,
    freight: num($('#mFreight').value), vat: num($('#mVat').value), gross: num($('#mGross').value),
    discPct: num($('#discPct').value), usdRate: num($('#usdRate').value),
    cNotes: $('#cNotes').value, tots: Object.assign({}, totVis),
  };
}
function saveDraft() { localStorage.setItem(DRAFT_KEY, JSON.stringify({ meta: meta(), items, currentNo })); }
function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (!d) return false;
    items = d.items || [];
    currentNo = d.currentNo || null;
    const m = d.meta || {};
    $('#mNo').value = m.no || ''; $('#mDate').value = m.date || '';
    $('#mCur').value = m.cur || '$'; $('#mTitle').value = m.title || 'SALES INVOICE';
    $('#cInfo').value = m.cInfo || '';
    $('#mFreight').value = m.freight ?? 0; $('#mVat').value = m.vat ?? 0;
    $('#mGross').value = m.gross ?? (m.netW ?? 0);
    $('#discPct').value = m.discPct ?? 0; $('#usdRate').value = m.usdRate ?? 50;
    $('#cNotes').value = m.cNotes || '';
    if (m.tots) setTotVis(m.tots, true);
    return true;
  } catch (e) { return false; }
}
function newInvoiceNo() {
  const prefix = localStorage.getItem('krno_inv_prefix') || 'INV';
  const d = new Date();
  const seq = (parseInt(localStorage.getItem('krno_inv_seq') || '0', 10) + 1);
  localStorage.setItem('krno_inv_seq', String(seq));
  return `${prefix}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(seq).padStart(3, '0')}`;
}

/* ---------- catalog helpers ---------- */
const sv = (p, names) => { const r = p.specs.find((s) => names.includes(s[0])); return r ? r[1] : ''; };
function specWeight(p) {
  const w = sv(p, ['Weight', 'Avg. Weight', 'Weight of Bag']);
  return String(w || '').replace(/\s+/g, ' ').trim();
}
function packOf(p) {
  return {
    pcs: parseInt((sv(p, ['Quantity in Box', 'Pcs / Carton']) || '').replace(/[^\d]/g, ''), 10) || 0,
    cbm: num(sv(p, ['CBM Volume'])),
    dims: (sv(p, ['Box Size', 'Plastic Bag Size']) || '').replace('(L*W*H ) ', '').replace(/\*/g, '×').replace(/\s+/g, ' ').trim(),
  };
}
const q40Of = (cbm) => { const c = num(cbm); return c > 0 ? Math.round(FT_CONTAINER_CBM / c) : 0; };
function discPriceOf(price) {
  const cur = $('#mCur').value;
  const rate = num($('#usdRate').value);
  const d = num($('#discPct').value);
  if (cur !== 'ج.م' || !(rate > 0)) return null;
  return (num(price) * (1 - d / 100)) / rate;
}
const autoKg = () => Math.round(items.reduce((s, i) => s + num(i.boxes) * num(i.pcs) * num(i.weight), 0) / 1000);

function totals() {
  const boxes = items.reduce((s, i) => s + num(i.boxes), 0);
  const pcs = items.reduce((s, i) => s + num(i.boxes) * num(i.pcs), 0);
  const sub = items.reduce((s, i) => s + num(i.boxes) * num(i.price), 0);
  const freight = num($('#mFreight').value);
  const vatPct = num($('#mVat').value);
  const vat = sub * vatPct / 100;
  const net = sub + freight + vat;
  return { boxes, pcs, netKg: autoKg(), sub, freight, vat, vatPct, net, cur: $('#mCur').value };
}

/* ---------- price lists (upload .xlsx — auto prices, visual layer only) ---------- */
const PLISTS_KEY = 'krno_inv_pricelists';
const PACTIVE_KEY = 'krno_inv_plist';
function loadPLists() {
  try { const l = JSON.parse(localStorage.getItem(PLISTS_KEY) || '{}');
    return (l && typeof l === 'object' && !Array.isArray(l)) ? l : {}; }
  catch (e) { return {}; }
}
function savePLists(o) { localStorage.setItem(PLISTS_KEY, JSON.stringify(o)); }
let PLISTS = loadPLists();
let PLIST = localStorage.getItem(PACTIVE_KEY) || '';
if (!PLISTS[PLIST]) PLIST = Object.keys(PLISTS)[0] || '';
const CODE_SET = new Set(PRODUCTS.map((x) => normCode(x.code)));
function priceForItem(code) {
  const l = PLISTS[PLIST]; if (!l || !code) return 0;
  const p = l.prices[normCode(code)];
  return (typeof p === 'number' && p > 0) ? p : 0;
}
const cellText = (v) => {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((t) => t.text || '').join('');
    if (v.result != null) return String(v.result);
    if (v.text != null) return String(v.text);
    return '';
  }
  return String(v);
};
function extractPrices(ws) {
  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row, rn) => {
    if (rn > 3000) return;
    const cells = [];
    row.eachCell({ includeEmpty: true }, (c, cn) => { cells[cn] = c.value; });
    rows.push({ rn, cells });
  });
  const map = {};
  const put = (code, price) => {
    const k = normCode(cellText(code));
    let p = price;
    if (p && typeof p === 'object' && typeof p.result === 'number') p = p.result;
    if (typeof p !== 'number') p = parseFloat(String(p == null ? '' : p).replace(/[^0-9.\-]/g, ''));
    if (k && isFinite(p) && p > 0 && p < 1e7 && k.length > 1) map[k] = p;
  };
  let hRn = -1, codeCol = 0, priceCol = 0;
  for (const r of rows.slice(0, 30)) {
    let c1 = 0, c2 = 0;
    for (let i = 1; i < r.cells.length; i++) {
      const t = cellText(r.cells[i]).replace(/\s+/g, ' ').toLowerCase().trim();
      if (!t) continue;
      if (!c1 && /(item code|product code|part no|\bcode\b|كود)/.test(t)) c1 = i;
      if (!c2 && /(price per carton|price\/carton|carton price|usd per carton|usd\/carton|price|سعر)/.test(t) && !/value|total|إجمالي|40ft/.test(t)) c2 = i;
    }
    if (c1 && c2) { hRn = r.rn; codeCol = c1; priceCol = c2; break; }
  }
  if (hRn > 0) {
    for (const r of rows) {
      if (r.rn <= hRn) continue;
      if (/^\s*total/i.test(cellText(r.cells[1]))) break;
      put(r.cells[codeCol], r.cells[priceCol]);
    }
  } else {
    for (const r of rows) {
      let cIdx = 0;
      for (let i = 1; i < r.cells.length; i++) if (CODE_SET.has(normCode(cellText(r.cells[i])))) { cIdx = i; break; }
      if (!cIdx) continue;
      for (let i = 1; i < r.cells.length; i++) {
        if (i === cIdx) continue;
        const n = parseFloat(cellText(r.cells[i]));
        if (isFinite(n) && n > 0) { put(r.cells[cIdx], n); break; }
      }
    }
  }
  return map;
}
async function importPListBytes(buf, name) {
  if (!window.ExcelJS) { toastMsg(T('plErr')); return 0; }
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets && wb.worksheets[0];
    const prices = ws ? extractPrices(ws) : {};
    const cnt = Object.keys(prices).length;
    if (!cnt) { toastMsg(T('plNone')); return 0; }
    PLISTS[name] = { at: new Date().toISOString(), prices };
    savePLists(PLISTS);
    if (!PLIST || !PLISTS[PLIST]) setPActive(name);
    else { renderPListPanel(); refreshPlChip(); }
    toastMsg(T('plLoaded').replace('{n}', cnt));
    return cnt;
  } catch (e) { toastMsg(T('plErr')); return 0; }
}
function importPListFile(file) {
  const done = (buf) => {
    const name = (file.name || '').replace(/\.[^.]+$/, '') || ('LIST-' + Date.now());
    return importPListBytes(buf, name);
  };
  if (file.arrayBuffer) file.arrayBuffer().then(done);
  else { const rd = new FileReader(); rd.onload = () => done(rd.result); rd.readAsArrayBuffer(file); }
}
function setPActive(name) {
  PLIST = name || '';
  localStorage.setItem(PACTIVE_KEY, PLIST);
  renderPListPanel(); refreshPlChip(); saveDraft();
}
function applyPListToInvoice() {
  if (!PLIST || !PLISTS[PLIST]) { toastMsg(T('plNoActive')); return; }
  let n = 0;
  items.forEach((it) => { const p = priceForItem(it.code); if (p > 0) { it.price = p; n++; } });
  renderItems(); saveDraft();
  toastMsg(n ? T('plApplied').replace('{n}', n) : T('plNoMatch'));
}
function renderPListPanel() {
  const el = $('#plList'); if (!el) return;
  const names = Object.keys(PLISTS);
  el.innerHTML = names.length ? names.map((nm) => {
    const l = PLISTS[nm]; const n = Object.keys(l.prices || {}).length;
    return `<div class="pl-row ${nm === PLIST ? 'on' : ''}">
      <input type="radio" name="pluse" data-nm="${esc(nm)}" ${nm === PLIST ? 'checked' : ''}>
      <b dir="auto">${esc(nm)}</b>
      <span class="pl-n">${n} ${esc(T('plPrices'))}</span>
      <span class="pl-d">${esc(l.at ? String(l.at).slice(0, 10) : '')}</span>
      <button class="btn danger" data-del="${esc(nm)}">${esc(T('delH'))}</button>
    </div>`;
  }).join('') : `<p class="empty-it">${esc(T('plEmpty'))}</p>`;
}
function refreshPlChip() {
  const chip = $('#plChip'), btn = $('#btnPlApply');
  if (PLIST && PLISTS[PLIST]) {
    chip.hidden = false; chip.textContent = T('plChip') + ' ' + PLIST; btn.hidden = false;
  } else { chip.hidden = true; btn.hidden = true; }
}

/* ---------- gate ---------- */
function initGate() {
  if (sessionStorage.getItem('krno_staff') === '1') { $('#gate').hidden = true; $('#app').hidden = false; return; }
  $('#gateForm').onsubmit = (e) => {
    e.preventDefault();
    if ($('#pass').value.trim() === STAFF_PASS) {
      sessionStorage.setItem('krno_staff', '1');
      $('#gate').hidden = true; $('#app').hidden = false;
    } else {
      $('#gateErr').hidden = false;
      const c = $('.gate-card'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake');
      $('#pass').value = '';
    }
  };
}

/* ---------- i18n apply ---------- */
function applyLang() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = T(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = T(el.getAttribute('data-i18n-ph')); });
  $('#langAr').classList.toggle('on', LANG === 'ar');
  $('#langEn').classList.toggle('on', LANG === 'en');
  renderItems();
  renderColList();
  renderTotsList();
  renderHistory();
  applyTotVis();
  renderPListPanel();
  refreshPlChip();
}

/* ---------- picker ---------- */
function initPicker() {
  const q = $('#pickQ'), list = $('#pickList');
  let cur = [];
  const hide = () => { list.hidden = true; };
  const renderList = (res) => {
    cur = res;
    if (!res.length) { hide(); return; }
    list.innerHTML = res.map((r, i) => `<div class="pick-item" data-i="${i}">
      <img src="${esc(r.p.img ? r.p.img.replace('.jpg', '-t.jpg') : '')}" alt="">
      <div class="pi-t"><b>${esc(r.p.code)} — ${esc(r.p.title)}</b>
        <span>${esc(r.p.group)}${specWeight(r.p) ? ' · ' + esc(specWeight(r.p)) : ''}</span></div>
      <button class="pi-add" data-i="${i}">+ ${esc(T('add'))}</button></div>`).join('');
    list.hidden = false;
  };
  q.oninput = () => { renderList(KS.search(q.value, 12)); };
  list.onclick = (e) => {
    const el = e.target.closest('.pick-item'); if (!el) return;
    addItemFromCatalog(cur[+el.dataset.i].p);
    hide(); q.value = ''; q.focus();
  };
  document.addEventListener('click', (e) => { if (!e.target.closest('.picker')) hide(); });
  q.onkeydown = (e) => { if (e.key === 'Escape') { hide(); q.value = ''; } };
  $('#btnFree').onclick = () => {
    items.push({ id: 'free-' + Date.now(), desc: '', code: '', weight: '', pcs: 0, dims: '', cbm: 0, boxes: 1, price: 0, q40: 0 });
    renderItems(); saveDraft();
  };
}
function addItemFromCatalog(p) {
  const pk = packOf(p);
  items.push({
    id: p.id, desc: p.title, code: p.code,
    weight: specWeight(p), pcs: pk.pcs, dims: pk.dims,
    cbm: pk.cbm, boxes: 1, price: priceForItem(p.code), q40: q40Of(pk.cbm),
  });
  renderItems(); saveDraft();
}

/* ---------- items table ---------- */
function renderItems() {
  $('#itEmpty').hidden = items.length > 0;
  $('#itBody').innerHTML = items.map((it, i) => {
    const dp = discPriceOf(it.price);
    return `<tr data-i="${i}">
      <td class="col col-ser">${i + 1}</td>
      <td class="col col-desc"><input class="ci t" data-f="desc" value="${esc(it.desc)}" placeholder="${esc(T('thDesc'))}"></td>
      <td class="col col-code"><input class="ci t" data-f="code" value="${esc(it.code)}"></td>
      <td class="col col-weight"><input class="ci t" data-f="weight" value="${esc(it.weight)}"></td>
      <td class="col col-pcs"><input class="ci n" data-f="pcs" type="number" min="0" value="${it.pcs || 0}"></td>
      <td class="col col-dims"><input class="ci t" data-f="dims" value="${esc(it.dims)}"></td>
      <td class="col col-cbm"><input class="ci n" data-f="cbm" type="number" min="0" step="0.0001" value="${it.cbm || 0}"></td>
      <td class="col col-boxes"><input class="ci n" data-f="boxes" type="number" min="0" step="1" value="${it.boxes || 0}"></td>
      <td class="col col-price"><input class="ci n" data-f="price" type="number" min="0" step="0.01" value="${it.price || 0}"></td>
      <td class="col col-total row-total">${money(num(it.boxes) * num(it.price))}</td>
      <td class="col col-q40"><input class="ci n" data-f="q40" type="number" min="0" value="${it.q40 || 0}"></td>
      <td class="col col-disc row-disc">${dp === null ? '—' : money(dp)}</td>
      <td class="col col-del"><button class="btn danger" data-del="${i}">${esc(T('del'))}</button></td>
    </tr>`;
  }).join('');
  applyColVis();
  totalsView();
}
function totalsView() {
  const t = totals();
  $('#itCount').textContent = items.length;
  $('#tBoxes').textContent = t.boxes.toLocaleString('en-US');
  $('#tPcs').textContent = t.pcs.toLocaleString('en-US');
  $('#tNetW').textContent = t.netKg.toLocaleString('en-US');
  $('#tSub').textContent = money(t.sub) + ' ' + t.cur;
  $('#tNet').textContent = money(t.net) + ' ' + t.cur;
}

/* ---------- history ---------- */
function loadHist() { try { const h = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); return Array.isArray(h) ? h : []; } catch (e) { return []; } }
function saveHist(h) { localStorage.setItem(HIST_KEY, JSON.stringify(h)); }
function saveInvoice() {
  const m = meta(), t = totals();
  const entry = {
    no: m.no, title: m.title, date: m.date, cur: m.cur, net: t.net, count: items.length,
    savedAt: new Date().toISOString(), cInfo: m.cInfo, meta: m, items: JSON.parse(JSON.stringify(items)),
  };
  const h = loadHist();
  const i = h.findIndex((x) => x.no === entry.no);
  if (i >= 0) h[i] = entry; else h.push(entry);
  saveHist(h);
  currentNo = entry.no;
  saveDraft();
  renderHistory();
  toastMsg(T('saved'));
}
function openInvoice(entry) {
  const m = entry.meta || {};
  items = JSON.parse(JSON.stringify(entry.items || []));
  $('#mNo').value = m.no || entry.no || '';
  $('#mDate').value = m.date || entry.date || '';
  $('#mCur').value = m.cur || '$';
  $('#mTitle').value = m.title || entry.title || 'SALES INVOICE';
  $('#cInfo').value = m.cInfo ?? entry.cInfo ?? '';
  $('#mFreight').value = m.freight ?? 0; $('#mVat').value = m.vat ?? 0;
  $('#mGross').value = m.gross ?? 0;
  $('#discPct').value = m.discPct ?? 0; $('#usdRate').value = m.usdRate ?? 50;
  $('#cNotes').value = m.cNotes || '';
  currentNo = entry.no;
  if (m.tots) setTotVis(m.tots, true);
  renderItems(); saveDraft();
}
function duplicateInvoice(entry) {
  const h = loadHist();
  const copy = JSON.parse(JSON.stringify(entry));
  copy.no = newInvoiceNo();
  copy.date = new Date().toISOString().slice(0, 10);
  copy.savedAt = new Date().toISOString();
  copy.meta = Object.assign({}, copy.meta, { no: copy.no, date: copy.date });
  h.push(copy);
  saveHist(h);
  renderHistory();
  openInvoice(copy);
  toastMsg(T('duped'));
}
function renderHistory() {
  const h = loadHist();
  $('#histEmpty').hidden = h.length > 0;
  $('#histBody').innerHTML = h.map((e, i) => `<tr data-i="${i}">
    <td class="en">${esc(e.no)}</td><td>${esc(e.title || '—')}</td><td class="en">${esc(e.date || '—')}</td>
    <td>${esc((e.cInfo || '').split('\n')[0] || '—')}</td><td class="en">${esc(e.cur || '—')}</td>
    <td class="en">${money(e.net)} ${esc(e.cur || '')}</td><td>${e.count || 0}</td>
    <td class="en">${esc(e.savedAt ? new Date(e.savedAt).toLocaleString() : '—')}</td>
    <td class="h-actions">
      <button data-a="open" title="${esc(T('open'))}">${esc(T('open'))}</button>
      <button data-a="dup" title="${esc(T('dup'))}">${esc(T('dup'))}</button>
      <button data-a="pdf" title="${esc(T('pdf'))}">${esc(T('pdf'))}</button>
      <button data-a="xls" title="${esc(T('xls'))}">${esc(T('xls'))}</button>
      <button class="danger" data-a="del" title="${esc(T('delH'))}">${esc(T('delH'))}</button>
    </td></tr>`).join('');
}

/* ---------- backup ---------- */
function backupData() {
  return {
    app: 'krno-invoice', version: 3, exportedAt: new Date().toISOString(),
    data: {
      history: loadHist(),
      company: JSON.parse(localStorage.getItem(COMPANY_KEY) || '{}'),
      bank: JSON.parse(localStorage.getItem(BANK_KEY) || '{}'),
      prefix: localStorage.getItem('krno_inv_prefix') || 'INV',
      seq: localStorage.getItem('krno_inv_seq') || '0',
      lang: LANG,
      cols: colVis,
      tots: totVis,
      plists: PLISTS, plist: PLIST,
    },
  };
}
function exportBackup() {
  const bytes = new TextEncoder().encode(JSON.stringify(backupData(), null, 2));
  downloadBytes(bytes, `KRNO-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  toastMsg(T('bkExported'));
}
function applyBackup(obj) {
  if (!obj || obj.app !== 'krno-invoice' || !obj.data || !Array.isArray(obj.data.history)) return false;
  const d = obj.data;
  saveHist(d.history);
  if (d.company) localStorage.setItem(COMPANY_KEY, JSON.stringify(d.company)); else localStorage.removeItem(COMPANY_KEY);
  if (d.bank) localStorage.setItem(BANK_KEY, JSON.stringify(d.bank)); else localStorage.removeItem(BANK_KEY);
  localStorage.setItem('krno_inv_prefix', d.prefix || 'INV');
  localStorage.setItem('krno_inv_seq', d.seq || '0');
  colVis = Object.assign({}, colVis, d.cols || {});
  localStorage.setItem(COLS_KEY, JSON.stringify(colVis));
  if (d.tots) setTotVis(d.tots, true);
  PLISTS = (d.plists && typeof d.plists === 'object') ? d.plists : {};
  savePLists(PLISTS);
  PLIST = (d.plist && PLISTS[d.plist]) ? d.plist : (Object.keys(PLISTS)[0] || '');
  localStorage.setItem(PACTIVE_KEY, PLIST);
  LANG = (d.lang === 'ar' || d.lang === 'en') ? d.lang : 'en';
  localStorage.setItem(LANG_KEY, LANG);
  applyLang(); initBankForm(); renderFromBox(); applyColVis();
  return true;
}
function importBackup(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const obj = JSON.parse(String(rd.result));
      if (!confirm(T('confirmImport'))) return;
      if (!applyBackup(obj)) throw new Error('shape');
      toastMsg(T('bkImported'));
    } catch (e) { toastMsg(T('bkInvalid')); }
  };
  rd.readAsText(file);
}
function downloadBytes(bytes, filename, mime) {
  try {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) { /* environment without createObjectURL (tests) */ }
}

/* ---------- print sheet (A4 portrait) ---------- */
function buildSheet() {
  const m = meta(), t = totals(), c = company(), b = bank();
  const vis = visCols();
  $('#shTitle').textContent = m.title || 'SALES INVOICE';
  $('#shNo').textContent = T('pNo') + ' ' + (m.no || '—');
  $('#shDate').textContent = T('pDate') + ' ' + (m.date || new Date().toLocaleDateString());
  $('#shCur').textContent = T('currency') + ': ' + (m.cur === '$' ? 'USD ($)' : m.cur);
  $('#shBuyerL').textContent = T('pCustomer');
  $('#shCustomer').textContent = m.cInfo || '—';
  $('#shFrom').innerHTML = `<b>${esc(c.name || '')}</b><br>${esc([c.addr1, c.addr2, c.addr3].filter(Boolean).join(', '))}<br>${esc(T('sTel'))}: ${esc(c.tel || '')}`;
  $('#shHead').innerHTML = '<tr><th class="col col-ser">№</th>' +
    vis.map((cl) => `<th class="col col-${cl.id}">${esc(T('th' + cl.id[0].toUpperCase() + cl.id.slice(1)))}</th>`).join('') + '</tr>';
  $('#shBody').innerHTML = items.map((it, i) => {
    const dp = discPriceOf(it.price);
    const cells = {
      desc: `<td class="col col-desc l">${esc(it.desc)}</td>`,
      code: `<td class="col col-code">${esc(it.code)}</td>`,
      weight: `<td class="col col-weight">${esc(it.weight)}</td>`,
      pcs: `<td class="col col-pcs">${it.pcs || '—'}</td>`,
      dims: `<td class="col col-dims">${esc(it.dims)}</td>`,
      cbm: `<td class="col col-cbm">${it.cbm ? num(it.cbm).toLocaleString('en-US', { maximumFractionDigits: 4 }) : '—'}</td>`,
      boxes: `<td class="col col-boxes">${it.boxes}</td>`,
      price: `<td class="col col-price">${money(it.price)}</td>`,
      total: `<td class="col col-total">${money(num(it.boxes) * num(it.price))}</td>`,
      q40: `<td class="col col-q40">${it.q40 || '—'}</td>`,
      disc: `<td class="col col-disc">${dp === null ? '—' : money(dp) + ' USD'}</td>`,
    };
    return `<tr><td class="col col-ser">${i + 1}</td>` + vis.map((cl) => cells[cl.id]).join('') + '</tr>';
  }).join('');
  const foot = vis.map((cl) => cl.id === 'boxes' ? `<td class="col col-boxes"><b>${t.boxes}</b></td>`
    : cl.id === 'total' ? `<td class="col col-total"><b>${money(t.sub)}</b></td>`
    : `<td class="col col-${cl.id}"></td>`).join('');
  $('#shFoot').innerHTML = `<tr><td class="col col-ser l">${esc(T('pTotal'))}</td>${foot}</tr>`;
  $('#shNotesL').textContent = T('pNotes');
  $('#shNotes').textContent = m.cNotes || '—';
  $('#shTotals').innerHTML = `
    <div class="r" data-tot="boxes"><span>${esc(T('tBoxes'))}</span><b>${t.boxes}</b></div>
    <div class="r" data-tot="pcs"><span>${esc(T('tPcs'))}</span><b>${t.pcs.toLocaleString('en-US')}</b></div>
    <div class="r" data-tot="sub"><span>${esc(T('tSub'))}</span><b>${money(t.sub)} ${esc(m.cur)}</b></div>
    <div class="r" data-tot="freight"><span>${esc(T('tFreight'))}</span><b>${money(t.freight)} ${esc(m.cur)}</b></div>
    <div class="r" data-tot="vat"><span>${esc(T('tVat'))} ${t.vatPct}%</span><b>${money(t.vat)} ${esc(m.cur)}</b></div>
    <div class="r net" data-tot="net"><span>${esc(T('tNet'))}</span><b>${money(t.net)} ${esc(m.cur)}</b></div>`;
  $('#shNetWL').innerHTML = `${esc(T('pNetW'))}: <b id="shNetWv">${t.netKg.toLocaleString('en-US')}</b> ${esc(T('kg'))}`;
  $('#shGrossL').innerHTML = `${esc(T('pGrossW'))}: <b>${m.gross.toLocaleString('en-US', { maximumFractionDigits: 1 })}</b> ${esc(T('kg'))}`;
  $('#shDetailsL').textContent = T('pDetails');
  $('#shTerms').innerHTML = esc(b.terms || '').replace(/\n/g, '<br>');
  $('#shBank').innerHTML = (b.bank ? esc(T('pBank')) + ' ' + esc(b.bank) + '<br>' : '') +
    `Acc No: ${esc(b.acc || '')} &nbsp;·&nbsp; Swift: ${esc(b.swift || '')}<br>IBAN: ${esc(b.iban || '')}`;
  $('#shCert').textContent = b.cert || '';
  $('#shStampL').textContent = T('pStamp');
  applyTotVis();
}

/* ---------- copy summary ---------- */
function copySummary() {
  const m = meta(), t = totals();
  const lines = [`${m.title || 'INVOICE'} ${m.no}`, `${T('date')}: ${m.date || '—'}`,
    (m.cInfo || '').split('\n')[0] || '—', '—'];
  items.forEach((it, i) => lines.push(`${i + 1}) ${it.code} ${it.desc} — ${it.boxes} × ${money(it.price)} = ${money(num(it.boxes) * num(it.price))} ${m.cur}`));
  lines.push('—',
    `${T('tBoxes')}: ${t.boxes} · ${T('tPcs')}: ${t.pcs} · ${T('pNetW')}: ${t.netKg} ${T('kg')}`,
    `${T('tNet')}: ${money(t.net)} ${m.cur}`);
  const txt = lines.join('\n');
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).catch(() => {
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove();
  });
  toastMsg(T('copied'));
}
let tt;
function toastMsg(msg) {
  let el = $('#invToast');
  if (!el) {
    el = document.createElement('div'); el.id = 'invToast';
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translate(-50%,70px);background:#141a3d;color:#fff;padding:12px 22px;border-radius:14px;font-weight:700;font-size:14px;z-index:300;transition:.3s;box-shadow:0 20px 50px rgba(0,0,0,.3)';
    document.body.appendChild(el);
  }
  el.textContent = msg; el.style.transform = 'translate(-50%,0)';
  clearTimeout(tt); tt = setTimeout(() => { el.style.transform = 'translate(-50%,70px)'; }, 2200);
}

/* ---------- Excel export (ExcelJS — real formulas) ---------- */
function buildExcel(data) {
  const wb = new ExcelJS.Workbook();
  wb.creator = company().name || 'KRNO';
  wb.created = new Date();
  const ws = wb.addWorksheet('Invoice', { pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true } });
  const m = data.meta, t = data.totals, c = company(), b = data.bank, vis = data.vis;
  const L = {}; vis.forEach((cl, i) => { L[cl.id] = String.fromCharCode(66 + i); }); // B..
  const nCols = vis.length + 1;
  const thin = { style: 'thin', color: { argb: 'FFB9C2D0' } };
  const borders = { top: thin, bottom: thin, left: thin, right: thin };
  const navy = 'FF141A3D';
  let r = 1;
  ws.mergeCells(r, 1, r, nCols);
  const tc = ws.getCell(r, 1);
  tc.value = m.title || 'SALES INVOICE';
  tc.font = { bold: true, size: 15, color: { argb: navy } };
  tc.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(r).height = 24;
  r += 1;
  ws.getCell(r, 1).value = `${T('pNo')} ${m.no || ''}`;
  ws.getCell(r, 2).value = `${T('pDate')} ${m.date || ''}`;
  ws.getCell(r, Math.min(3, nCols)).value = `${T('currency')}: ${m.cur === '$' ? 'USD ($)' : m.cur}`;
  ws.getRow(r).font = { size: 10, bold: true };
  // fixed conversion cells (referenced by row formulas)
  ws.getCell(2, 4).value = T('discPct'); ws.getCell(2, 4).font = { size: 8, color: { argb: 'FF8A93AC' } };
  const pctCell = ws.getCell(2, 5); pctCell.value = num(m.discPct); pctCell.numFmt = '0.##';
  ws.getCell(3, 4).value = T('usdRate'); ws.getCell(3, 4).font = { size: 8, color: { argb: 'FF8A93AC' } };
  const rateCell = ws.getCell(3, 5); rateCell.value = num(m.usdRate); rateCell.numFmt = '0.00';
  data.pctCell = '$E$2'; data.rateCell = '$E$3';
  r += 1;
  const block = (label, lines) => {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = { bold: true, size: 10, color: { argb: 'FF0E9AAB' } };
    r += 1;
    for (const ln of lines) { ws.getCell(r, 1).value = ln; ws.getCell(r, 1).font = { size: 10 }; r += 1; }
    r += 1;
  };
  block('SELLER', [c.name || '', [c.addr1, c.addr2, c.addr3].filter(Boolean).join(', '), `${T('sTel')}: ${c.tel || ''}`].filter(Boolean));
  block(T('pCustomer'), (m.cInfo || '—').split('\n'));
  // items header
  const headRow = ws.getRow(r);
  const headers = ['№', ...vis.map((cl) => T('th' + cl.id[0].toUpperCase() + cl.id.slice(1)))];
  headers.forEach((h, i) => {
    const cell = ws.getCell(r, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = borders;
  });
  headRow.height = 22;
  r += 1;
  const r1 = r;
  const items = data.items;
  items.forEach((it, i) => {
    const row = ws.getRow(r);
    ws.getCell(r, 1).value = i + 1;
    ws.getCell(r, 1).alignment = { horizontal: 'center' };
    const set = (id, val, fmt) => {
      if (!L[id]) return;
      const cell = ws.getCell(r, L[id].charCodeAt(0) - 64);
      cell.value = val;
      cell.border = borders;
      cell.font = { size: 9.5 };
      if (fmt) cell.numFmt = fmt;
    };
    set('desc', it.desc || '', null);
    set('code', it.code || '', null);
    set('weight', num(it.weight), '0.00');
    set('pcs', num(it.pcs), '0');
    set('dims', it.dims || '', null);
    set('cbm', num(it.cbm), '0.0000');
    set('boxes', num(it.boxes), '0');
    set('price', num(it.price), '0.00');
    const rowVal = num(it.boxes) * num(it.price);
    const canTotal = L.boxes && L.price;
    set('total', canTotal ? { formula: `${L.boxes}${r}*${L.price}${r}`, result: rowVal } : rowVal, '0.00');
    set('q40', L.cbm ? { formula: `IF(${L.cbm}${r}>0,ROUND(${FT_CONTAINER_CBM}/${L.cbm}${r},0),0)`, result: q40Of(it.cbm) } : q40Of(it.cbm), '0');
    const dp = discPriceForExcel(it.price, m);
    const canDisc = dp !== null && L.price;
    set('disc', dp === null ? '—' : (canDisc ? { formula: `${L.price}${r}*(1-${data.pctCell})/${data.rateCell}`, result: dp } : dp), '0.00');
    r += 1;
  });
  const r2 = r - 1;
  // TOTAL row
  ws.getCell(r, 1).value = T('pTotal');
  ws.getCell(r, 1).font = { bold: true, size: 10 };
  const totalSet = (id, val, fmt) => {
    if (!L[id]) return;
    const cell = ws.getCell(r, L[id].charCodeAt(0) - 64);
    cell.value = val; cell.border = borders; cell.font = { bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F7FA' } };
    if (fmt) cell.numFmt = fmt;
  };
  totalSet('boxes', { formula: `SUM(${L.boxes}${r1}:${L.boxes}${r2})`, result: t.boxes }, '0');
  totalSet('total', { formula: `SUM(${L.total}${r1}:${L.total}${r2})`, result: t.sub }, '0.00');
  ws.eachRow((row) => row.eachCell((cell, n) => { if (n <= nCols && cell.border === undefined) cell.border = borders; }));
  r += 1;
  // totals block
  const tv = (data && data.tots) || totVis;
  const totLine = (label, val, fmt, bold, visKey) => {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = { size: 10, bold: !!bold };
    const cell = ws.getCell(r, 2);
    cell.value = val; cell.border = borders; cell.font = { size: 10, bold: !!bold };
    if (fmt) cell.numFmt = fmt;
    if (visKey && tv[visKey] === false) ws.getRow(r).hidden = true; // visual only — values/formulas remain
    r += 1;
  };
  const g = (id) => L[id] ? `SUM(${L[id]}${r1}:${L[id]}${r2})` : null;
  totLine(T('tBoxes'), L.boxes ? { formula: g('boxes'), result: t.boxes } : t.boxes, '0', false, 'boxes');
  totLine(T('tPcs'), (L.boxes && L.pcs) ? { formula: `SUMPRODUCT(${L.boxes}${r1}:${L.boxes}${r2},${L.pcs}${r1}:${L.pcs}${r2})`, result: t.pcs } : t.pcs, '0', false, 'pcs');
  totLine(T('tNetW'), (L.boxes && L.pcs && L.weight) ? { formula: `ROUND(SUMPRODUCT(${L.boxes}${r1}:${L.boxes}${r2},${L.pcs}${r1}:${L.pcs}${r2},${L.weight}${r1}:${L.weight}${r2})/1000,0)`, result: t.netKg } : t.netKg, '0', false, 'netw');
  totLine(T('tGrossW'), num(m.gross), '0.##', false, 'grossw');
  const subRow = r;
  const subCell = `$B$${subRow}`;
  totLine(T('tSub'), L.total ? { formula: g('total'), result: t.sub } : t.sub, '0.00', true, 'sub');
  const freeRow = r;
  totLine(T('tFreight'), num(m.freight), '0.00', false, 'freight');
  const vatRow = r;
  totLine(T('tVat'), { formula: `${subCell}*${data.pctCell}/100`, result: t.vat }, '0.00', false, 'vat');
  const netRow = r;
  totLine(T('tNet'), { formula: `${subCell}+$B$${freeRow}+$B$${vatRow}`, result: t.net }, '0.00', true, 'net');
  ws.getRow(netRow).font = { bold: true, size: 11, color: { argb: navy } };
  r += 1;
  // details + bank + cert
  ws.getCell(r, 1).value = T('pDetails');
  ws.getCell(r, 1).font = { bold: true, size: 10, color: { argb: 'FF0E9AAB' } };
  r += 1;
  for (const ln of (b.terms || '').split('\n')) { ws.getCell(r, 1).value = ln; ws.getCell(r, 1).font = { size: 9.5 }; r += 1; }
  if (b.bank) { ws.getCell(r, 1).value = T('pBank') + ' ' + b.bank; ws.getCell(r, 1).font = { size: 9.5, bold: true }; r += 1; }
  ws.getCell(r, 1).value = `Acc No: ${b.acc || ''}   ·   Swift: ${b.swift || ''}`; ws.getCell(r, 1).font = { size: 9.5 }; r += 1;
  ws.getCell(r, 1).value = `IBAN: ${b.iban || ''}`; ws.getCell(r, 1).font = { size: 9.5 }; r += 1;
  if (b.cert) { r += 1; ws.getCell(r, 1).value = b.cert; ws.getCell(r, 1).font = { size: 9.5, italic: true }; }
  // notes
  if (m.cNotes) { r += 1; ws.getCell(r, 1).value = T('pNotes') + ': ' + m.cNotes; ws.getCell(r, 1).font = { size: 9.5 }; }
  // column widths
  const widths = { desc: 30, code: 14, weight: 10, pcs: 11, dims: 16, cbm: 10, boxes: 9, price: 11, total: 11, q40: 11, disc: 13 };
  ws.getColumn(1).width = 5;
  vis.forEach((cl, i) => { ws.getColumn(i + 2).width = widths[cl.id] || 12; });
  return wb;
}
function discPriceForExcel(price, m) {
  if (m.cur !== 'ج.م' || !(num(m.usdRate) > 0)) return null;
  return (num(price) * (1 - num(m.discPct) / 100)) / num(m.usdRate);
}
async function exportExcel(entry) {
  if (!window.ExcelJS) { toastMsg(T('xlsErr')); return; }
  const data = entry || { meta: meta(), items, totals: totals(), bank: bank(), vis: visCols(), tots: totVis };
  const wb = buildExcel(data);
  const buf = await wb.xlsx.writeBuffer();
  const bytes = (buf instanceof Uint8Array) ? buf : new Uint8Array(buf);
  window.__LAST_XLSX_BYTES__ = bytes;
  downloadBytes(bytes, `KRNO-${(data.meta.no || 'invoice').replace(/[^\w-]/g, '_')}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  toastMsg(T('exported'));
}

/* ---------- company settings ---------- */
function renderFromBox() {
  const c = company();
  $('#fromBox').innerHTML = `<b>${esc(c.name || '')}</b>${[c.addr1, c.addr2, c.addr3].filter(Boolean).map((l) => `<span>${esc(l)}</span>`).join('')}<span class="en">${esc(T('sTel'))}: ${esc(c.tel || '')}</span>`;
}
function initSettings() {
  const fill = () => {
    const c = company();
    $('#sName').value = c.name || ''; $('#sAddr1').value = c.addr1 || '';
    $('#sAddr2').value = c.addr2 || ''; $('#sAddr3').value = c.addr3 || '';
    $('#sTel').value = c.tel || '';
    $('#sPrefix').value = localStorage.getItem('krno_inv_prefix') || 'INV';
  };
  $('#btnSet').onclick = () => { fill(); $('#setPanel').hidden = !$('#setPanel').hidden; };
  $('#sClose').onclick = () => { $('#setPanel').hidden = true; };
  $('#sSave').onclick = () => {
    localStorage.setItem(COMPANY_KEY, JSON.stringify({
      name: $('#sName').value, addr1: $('#sAddr1').value, addr2: $('#sAddr2').value,
      addr3: $('#sAddr3').value, tel: $('#sTel').value,
    }));
    localStorage.setItem('krno_inv_prefix', $('#sPrefix').value || 'INV');
    renderFromBox(); $('#setPanel').hidden = true; toastMsg(T('saved'));
  };
  $('#sReset').onclick = () => {
    localStorage.removeItem(COMPANY_KEY); localStorage.removeItem('krno_inv_prefix');
    fill(); renderFromBox(); toastMsg(T('resetSet'));
  };
}

/* ---------- columns panel ---------- */
function initColumns() {
  $('#btnCols').onclick = () => { renderColList(); $('#colPanel').hidden = !$('#colPanel').hidden; };
  $('#colClose').onclick = () => { $('#colPanel').hidden = true; };
}
function renderColList() {
  $('#colList').innerHTML = COLS.map((c) => `<label class="col-chk"><input type="checkbox" data-c="${c.id}" ${colVis[c.id] ? 'checked' : ''}> ${esc(T('th' + c.id[0].toUpperCase() + c.id.slice(1)))}</label>`).join('');
}

/* ---------- bank form ---------- */
function initBankForm() {
  const b = bank();
  $('#bBank').value = b.bank; $('#bAcc').value = b.acc; $('#bSwift').value = b.swift;
  $('#bIban').value = b.iban; $('#bTerms').value = b.terms; $('#bCert').value = b.cert;
}

/* ---------- events ---------- */
function bind() {
  $('#itBody').oninput = (e) => {
    const inp = e.target.closest('input[data-f]'); if (!inp) return;
    const i = +inp.closest('tr').dataset.i, f = inp.dataset.f;
    const isNum = ['pcs', 'cbm', 'boxes', 'price', 'q40'].includes(f);
    items[i][f] = isNum ? num(inp.value) : inp.value;
    if (f === 'code' && !(items[i].price > 0)) {
      const mp = priceForItem(inp.value);
      if (mp > 0) {
        items[i].price = mp;
        const pinp = inp.closest('tr').querySelector('input[data-f="price"]');
        if (pinp) pinp.value = mp;
      }
    }
    if (f === 'cbm') {
      items[i].q40 = q40Of(inp.value);
      inp.closest('tr').querySelector('input[data-f="q40"]').value = items[i].q40;
    }
    const tr = inp.closest('tr');
    tr.querySelector('.row-total').textContent = money(num(items[i].boxes) * num(items[i].price));
    const dp = discPriceOf(items[i].price);
    tr.querySelector('.row-disc').textContent = dp === null ? '—' : money(dp);
    totalsView(); saveDraft();
  };
  $('#itBody').onclick = (e) => {
    const d = e.target.closest('[data-del]'); if (!d) return;
    items.splice(+d.dataset.del, 1); renderItems(); saveDraft();
  };
  ['mFreight', 'mVat', 'mGross'].forEach((id) => { document.getElementById(id).oninput = () => { totalsView(); saveDraft(); }; });
  $('#mCur').oninput = () => { renderItems(); saveDraft(); };
  ['discPct', 'usdRate'].forEach((id) => { document.getElementById(id).oninput = () => { renderItems(); saveDraft(); }; });
  ['mNo', 'mDate', 'mTitle', 'cInfo', 'cNotes'].forEach((id) => { document.getElementById(id).oninput = saveDraft; });
  $('#colList').onchange = (e) => {
    const cb = e.target.closest('input[data-c]'); if (!cb) return;
    colVis[cb.dataset.c] = cb.checked;
    localStorage.setItem(COLS_KEY, JSON.stringify(colVis));
    applyColVis();
  };
  $('#btnPl').onclick = () => { renderPListPanel(); $('#plPanel').hidden = !$('#plPanel').hidden; };
  $('#btnPlClose').onclick = () => { $('#plPanel').hidden = true; };
  $('#plFile').onchange = (e) => { const f = e.target.files && e.target.files[0]; if (f) importPListFile(f); e.target.value = ''; };
  $('#plList').onchange = (e) => { const r = e.target.closest('input[name="pluse"]'); if (r) setPActive(r.dataset.nm); };
  $('#plList').onclick = (e) => {
    const d = e.target.closest('[data-del]'); if (!d) return;
    if (!confirm(T('plDelQ'))) return;
    const nm = d.dataset.del; delete PLISTS[nm];
    if (PLIST === nm) PLIST = Object.keys(PLISTS)[0] || '';
    savePLists(PLISTS); localStorage.setItem(PACTIVE_KEY, PLIST);
    renderPListPanel(); refreshPlChip(); saveDraft();
  };
  $('#btnPlApply').onclick = applyPListToInvoice;
  $('#btnTots').onclick = () => { renderTotsList(); $('#totsPanel').hidden = !$('#totsPanel').hidden; };
  $('#totsClose').onclick = () => { $('#totsPanel').hidden = true; };
  $('#totsList').onchange = (e) => {
    const cb = e.target.closest('input[data-t]'); if (!cb) return;
    totVis[cb.dataset.t] = cb.checked;
    localStorage.setItem(TOTS_KEY, JSON.stringify(totVis));
    applyTotVis(); saveDraft();
  };
  $('#btnNew').onclick = () => {
    if (!confirm(T('confirmNew'))) return;
    items = []; currentNo = null;
    $('#cInfo').value = ''; $('#cNotes').value = '';
    ['mFreight', 'mVat', 'mGross', 'discPct'].forEach((id) => { document.getElementById(id).value = 0; });
    $('#usdRate').value = 50;
    $('#mNo').value = newInvoiceNo();
    $('#mDate').value = new Date().toISOString().slice(0, 10);
    renderItems(); saveDraft();
  };
  $('#btnSave').onclick = saveInvoice;
  $('#btnPrint').onclick = () => { buildSheet(); setTimeout(() => window.print(), 80); };
  $('#btnCopy').onclick = copySummary;
  $('#btnExcel').onclick = () => exportExcel(null);
  $('#btnHist').onclick = () => { renderHistory(); $('#histPanel').hidden = !$('#histPanel').hidden; };
  $('#histClose').onclick = () => { $('#histPanel').hidden = true; };
  $('#histBody').onclick = (e) => {
    const btn = e.target.closest('button[data-a]'); if (!btn) return;
    const entry = loadHist()[+btn.closest('tr').dataset.i];
    if (!entry) return;
    const a = btn.dataset.a;
    if (a === 'open') { openInvoice(entry); $('#histPanel').hidden = true; }
    else if (a === 'dup') duplicateInvoice(entry);
    else if (a === 'del') { if (confirm(T('confirmDel'))) { saveHist(loadHist().filter((x) => x.no !== entry.no)); renderHistory(); } }
    else if (a === 'pdf') { openInvoice(entry); $('#histPanel').hidden = true; buildSheet(); setTimeout(() => window.print(), 150); }
    else if (a === 'xls') exportExcel({ meta: entry.meta, items: entry.items, totals: totalsOf(entry), bank: bank(), vis: visCols(), tots: (entry.meta && entry.meta.tots) || totVis });
  };
  $('#langAr').onclick = () => { if (LANG !== 'ar') { LANG = 'ar'; localStorage.setItem(LANG_KEY, 'ar'); applyLang(); } };
  $('#langEn').onclick = () => { if (LANG !== 'en') { LANG = 'en'; localStorage.setItem(LANG_KEY, 'en'); applyLang(); } };
  // backup panel
  $('#btnBk').onclick = () => { $('#bkPanel').hidden = !$('#bkPanel').hidden; };
  $('#bkExport').onclick = exportBackup;
  $('#bkFile').onchange = (e) => { if (e.target.files && e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ''; };
  $('#bkClose').onclick = () => { $('#bkPanel').hidden = true; };
}
function totalsOf(entry) {
  const m = entry.meta || {};
  const items = entry.items || [];
  const boxes = items.reduce((s, i) => s + num(i.boxes), 0);
  const pcs = items.reduce((s, i) => s + num(i.boxes) * num(i.pcs), 0);
  const sub = items.reduce((s, i) => s + num(i.boxes) * num(i.price), 0);
  const freight = num(m.freight), vatPct = num(m.vat), vat = sub * vatPct / 100;
  const netKg = Math.round(items.reduce((s, i) => s + num(i.boxes) * num(i.pcs) * num(i.weight), 0) / 1000);
  return { boxes, pcs, netKg, sub, freight, vat, vatPct, net: sub + freight + vat, cur: m.cur };
}

/* ---------- init ---------- */
initGate();
applyLang();
renderFromBox();
if (!loadDraft()) {
  $('#mNo').value = newInvoiceNo();
  $('#mDate').value = new Date().toISOString().slice(0, 10);
  $('#mTitle').value = 'SALES INVOICE';
  $('#usdRate').value = 50;
}
renderItems();
initPicker();
initSettings();
initColumns();
initBankForm();
renderTotsList();
applyTotVis();
renderPListPanel();
refreshPlChip();
bind();
window.__KRNO_INV__ = {
  buildExcel, totals, totalsView, q40Of, discPriceOf, autoKg, exportExcel, saveInvoice, loadHist,
  backupData, applyBackup, search: (q, l) => KS.search(q, l),
  importPListBytes, applyPListToInvoice, priceForItem, setPActive,
  plistState: () => ({ PLISTS, PLIST }),
  state: () => ({ items, currentNo, colVis, totVis, LANG }),
};

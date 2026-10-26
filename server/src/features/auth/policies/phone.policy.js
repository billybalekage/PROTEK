

const DEFAULT_COUNTRY_CODE = '243'; // RDC

const normalizePhone = (raw) => {
  if (typeof raw !== 'string') return raw;
  let p = raw.trim().replace(/[\s().-]/g, '');

  if (p.startsWith('00')) p = `+${p.slice(2)}`;
  else if (p.startsWith('+')) return p;
  else if (/^0\d{9}$/.test(p)) p = `+${DEFAULT_COUNTRY_CODE}${p.slice(1)}`;
  else if (/^[89]\d{8}$/.test(p)) p = `+${DEFAULT_COUNTRY_CODE}${p}`;
  else if (new RegExp(`^${DEFAULT_COUNTRY_CODE}\\d{9}$`).test(p)) p = `+${p}`;

  return p;
};

// E.164 : "+" suivi de 8 à 15 chiffres, sans zéro initial.
const isValidE164 = (p) => /^\+[1-9]\d{7,14}$/.test(p);

module.exports = { normalizePhone, isValidE164 };
/**
 * Formats any date into DD/MM/YYYY string format.
 * Prevents UTC timezone conversion bugs and ensures consistent 2-digit padding.
 * 
 * @param {string|Date} dateVal 
 * @returns {string} e.g. "25/11/2026"
 */
export const formatDate = (dateVal) => {
  if (!dateVal) return '-';
  if (typeof dateVal === 'string') {
    const isoMatch = dateVal.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isToday = (dateVal) => {
  if (!dateVal) return false;
  const dStr = typeof dateVal === 'string' ? dateVal.split('T')[0] : '';
  return dStr === getTodayDate();
};

export default formatDate;

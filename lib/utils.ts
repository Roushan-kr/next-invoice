export function fmt(n: number | string): string {
  return (parseFloat(n as string) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(d: string | Date): string {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function words(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + words(n % 100) : '');
    if (n < 100000) return words(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + words(n % 1000) : '');
    if (n < 10000000) return words(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + words(n % 100000) : '');
    return words(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + words(n % 10000000) : '');
  }

  return words(Math.round(num)) + ' Only';
}

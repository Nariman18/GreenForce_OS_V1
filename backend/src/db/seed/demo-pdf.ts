const toPdfText = (value: string) =>
  value
    .replace(/[ø]/g, 'o')
    .replace(/[Ø]/g, 'O')
    .replace(/[æ]/g, 'ae')
    .replace(/[å]/g, 'aa')
    .replace(/₂/g, '2')
    .replace(/[—–]/g, '-')
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .normalize('NFD')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/([\\()])/g, '\\$1');

export function demoPdf(title: string, lines: string[]): Buffer {
  const body = [
    'BT /F1 18 Tf 56 780 Td',
    `(${toPdfText(title)}) Tj`,
    '/F1 10 Tf 0 -22 Td',
    '(GreenForce OS - DEMO DOCUMENT - sample content for demonstration only) Tj',
    '/F1 11 Tf',
    ...lines.flatMap((line) => ['0 -18 Td', `(${toPdfText(line)}) Tj`]),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(body, 'latin1')} >>\nstream\n${body}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

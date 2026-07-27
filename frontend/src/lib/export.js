export function exportToCSV(data, filename) {
  if (!data || !data.length) return;

  // Flatten nested objects/arrays to string, and handle commas/quotes
  const escapeCsvValue = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    if (Array.isArray(val)) {
      str = val.join('; ');
    } else if (typeof val === 'object') {
      str = JSON.stringify(val);
    }
    // Escape quotes
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  };

  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Header row
  csvRows.push(headers.map(escapeCsvValue).join(','));

  // Data rows
  for (const row of data) {
    csvRows.push(headers.map(header => escapeCsvValue(row[header])).join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

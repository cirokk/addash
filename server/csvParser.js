/**
 * Parser inteligente para CSVs do Meta Ads
 * Detecta automaticamente se o CSV contém:
 * - Cliques no link
 * - Conversas por mensagem iniciadas
 * - Ambos misturados
 */

const RESULT_TYPES = {
  LINK_CLICKS: 'Cliques no link',
  CONVERSATIONS: 'Conversas por mensagem iniciadas',
  REACH: 'Alcance',
  LEADS: 'Leads',
};

/**
 * Detecta tipo semântico pelo tipo de resultado ou nome da campanha
 * Só conta 'Conversas por mensagem iniciadas' como conversões
 * Cliques no link e Leads contam como cliques
 */
function detectSemanticType(resultType, campaignName) {
  const rt = (resultType || '').toLowerCase();
  const cn = (campaignName || '').toLowerCase();
  
  // Detecta pelo tipo de resultado
  // Só 'Conversas por mensagem iniciadas' conta como conversão
  if (rt.includes('conversa') && rt.includes('mensagem')) return 'conversations';
  if (rt.includes('clique') && rt.includes('link')) return 'clicks';
  if (rt.includes('lead')) return 'clicks'; // Leads também contam como cliques
  if (rt.includes('alcance') || rt.includes('reach')) return 'reach';
  
  // Se tipo vazio, detecta pelo nome da campanha
  if (!rt) {
    if (cn.includes('[conversas]') && cn.includes('[perene]')) return 'conversations';
    if (cn.includes('[leads]') || cn.includes('[cliques]')) return 'clicks';
    if (cn.includes('[alcance]')) return 'reach';
  }
  
  return null;
}

/**
 * Analisa o CSV e detecta os tipos de resultado presentes
 */
function analyzeResultTypes(rows) {
  const typesFound = new Set();
  
  for (const row of rows) {
    const resultType = row['Tipo de resultado'] || row.result_type;
    const campaignName = row['Nome da campanha'] || row._campaign || '';
    const semanticType = detectSemanticType(resultType, campaignName);
    
    if (semanticType) {
      typesFound.add(semanticType);
    }
  }
  
  return {
    hasClicks: typesFound.has('clicks'),
    hasConversations: typesFound.has('conversations'),
    hasReach: typesFound.has('reach'),
    hasLeads: typesFound.has('leads'),
    isMixed: typesFound.size > 1,
    types: Array.from(typesFound),
  };
}

/**
 * Parseia CSV do Meta Ads (formato brasileiro com BOM)
 */
function parseMetaCSV(csvText) {
  // Remove BOM se presente
  let text = csvText.replace(/^\uFEFF/, '');
  
  // Divide em linhas
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV vazio ou sem dados');
  }
  
  // Parseia header
  const headers = parseCSVLine(lines[0]);
  
  // Normaliza nomes de colunas
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
  
  // Mapeia índices das colunas importantes
  const colMap = {
    date: findColumnIndex(normalizedHeaders, ['dia', 'date', 'data']),
    campaign: findColumnIndex(normalizedHeaders, ['nome da campanha', 'campaign name', 'campanha']),
    clicks: findColumnIndex(normalizedHeaders, ['cliques no link', 'link clicks', 'cliques']),
    impressions: findColumnIndex(normalizedHeaders, ['impressões', 'impressions', 'imps']),
    spend: findColumnIndex(normalizedHeaders, ['valor usado (brl)', 'spend', 'gasto', 'valor usado']),
    resultType: findColumnIndex(normalizedHeaders, ['tipo de resultado', 'result type', 'resultado']),
    results: findColumnIndex(normalizedHeaders, ['resultados', 'results', 'resultado']),
  };
  
  // Parseia dados
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header.trim()] = values[idx] || '';
    });
    
    // Adiciona campos normalizados
    row._date = normalizeDate(getValue(values, colMap.date));
    row._campaign = getValue(values, colMap.campaign);
    row._clicks = parseNumber(getValue(values, colMap.clicks));
    row._impressions = parseNumber(getValue(values, colMap.impressions));
    row._spend = parseNumber(getValue(values, colMap.spend));
    row._resultType = getValue(values, colMap.resultType);
    row._results = parseNumber(getValue(values, colMap.results));
    rows.push(row);
  }
  
  return { headers, rows, colMap };
}

/**
 * Encontra índice de coluna por possíveis nomes
 */
function findColumnIndex(headers, possibleNames) {
  for (const name of possibleNames) {
    const idx = headers.findIndex(h => h.includes(name.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Obtém valor de linha pelo índice
 */
function getValue(values, idx) {
  if (idx === -1 || idx >= values.length) return '';
  return values[idx] || '';
}

/**
 * Normaliza data detectando formato automaticamente
 * MM/DD/YYYY (americano) ou DD/MM/YYYY (brasileiro)
 */
function normalizeDate(value) {
  if (!value) return '';
  const v = String(value).replace(/[^\d\/\-]/g, '').trim();
  
  // Já está no formato ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  
  // Formato com barras
  if (v.includes('/')) {
    const p = v.split('/');
    if (p.length === 3) {
      const first = parseInt(p[0], 10);
      const second = parseInt(p[1], 10);
      const year = p[2];
      
      // Se primeiro valor > 12, é DD/MM/YYYY (brasileiro)
      if (first > 12) {
        return `${year}-${second.toString().padStart(2, '0')}-${first.toString().padStart(2, '0')}`;
      }
      // Se segundo valor > 12, é MM/DD/YYYY (americano)
      if (second > 12) {
        return `${year}-${first.toString().padStart(2, '0')}-${second.toString().padStart(2, '0')}`;
      }
      // Ambíguo: assume MM/DD/YYYY (formato americano do Meta Ads)
      return `${year}-${first.toString().padStart(2, '0')}-${second.toString().padStart(2, '0')}`;
    }
  }
  
  return v;
}

/**
 * Parseia número (lida com formato brasileiro e vazio)
 */
function parseNumber(value) {
  if (!value || value.trim() === '') return 0;
  // Substitui vírgula por ponto
  const normalized = value.replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

/**
 * Parseia linha CSV respeitando aspas
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Processa CSV e retorna dados separados por tipo
 */
function processMetaCSV(csvText) {
  const { rows } = parseMetaCSV(csvText);
  const analysis = analyzeResultTypes(rows);

  // Separa dados por tipo
  const clickRows = [];
  const conversationRows = [];
  const reachRows = [];
  const leadRows = [];

  for (const row of rows) {
    const resultType = row._resultType || row['Tipo de resultado'] || '';
    const campaignName = row._campaign || row['Nome da campanha'] || '';
    const semanticType = detectSemanticType(resultType, campaignName);
    
    const data = {
      date: row._date || row.Dia,
      campaign: campaignName,
      clicks: row._clicks,
      impressions: row._impressions,
      spend: row._spend,
      results: row._results,
    };

    if (semanticType === 'clicks') {
      clickRows.push({ ...data, clicks: data.results || data.clicks });
    } else if (semanticType === 'conversations') {
      conversationRows.push({ ...data, conversions: data.results });
    } else if (semanticType === 'reach') {
      reachRows.push(data);
    } else if (semanticType === 'leads') {
      leadRows.push({ ...data, conversions: data.results });
    }
  }

  return {
    analysis,
    clickRows,
    conversationRows,
    reachRows,
    leadRows,
    totalRows: rows.length,
  };
}

/**
 * Formata dados para importação no TrafficDash
 * Converte dados mistos em formato unificado por data
 */
function formatForTrafficDash(processed) {
  // Agrupa por data e combina métricas
  const byDate = {};

  // Processa cliques
  for (const row of processed.clickRows) {
    const key = row.date;
    if (!byDate[key]) {
      byDate[key] = { date: row.date, clicks: 0, impressions: 0, spend: 0, conversions: 0 };
    }
    byDate[key].clicks += row.clicks || 0;
    byDate[key].impressions += row.impressions || 0;
    byDate[key].spend += row.spend || 0;
  }

  // Processa conversas (soma aos cliques existentes)
  for (const row of processed.conversationRows) {
    const key = row.date;
    if (!byDate[key]) {
      byDate[key] = { date: row.date, clicks: 0, impressions: 0, spend: 0, conversions: 0 };
    }
    byDate[key].clicks += row.clicks || 0;
    byDate[key].impressions += row.impressions || 0;
    byDate[key].spend += row.spend || 0;
    byDate[key].conversions += row.conversions || 0;
  }

  // Processa leads (similar a conversas)
  for (const row of processed.leadRows) {
    const key = row.date;
    if (!byDate[key]) {
      byDate[key] = { date: row.date, clicks: 0, impressions: 0, spend: 0, conversions: 0 };
    }
    byDate[key].clicks += row.clicks || 0;
    byDate[key].impressions += row.impressions || 0;
    byDate[key].spend += row.spend || 0;
    byDate[key].conversions += row.conversions || 0;
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = {
  parseMetaCSV,
  processMetaCSV,
  analyzeResultTypes,
  formatForTrafficDash,
  detectSemanticType,
  RESULT_TYPES,
};

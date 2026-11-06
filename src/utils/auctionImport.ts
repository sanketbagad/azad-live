import { normalizePlayerType, normalizeRole } from './auction';

/**
 * Reads auction players & teams from:
 *  - Excel (.xlsx): a "Players" sheet and optional "Teams" sheet (any sheet names work; a sheet whose
 *    name contains "team" is read as teams, everything else as players)
 *  - CSV (.csv): one players table
 *  - JSON backup from the KPL Auction Control HTML tool (players, photos, records, teams, rules)
 * Column headers are matched loosely, in English or Hindi.
 */

export interface ImportedTeam {
  name: string;
  shortName?: string;
  color?: string;
}

export interface ImportedPlayer {
  _row: number;
  name: string;
  number: string;
  city?: string;
  role?: string;
  base?: number;
  playerType: 'auction' | 'owner' | 'icon';
  team?: string;
  matches?: number;
  runs?: number;
  wickets?: number;
  photoUrl?: string;
  /** data: URL from a backup file, uploaded after import */
  photoData?: string;
  sourceId?: string;
  record?: { status: string; team?: string; price?: number; round?: number };
}

export interface ImportResult {
  source: 'excel' | 'csv' | 'backup';
  teams: ImportedTeam[];
  players: ImportedPlayer[];
  warnings: string[];
  extras?: { name?: string; rules?: Record<string, unknown>; reAuctionStarted?: boolean; topups?: Record<string, number> };
}

type Cell = string | number | boolean | Date | null | undefined;

const PLAYER_COLUMNS: Record<keyof Omit<ImportedPlayer, '_row' | 'playerType' | 'photoData' | 'sourceId' | 'record'> | 'type', string[]> = {
  name: ['name', 'player name', 'player', 'full name', 'खिलाड़ी का नाम', 'खिलाड़ी', 'नाम'],
  number: ['number', 'no', 'no.', 'player no', 'player no.', 'player number', '#', 'sr', 'sr no', 'sr. no.', 'jersey', 'नंबर', 'क्रमांक'],
  city: ['city', 'village', 'town', 'location', 'place', 'गाँव', 'गांव', 'शहर', 'गाँव / शहर'],
  role: ['role', 'category', 'skill', 'speciality', 'specialty', 'playing role', 'भूमिका'],
  base: ['base', 'base price', 'baseprice', 'base price ₹', 'price', 'बेस प्राइस'],
  type: ['type', 'player type', 'designation', 'status', 'प्रकार'],
  team: ['team', 'team name', 'assigned team', 'owner team', 'icon team', 'टीम'],
  matches: ['matches', 'match', 'मैच'],
  runs: ['runs', 'run', 'रन'],
  wickets: ['wickets', 'wicket', 'wkts', 'विकेट'],
  photoUrl: ['photo', 'photo url', 'image', 'image url', 'picture', 'फोटो'],
};

const TEAM_COLUMNS = {
  name: ['team', 'team name', 'name', 'टीम', 'टीम का नाम'],
  shortName: ['short', 'short name', 'code', 'abbr', 'abbreviation'],
  color: ['color', 'colour', 'रंग'],
  owner: ['owner', 'owner name', 'मालिक'],
  icon1: ['icon 1', 'icon1', 'icon player 1', 'icon'],
  icon2: ['icon 2', 'icon2', 'icon player 2'],
  icon3: ['icon 3', 'icon3', 'icon player 3'],
};

const clean = (v: Cell) => (v === null || v === undefined ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim());
const toNum = (v: Cell) => {
  const n = Number(clean(v).replace(/[₹,\s]/g, ''));
  return clean(v) !== '' && Number.isFinite(n) ? n : undefined;
};
const normHeader = (h: Cell) => clean(h).toLowerCase().replace(/[_*:]/g, ' ').replace(/\s+/g, ' ').trim();

function headerIndex(headers: string[], aliases: string[]): number {
  const exact = headers.findIndex((h) => aliases.includes(h));
  if (exact >= 0) return exact;
  return headers.findIndex((h) => aliases.some((a) => a.length > 2 && h.includes(a)));
}

/** First row that looks like a header (has a "name"-ish column) */
function findHeaderRow(rows: Cell[][], aliases: string[]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const headers = rows[i].map(normHeader);
    if (headerIndex(headers, aliases) >= 0) return i;
  }
  return -1;
}

function parsePlayersTable(rows: Cell[][], warnings: string[], sheetLabel: string): ImportedPlayer[] {
  const headerRow = findHeaderRow(rows, PLAYER_COLUMNS.name);
  if (headerRow < 0) {
    warnings.push(`${sheetLabel}: couldn't find a "Name" column, skipped.`);
    return [];
  }
  const headers = rows[headerRow].map(normHeader);
  const col = Object.fromEntries(
    Object.entries(PLAYER_COLUMNS).map(([key, aliases]) => [key, headerIndex(headers, aliases)])
  ) as Record<keyof typeof PLAYER_COLUMNS, number>;
  // "Team" alias must not steal the "Name" column in sheets that have both
  if (col.team === col.name) col.team = -1;
  if (col.number < 0) warnings.push(`${sheetLabel}: no "Number" column, player numbers will be assigned in order.`);

  const get = (row: Cell[], key: keyof typeof PLAYER_COLUMNS) => (col[key] >= 0 ? row[col[key]] : undefined);
  const players: ImportedPlayer[] = [];
  let autoNumber = 1;
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    const name = clean(get(row, 'name'));
    if (!name) continue;
    const number = clean(get(row, 'number')) || String(autoNumber);
    autoNumber = Math.max(autoNumber, (parseInt(number, 10) || autoNumber) + 1);
    players.push({
      _row: i + 1,
      name,
      number: number.replace(/\.0+$/, ''),
      city: clean(get(row, 'city')) || undefined,
      role: normalizeRole(get(row, 'role')),
      base: toNum(get(row, 'base')),
      playerType: normalizePlayerType(get(row, 'type')),
      team: clean(get(row, 'team')) || undefined,
      matches: toNum(get(row, 'matches')),
      runs: toNum(get(row, 'runs')),
      wickets: toNum(get(row, 'wickets')),
      photoUrl: /^https?:\/\//i.test(clean(get(row, 'photoUrl'))) ? clean(get(row, 'photoUrl')) : undefined,
    });
  }
  return players;
}

/** Teams sheet; owner / icon name columns become owner / icon players of that team */
function parseTeamsTable(rows: Cell[][], warnings: string[], sheetLabel: string): { teams: ImportedTeam[]; players: ImportedPlayer[] } {
  const headerRow = findHeaderRow(rows, TEAM_COLUMNS.name);
  if (headerRow < 0) {
    warnings.push(`${sheetLabel}: couldn't find a "Team" column, skipped.`);
    return { teams: [], players: [] };
  }
  const headers = rows[headerRow].map(normHeader);
  const col = Object.fromEntries(Object.entries(TEAM_COLUMNS).map(([k, a]) => [k, headerIndex(headers, a)])) as Record<
    keyof typeof TEAM_COLUMNS,
    number
  >;
  // "owner team" style headers shouldn't be read as the owner's name
  if (col.owner === col.name) col.owner = -1;
  const teams: ImportedTeam[] = [];
  const players: ImportedPlayer[] = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    const name = clean(row[col.name]);
    if (!name) continue;
    teams.push({
      name,
      shortName: col.shortName >= 0 ? clean(row[col.shortName]) || undefined : undefined,
      color: col.color >= 0 && /^#[0-9a-f]{3,8}$/i.test(clean(row[col.color])) ? clean(row[col.color]) : undefined,
    });
    const people: [keyof typeof TEAM_COLUMNS, 'owner' | 'icon'][] = [
      ['owner', 'owner'],
      ['icon1', 'icon'],
      ['icon2', 'icon'],
      ['icon3', 'icon'],
    ];
    for (const [key, type] of people) {
      const person = col[key] >= 0 ? clean(row[col[key]]) : '';
      if (person) players.push({ _row: i + 1, name: person, number: '', playerType: type, team: name });
    }
  }
  return { teams, players };
}

function parseCsv(text: string): Cell[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const delimiter = (text.split('\n')[0].match(/;/g)?.length || 0) > (text.split('\n')[0].match(/,/g)?.length || 0) ? ';' : ',';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

/** Numbers for owner/icon rows that had none: continue after the highest number in the file */
function fillMissingNumbers(players: ImportedPlayer[]) {
  let next = Math.max(0, ...players.map((p) => parseInt(p.number, 10)).filter(Number.isFinite)) + 1;
  for (const p of players) if (!p.number) p.number = String(next++);
}

/** Backup downloaded from this app (Players tab → Download backup) */
function parseAppBackup(json: any): ImportResult {
  const a = json.auction || {};
  const teamsById = new Map<string, any>((json.teams || []).map((t: any) => [t.id, t]));
  const teamName = (id?: string) => (id ? teamsById.get(id)?.name : undefined);
  const players: ImportedPlayer[] = Object.values<any>(a.players || {}).map((p, i) => {
    const r = a.records?.[p.id];
    return {
      _row: i + 1,
      name: p.name,
      number: String(p.number),
      city: p.city,
      role: p.role,
      base: p.base,
      playerType: p.playerType,
      team: teamName(p.teamId),
      matches: p.matches,
      runs: p.runs,
      wickets: p.wickets,
      photoUrl: p.photoUrl,
      record: r ? { status: r.status, team: teamName(r.teamId), price: r.price, round: r.round } : undefined,
    };
  });
  const topups: Record<string, number> = {};
  for (const [id, amount] of Object.entries<number>(a.topups || {})) if (teamName(id)) topups[teamName(id)!] = amount;
  return {
    source: 'backup',
    teams: (json.teams || []).map((t: any) => ({ name: t.name, shortName: t.shortName, color: t.color })),
    players,
    warnings: [],
    extras: { name: a.name, rules: a.rules, reAuctionStarted: a.reAuctionStarted, topups },
  };
}

function parseBackup(json: any): ImportResult {
  if (json?.format === 'azad-live-auction@1') return parseAppBackup(json);
  if (!Array.isArray(json?.players)) throw new Error('This JSON file is not an auction backup.');
  const records: any[] = Array.isArray(json.records) ? json.records : [];
  const players: ImportedPlayer[] = json.players.map((p: any, i: number) => {
    const r = records.find((x) => x.id === p.id);
    return {
      _row: i + 1,
      sourceId: String(p.id ?? i),
      name: String(p.name || '').trim(),
      number: String(p.number ?? '').trim(),
      city: p.city || undefined,
      role: normalizeRole(p.role),
      base: Number(p.base) || undefined,
      playerType: normalizePlayerType(p.playerType),
      team: p.assignedTeam || undefined,
      matches: toNum(p.matches),
      runs: toNum(p.runs),
      wickets: toNum(p.wickets),
      photoData: typeof p.photo === 'string' && p.photo.startsWith('data:image/') ? p.photo : undefined,
      record: r ? { status: r.status, team: r.team, price: r.price, round: r.auctionRound } : undefined,
    } as ImportedPlayer;
  });
  const teamNames: string[] = Array.isArray(json.teams) ? json.teams.filter((t: any) => typeof t === 'string' && t.trim()) : [];
  const rules = json.auctionRules ? { ...json.auctionRules, purse: json.purse } : json.purse ? { purse: json.purse } : undefined;
  return {
    source: 'backup',
    teams: teamNames.map((name) => ({ name })),
    players,
    warnings: [],
    extras: { rules, reAuctionStarted: json.reAuctionStarted, topups: json.topups },
  };
}

export async function readAuctionFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.json')) return parseBackup(JSON.parse(await file.text()));

  const warnings: string[] = [];
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    const players = parsePlayersTable(parseCsv(await file.text()), warnings, 'CSV');
    fillMissingNumbers(players);
    return { source: 'csv', teams: [], players, warnings };
  }
  if (name.endsWith('.xls')) {
    throw new Error('Old .xls files are not supported. In Excel, use File → Save As → Excel Workbook (.xlsx) or CSV.');
  }

  const { default: readXlsxFile } = await import('read-excel-file/browser');
  const sheets = await readXlsxFile(file);
  const teams: ImportedTeam[] = [];
  const players: ImportedPlayer[] = [];
  const teamPeople: ImportedPlayer[] = [];
  for (const { sheet, data } of sheets) {
    if (!data.length) continue;
    if (/team|टीम/i.test(sheet)) {
      const t = parseTeamsTable(data as Cell[][], warnings, `Sheet "${sheet}"`);
      teams.push(...t.teams);
      teamPeople.push(...t.players);
    } else {
      players.push(...parsePlayersTable(data as Cell[][], warnings, `Sheet "${sheet}"`));
    }
  }
  // Owners / icons from the Teams sheet, unless already listed on the Players sheet
  const known = new Set(players.map((p) => p.name.toLowerCase()));
  players.push(...teamPeople.filter((p) => !known.has(p.name.toLowerCase())));
  fillMissingNumbers(players);
  // Teams mentioned only on player rows are created too
  for (const p of players) {
    if (p.playerType === 'auction') continue; // auction players get their team at the auction
    if (p.team && !teams.some((t) => t.name.toLowerCase() === p.team!.toLowerCase())) teams.push({ name: p.team });
  }
  return { source: 'excel', teams, players, warnings };
}

/** CSV templates (open in Excel) */
export const PLAYERS_TEMPLATE_CSV =
  'Number,Name,City,Role,Base Price,Type,Team,Matches,Runs,Wickets,Photo URL\n' +
  '1,Rohan Patil,Khetia,Batsman,1000,Auction,,12,340,2,\n' +
  '2,Imran Shaikh,Khetia,Bowler,1000,Auction,,10,45,18,\n' +
  '3,Vikas More,Pansemal,All-rounder,1500,Icon,Royal Warriors,,,,\n' +
  '4,Sahil Khan,Khetia,Batsman,0,Owner,Royal Warriors,,,,\n';

export const TEAMS_TEMPLATE_CSV =
  'Team Name,Short Name,Color,Owner,Icon 1,Icon 2,Icon 3\n' +
  'Royal Warriors,RW,#f97316,Sahil Khan,Vikas More,,\n' +
  'Azad Strikers,AZS,#0ea5e9,,,,\n';

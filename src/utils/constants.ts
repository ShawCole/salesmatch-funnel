export const INTENT_ORDER = ['high', 'medium', 'low'];

export const INTENT_LABELS: Record<string, string> = {
  high: 'High Intent',
  medium: 'Medium Intent',
  low: 'Low Intent',
};

export const AGE_RANGE_ORDER = [
  '18-24', '25-34', '35-44', '45-54', '55-64', '65 and older',
];

export const AGE_RANGE_LABELS: Record<string, string> = {
  '65 and older': '65+',
};

export const CREDIT_RATING_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export const GENDER_ORDER = ['F', 'M', 'U'];

export const INCOME_RANGE_ORDER = [
  'less than $20,000',
  '$20,000 to $44,999', '$45,000 to $59,999', '$60,000 to $74,999',
  '$75,000 to $99,999', '$100,000 to $149,999', '$150,000 to $199,999',
  '$200,000 to $249,999', '$200,000 to $249,000', '$250,000+',
];

export const NET_WORTH_ORDER = [
  '-$20,000 to -$2,500', '-$2,499 to $2,499', '$2,500 to $24,999',
  '$25,000 to $49,999', '$50,000 to $74,999', '$75,000 to $99,999',
  '$100,000 to $149,999', '$150,000 to $249,999', '$250,000 to $374,999',
  '$375,000 to $499,999', '$500,000 to $749,999', '$750,000 to $999,999',
  '$1,000,000 or more',
];

export const SENIORITY_ORDER = ['staff', 'manager', 'director', 'vp', 'cxo'];

export const SENIORITY_LABELS: Record<string, string> = {
  staff: 'Staff',
  manager: 'Manager',
  director: 'Director',
  vp: 'VP',
  cxo: 'CXO',
};

export const INCOME_RANGE_LABELS: Record<string, string> = {
  'less than $20,000': '< $20k',
  'Less than $20,000': '< $20k',
  '$20,000 to $44,999': '$20k-$45k',
  '$45,000 to $59,999': '$45k-$60k',
  '$60,000 to $74,999': '$60k-$75k',
  '$75,000 to $99,999': '$75k-$100k',
  '$100,000 to $149,999': '$100k-$150k',
  '$150,000 to $199,999': '$150k-$200k',
  '$200,000 to $249,999': '$200k-$250k',
  '$200,000 to $249,000': '$200k-$250k',
  '$250,000+': '> $250k',
};

export const INCOME_MOBILE_LABELS: Record<string, string> = {
  'less than $20,000': 'Under $20k',
  'Less than $20,000': 'Under $20k',
  '$20,000 to $44,999': '$20-45k',
  '$45,000 to $59,999': '$45-60k',
  '$60,000 to $74,999': '$60-75k',
  '$75,000 to $99,999': '$75-100k',
  '$100,000 to $149,999': '$100-150k',
  '$150,000 to $199,999': '$150-200k',
  '$200,000 to $249,999': '$200-250k',
  '$200,000 to $249,000': '$200-250k',
  '$250,000+': 'Over $250k',
};

export const NET_WORTH_LABELS: Record<string, string> = {
  '-$20,000 to -$2,500': '< -$2.5k',
  '-$2,499 to $2,499': '-$2.5k-$2.5k',
  '$2,500 to $24,999': '$2.5k-$25k',
  '$25,000 to $49,999': '$25k-$50k',
  '$50,000 to $74,999': '$50k-$75k',
  '$75,000 to $99,999': '$75k-$100k',
  '$100,000 to $149,999': '$100k-$150k',
  '$150,000 to $249,999': '$150k-$250k',
  '$250,000 to $374,999': '$250k-$375k',
  '$375,000 to $499,999': '$375k-$500k',
  '$500,000 to $749,999': '$500k-$750k',
  '$750,000 to $999,999': '$750k-$1M',
  'More than $1,000,000': '> $1M',
  '$1,000,000 or more': '> $1M',
};

export const NET_WORTH_MOBILE_LABELS: Record<string, string> = {
  '-$20,000 to -$2,500': 'Under -$2.5k',
  '-$2,499 to $2,499': '-$2.5-2.5k',
  '$2,500 to $24,999': '$2.5-25k',
  '$25,000 to $49,999': '$25-50k',
  '$50,000 to $74,999': '$50-75k',
  '$75,000 to $99,999': '$75-100k',
  '$100,000 to $149,999': '$100-150k',
  '$150,000 to $249,999': '$150-250k',
  '$250,000 to $374,999': '$250-375k',
  '$375,000 to $499,999': '$375-500k',
  '$500,000 to $749,999': '$500-750k',
  '$750,000 to $999,999': '$750-999k',
  'More than $1,000,000': 'Over $1M',
  '$1,000,000 or more': 'Over $1M',
};
export const CREDIT_RATING_LABELS: Record<string, string> = {
  'A': '800+',
  'B': '750-799',
  'C': '700-749',
  'D': '650-699',
  'E': '600-649',
  'F': '550-599',
  'G': '500-549',
  'H': 'Under 499',
};

export const GENDER_LABELS: Record<string, string> = {
  'F': 'Female',
  'M': 'Male',
  'U': 'Unknown',
};

export const LANGUAGE_CODE_LABELS: Record<string, string> = {
  E1: 'English', S8: 'Spanish', C1: 'Chinese', V1: 'Vietnamese',
  H3: 'Hindi', P3: 'Portuguese', K4: 'Korean', J1: 'Japanese',
  F1: 'Farsi', I3: 'Italian', A4: 'Arabic', H2: 'Hebrew',
  G2: 'German', A5: 'Armenian', R2: 'Russian', F3: 'French',
  P2: 'Polish', R1: 'Romanian', T1: 'Tagalog', SB: 'Swedish',
  D1: 'Danish', H4: 'Hungarian', T3: 'Thai', G4: 'Greek',
  D2: 'Dutch', A3: 'Amharic', K2: 'Khmer', S2: 'Serbo-Croatian',
  N2: 'Norwegian', U1: 'Urdu', L1: 'Laotian', B4: 'Bulgarian',
  T6: 'Turkish', S4: 'Slovakian', S5: 'Slovenian', C3: 'Czech',
  S3: 'Sinhalese', G3: 'Ga', A2: 'Albanian', L3: 'Lithuanian',
  Z1: 'Zulu', G1: 'Georgian', UX: 'Unknown',
};

// Threshold: only languages >= 5% of total are shown individually; rest + UX → "Other"
export const LANGUAGE_THRESHOLD_PCT = 0.5;

// Choropleth color scale (transparent → blue → purple → red)
export const CHOROPLETH_COLORS = [
  'rgba(0,0,0,0)',     // 0
  '#1e3a5f',           // low
  '#2563eb',           // medium-low
  '#7c3aed',           // medium
  '#a855f7',           // medium-high
  '#dc2626',           // high
  '#ef4444',           // very high
];

export const EMPLOYEE_COUNT_ORDER = [
  '1 to 10', '11 to 25', '26 to 50', '51 to 100', '101 to 250',
  '251 to 500', '501 to 1000', '1001 to 5000', '5001 to 10000', '10000+', 'zero',
];

export const EMPLOYEE_COUNT_LABELS: Record<string, string> = {
  '1 to 10': '1–10',
  '11 to 25': '11–25',
  '26 to 50': '26–50',
  '51 to 100': '51–100',
  '101 to 250': '101–250',
  '251 to 500': '251–500',
  '501 to 1000': '501–1K',
  '1001 to 5000': '1K–5K',
  '5001 to 10000': '5K–10K',
  '10000+': '10K+',
  'zero': 'None/Unknown',
};

export const COMPANY_REVENUE_ORDER = [
  'under 1 million', '1 million to 5 million', '5 million to 10 million',
  '10 million to 25 million', '25 million to 50 million', '50 million to 100 million',
  '100 million to 250 million', '250 million to 500 million',
  '500 million to 1 billion', '1 billion and over',
];

export const COMPANY_REVENUE_LABELS: Record<string, string> = {
  'under 1 million': '< $1M',
  '1 million to 5 million': '$1M–$5M',
  '5 million to 10 million': '$5M–$10M',
  '10 million to 25 million': '$10M–$25M',
  '25 million to 50 million': '$25M–$50M',
  '50 million to 100 million': '$50M–$100M',
  '100 million to 250 million': '$100M–$250M',
  '250 million to 500 million': '$250M–$500M',
  '500 million to 1 billion': '$500M–$1B',
  '1 billion and over': '$1B+',
};

export const CHOROPLETH_STOPS = [0, 1, 5, 15, 40, 100, 300];

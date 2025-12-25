
export interface ChecklistItem {
  id: string;
  label: string;
  section: 1 | 2;
  description?: string;
}

export interface ContractorStatus {
  [itemId: string]: boolean;
}

export interface Contractor {
  id: string;
  name: string;
}

export interface AppState {
  [contractorId: string]: ContractorStatus;
}

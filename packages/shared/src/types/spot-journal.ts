/**
 * Spot Journal domain models: focused appearance tracking over time.
 * Strictly non-diagnostic; observational only.
 */

export interface SpotEntry {
  entryId: string;
  dayNumber: number; // Day 1, Day 3, Day 7, Day 14, etc.
  capturedAt: string; // ISO 8601
  photoStoragePath: string;
  userObservationNotes?: string;
  reportedTenderness?: 'none' | 'mild' | 'severe'; // If severe -> escalation
  reportedVisibleChanges?: 'smaller' | 'same' | 'more_prominent' | 'fading';
}

export interface SpotJournal {
  journalId: string;
  userId: string;
  title: string; // e.g. "Forehead area tracking"
  facialRegion: 'forehead' | 'left_cheek' | 'right_cheek' | 'nose' | 'chin' | 'jawline' | 'other';
  startedAt: string;
  status: 'active' | 'resolved' | 'archived';
  entries: SpotEntry[];
  requiresProfessionalConsultation: boolean;
  escalationNotice?: string;
  createdAt: string;
  updatedAt: string;
}

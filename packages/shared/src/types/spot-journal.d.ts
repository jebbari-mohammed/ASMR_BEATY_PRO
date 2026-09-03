/**
 * Spot Journal domain models: focused appearance tracking over time.
 * Strictly non-diagnostic; observational only.
 */
export interface SpotEntry {
    entryId: string;
    dayNumber: number;
    capturedAt: string;
    photoStoragePath: string;
    userObservationNotes?: string;
    reportedTenderness?: 'none' | 'mild' | 'severe';
    reportedVisibleChanges?: 'smaller' | 'same' | 'more_prominent' | 'fading';
}
export interface SpotJournal {
    journalId: string;
    userId: string;
    title: string;
    facialRegion: 'forehead' | 'left_cheek' | 'right_cheek' | 'nose' | 'chin' | 'jawline' | 'other';
    startedAt: string;
    status: 'active' | 'resolved' | 'archived';
    entries: SpotEntry[];
    requiresProfessionalConsultation: boolean;
    escalationNotice?: string;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=spot-journal.d.ts.map
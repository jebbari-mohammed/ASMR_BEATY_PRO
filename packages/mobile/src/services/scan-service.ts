import * as SecureStore from 'expo-secure-store';

const LATEST_SCAN_KEY = 'asmr_latest_skin_scan_v1';

export interface FacialZoneData {
  id: string;
  name: string;
  score: number;
  status: 'OPTIMAL' | 'GOOD' | 'NEEDS_ATTENTION' | 'MONITOR';
  statusLabel: string;
  description: string;
  recommendation: string;
  pinStyle: {
    top: string;
    left?: string;
    right?: string;
  };
}

export interface SkinScanResult {
  scanId: string;
  photoUri: string | null;
  isRealUserScan?: boolean;
  timestamp: string;
  overallScore: number;
  skinAge: number;
  skinType: string;
  barrierStatus: string;
  barrierSummary: string;
  metrics: {
    hydration: number;
    redness: number;
    pores: number;
    texture: number;
    oilBalance: number;
    darkCircles: number;
  };
  zones: FacialZoneData[];
  focusAreas: Array<{
    priority: number;
    title: string;
    description: string;
    routineMatch: string;
  }>;
  coachQuote: string;
  customRoutine: {
    morning: Array<{
      step: number;
      name: string;
      category: string;
      detail: string;
      ingredient: string;
    }>;
    evening: Array<{
      step: number;
      name: string;
      category: string;
      detail: string;
      ingredient: string;
    }>;
  };
}

export class ScanService {
  /**
   * The former local scorer generated numbers from a photo URI. Keep this
   * unavailable until the verified server scan is integrated.
   */
  static async analyzeAndSaveScan(_photoUri: string): Promise<SkinScanResult> {
    throw new Error('Skin analysis is unavailable until the verified server scan is connected.');
  }

  static async getLatestScan(): Promise<SkinScanResult | null> {
    try {
      // Existing local results were synthetic and cannot be treated as observations.
      await SecureStore.deleteItemAsync(LATEST_SCAN_KEY);
    } catch (err) {
      console.warn('[ScanService] Failed to remove legacy scan:', err);
    }
    return null;
  }
}

/**
 * My Shelf: user-owned products and usage history.
 */
import { Product } from './product.js';
export type ShelfItemStatus = 'active' | 'paused' | 'finished' | 'discontinued';
export type UserProductFeedback = 'loved' | 'works_well' | 'neutral' | 'irritating' | 'stopped';
export type ShelfInputMethod = 'barcode_scan' | 'ocr_label_recognition' | 'catalog_search' | 'manual_entry';
export interface ShelfItem {
    shelfItemId: string;
    userId: string;
    productId: string;
    productSnapshot: Pick<Product, 'productId' | 'brand' | 'name' | 'category' | 'routineStep' | 'activeCategories' | 'fragranceStatus'>;
    inputMethod: ShelfInputMethod;
    status: ShelfItemStatus;
    dateStarted: string;
    dateFinished?: string;
    feedback?: UserProductFeedback;
    reportedIrritation?: boolean;
    irritationNotes?: string;
    wouldRepurchase?: boolean;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=shelf.d.ts.map
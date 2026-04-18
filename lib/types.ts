/**
 * Domain types for your app.
 *
 * Replace this placeholder with your own entity types. The template includes
 * a simple `Item` example to show the pattern: every user-scoped document
 * should carry `userId` so Firestore rules can enforce per-user isolation.
 */
import { Timestamp } from "firebase/firestore";

export interface Item {
  id: string;
  userId: string;
  name: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

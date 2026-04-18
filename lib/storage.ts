/**
 * Firebase Storage helpers for recipe images.
 *
 * Images live at users/{uid}/recipes/{timestamp}-{random}.{ext} so each
 * user's uploads are isolated by the storage rules.
 */

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "./firebase";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — matches storage.rules

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

/**
 * Upload a recipe image and return its public download URL.
 * Throws UploadError for invalid inputs before hitting the network.
 */
export async function uploadRecipeImage(
  uid: string,
  file: File,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new UploadError("רק קבצי תמונה נתמכים");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new UploadError("הקובץ גדול מדי (מקסימום 5MB)");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
  const path = `users/${uid}/recipes/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}.${safeExt}`;

  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the firebase module before importing storage.ts
vi.mock("firebase/storage", () => ({
  ref: vi.fn(() => ({})),
  uploadBytes: vi.fn(async () => ({})),
  getDownloadURL: vi.fn(async () => "https://firebasestorage.example/got-url"),
}));
vi.mock("@/lib/firebase", () => ({
  getFirebaseStorage: vi.fn(() => ({})),
}));

import { uploadRecipeImage, UploadError } from "@/lib/storage";

function makeFile(
  content: string,
  name: string,
  type: string,
  sizeOverride?: number,
): File {
  const f = new File([content], name, { type });
  if (sizeOverride !== undefined) {
    Object.defineProperty(f, "size", { value: sizeOverride });
  }
  return f;
}

describe("uploadRecipeImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-image files", async () => {
    const file = makeFile("hello", "doc.txt", "text/plain");
    await expect(uploadRecipeImage("uid-1", file)).rejects.toBeInstanceOf(
      UploadError,
    );
  });

  it("rejects files over 5MB", async () => {
    const file = makeFile("x", "big.jpg", "image/jpeg", 6 * 1024 * 1024);
    await expect(uploadRecipeImage("uid-1", file)).rejects.toThrow(/5MB/);
  });

  it("returns a download URL on success", async () => {
    const file = makeFile("bytes", "pic.png", "image/png", 1024);
    const url = await uploadRecipeImage("uid-1", file);
    expect(url).toBe("https://firebasestorage.example/got-url");
  });
});

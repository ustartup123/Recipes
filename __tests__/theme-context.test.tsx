/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { ThemeProvider, useTheme, __theme_internals } from "@/context/ThemeContext";

const { STORAGE_KEY } = __theme_internals;

function makeMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_t: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb);
    },
    removeEventListener: (_t: string, cb: (e: MediaQueryListEvent) => void) => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    },
    addListener: (cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
    removeListener: (cb: (e: MediaQueryListEvent) => void) => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    },
    dispatchEvent: () => true,
    fire: (newMatches: boolean) => {
      mql.matches = newMatches;
      listeners.forEach((l) => l({ matches: newMatches } as MediaQueryListEvent));
    },
  };
  return mql;
}

let mql: ReturnType<typeof makeMatchMedia>;

function makeLocalStorageShim() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    writable: true,
    value: makeLocalStorageShim(),
  });
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
  mql = makeMatchMedia(false);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Probe() {
  const { mode, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
    </div>
  );
}

describe("ThemeProvider — initialization", () => {
  it("returns 'auto' when localStorage is empty", () => {
    const { getByTestId } = render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(getByTestId("mode").textContent).toBe("auto");
  });

  it("reads stored 'dark' value", () => {
    window.localStorage.setItem(STORAGE_KEY, "dark");
    const { getByTestId } = render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(getByTestId("mode").textContent).toBe("dark");
    expect(getByTestId("resolved").textContent).toBe("dark");
  });

  it("reads stored 'light' value", () => {
    window.localStorage.setItem(STORAGE_KEY, "light");
    const { getByTestId } = render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(getByTestId("mode").textContent).toBe("light");
  });

  it("rejects invalid stored value, resets to 'auto', overwrites localStorage", () => {
    window.localStorage.setItem(STORAGE_KEY, "rainbow");
    const { getByTestId } = render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(getByTestId("mode").textContent).toBe("auto");
    // Corrupt value should have been removed during read.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("does not throw when localStorage.getItem throws SecurityError", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(() =>
      render(<ThemeProvider><Probe /></ThemeProvider>),
    ).not.toThrow();
  });
});

describe("ThemeProvider — auto mode follows matchMedia", () => {
  it("resolves to 'dark' when system prefers dark", () => {
    mql = makeMatchMedia(true);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(mql),
    });
    const { getByTestId } = render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(getByTestId("mode").textContent).toBe("auto");
    expect(getByTestId("resolved").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("re-renders when system pref changes (auto mode)", () => {
    const { getByTestId } = render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(getByTestId("resolved").textContent).toBe("light");
    act(() => {
      mql.fire(true);
    });
    expect(getByTestId("resolved").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

describe("ThemeProvider — setMode", () => {
  function Setter({ to }: { to: "light" | "dark" | "auto" }) {
    const { setMode } = useTheme();
    return <button data-testid="set" onClick={() => setMode(to)}>x</button>;
  }

  it("applies html.classList = ['dark'] when mode is 'dark'", () => {
    const { getByTestId } = render(
      <ThemeProvider><Setter to="dark" /></ThemeProvider>,
    );
    act(() => {
      getByTestId("set").click();
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("removes 'dark' when mode is 'light'", () => {
    document.documentElement.classList.add("dark");
    const { getByTestId } = render(
      <ThemeProvider><Setter to="light" /></ThemeProvider>,
    );
    act(() => {
      getByTestId("set").click();
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("persists to localStorage on change", () => {
    const { getByTestId } = render(
      <ThemeProvider><Setter to="dark" /></ThemeProvider>,
    );
    act(() => {
      getByTestId("set").click();
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("dark");
  });

  it("does not throw when localStorage.setItem throws QuotaExceededError", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    const { getByTestId } = render(
      <ThemeProvider><Setter to="dark" /></ThemeProvider>,
    );
    expect(() => act(() => getByTestId("set").click())).not.toThrow();
  });
});

describe("ThemeProvider — multi-tab storage event", () => {
  it("syncs state when 'storage' event fires for the theme key", () => {
    const { getByTestId } = render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(getByTestId("mode").textContent).toBe("auto");
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: "dark",
          storageArea: window.localStorage,
        }),
      );
    });
    expect(getByTestId("mode").textContent).toBe("dark");
  });

  it("ignores 'storage' events for unrelated keys", () => {
    const { getByTestId } = render(<ThemeProvider><Probe /></ThemeProvider>);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "other-key",
          newValue: "dark",
          storageArea: window.localStorage,
        }),
      );
    });
    expect(getByTestId("mode").textContent).toBe("auto");
  });
});

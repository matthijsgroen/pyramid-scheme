import { renderHook, act } from "@testing-library/react";
import { usePyramidNavigation } from "./usePyramidNavigation";
import { describe, expect, it, vi } from "vitest";
import type { KeyboardEvent } from "react";

describe.only(usePyramidNavigation, () => {
  const floorStartIndices = [0, 1, 3]; // Example for 3 floors
  const floorCount = 3;
  const blocks = [
    { id: "A" }, // 0
    { id: "B" }, // 1
    { id: "C" }, // 2
    { id: "D" }, // 3
    { id: "E" }, // 4
    { id: "F" }, // 5
  ];
  const onAnswer = vi.fn();

  it("initializes with selectedBlockIndex 0 and focusInput false", () => {
    const { result } = renderHook(() =>
      usePyramidNavigation(floorStartIndices, floorCount, blocks, onAnswer)
    );
    expect(result.current.selectedBlockIndex).toBe(0);
    expect(result.current.focusInput).toBe(false);
  });

  it("moves selection with arrow keys", () => {
    const { result } = renderHook(() =>
      usePyramidNavigation(floorStartIndices, floorCount, blocks, onAnswer)
    );
    act(() => {
      result.current.handleKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent<HTMLDivElement>);
    });
    expect(result.current.selectedBlockIndex).toBe(1);
    act(() => {
      result.current.handleKeyDown({
        key: "ArrowRight",
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent<HTMLDivElement>);
    });
    expect(result.current.selectedBlockIndex).toBe(2);
  });

  it("sets focusInput true on Enter", () => {
    const { result } = renderHook(() =>
      usePyramidNavigation(floorStartIndices, floorCount, blocks, onAnswer)
    );
    act(() => {
      result.current.handleKeyDown({
        key: "Enter",
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent<HTMLDivElement>);
    });
    expect(result.current.focusInput).toBe(true);
  });

  it("calls onAnswer and sets focusInput true on number key", () => {
    const { result } = renderHook(() =>
      usePyramidNavigation(floorStartIndices, floorCount, blocks, onAnswer)
    );
    act(() => {
      result.current.handleKeyDown({
        key: "5",
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent<HTMLDivElement>);
    });
    expect(onAnswer).toHaveBeenCalledWith("A", 5);
    expect(result.current.focusInput).toBe(true);
  });

  it.only("moves selection up and down floors", () => {
    const { result } = renderHook(() =>
      usePyramidNavigation(floorStartIndices, floorCount, blocks, onAnswer)
    );
    act(() => {
      result.current.setSelectedBlockIndex(1); // Select block on floor 1
    });
    act(() => {
      result.current.handleKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent<HTMLDivElement>);
    });
    // Should move to floor 2, index 1
    expect(result.current.selectedBlockIndex).toBe(3);
    act(() => {
      result.current.handleKeyDown({
        key: "ArrowUp",
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent<HTMLDivElement>);
    });
    // Should move back to floor 1, index 1
    expect(result.current.selectedBlockIndex).toBe(1);
  });
});

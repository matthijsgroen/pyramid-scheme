export const hieroglyphCategory = (id: string) =>
  id.startsWith("d")
    ? "deities"
    : id.startsWith("p")
      ? "professions"
      : id.startsWith("o")
        ? "offerings"
        : id.startsWith("s")
          ? "signs"
          : id.startsWith("art")
            ? "artifacts"
            : "animals"

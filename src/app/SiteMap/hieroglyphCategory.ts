export const hieroglyphCategory = (id: string) =>
  id.startsWith("d") ? "deities" : id.startsWith("p") ? "professions" : id.startsWith("art") ? "artifacts" : "animals"

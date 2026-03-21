const blockedTerms = ["adult content", "counterfeit", "fake reviews", "medical claims"];

export function assertGenerationSafe(input: string) {
  const normalized = input.toLowerCase();

  const matched = blockedTerms.find((term) => normalized.includes(term));

  if (matched) {
    throw new Error(
      `This brief includes content that needs manual review before generation: ${matched}.`,
    );
  }
}

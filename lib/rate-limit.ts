type RateLimitResult = {
  allowed: boolean;
  resetAt: Date;
};

export async function assertRateLimitReady(key: string): Promise<RateLimitResult> {
  void key;
  return {
    allowed: true,
    resetAt: new Date(Date.now() + 60_000),
  };
}

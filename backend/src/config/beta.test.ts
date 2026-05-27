describe('beta pricing config', () => {
  afterEach(() => {
    delete process.env.BETA_MODE;
    jest.resetModules();
  });

  it('treats basic plan as free when beta mode is enabled by default', async () => {
    const mod = await import('./beta');
    expect(mod.BETA_MODE).toBe(true);
    expect(mod.getEffectivePlanAmount('basic', 299)).toBe(0);
  });

  it('restores base pricing when beta mode is disabled', async () => {
    process.env.BETA_MODE = 'false';
    const mod = await import('./beta');
    expect(mod.BETA_MODE).toBe(false);
    expect(mod.getEffectivePlanAmount('basic', 299)).toBe(299);
  });
});

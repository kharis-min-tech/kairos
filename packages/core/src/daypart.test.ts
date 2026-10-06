import { describe, it, expect } from 'vitest';
import { resolveDaypart } from './daypart';

describe('resolveDaypart', () => {
  it('cuts the day at 5, 8, 17 and 20', () => {
    expect(resolveDaypart(5)).toBe('dawn');
    expect(resolveDaypart(7)).toBe('dawn');
    expect(resolveDaypart(8)).toBe('day');
    expect(resolveDaypart(16)).toBe('day');
    expect(resolveDaypart(17)).toBe('dusk');
    expect(resolveDaypart(19)).toBe('dusk');
    expect(resolveDaypart(20)).toBe('night');
  });

  it('keeps the small hours on the night side of midnight', () => {
    expect(resolveDaypart(23)).toBe('night');
    expect(resolveDaypart(0)).toBe('night');
    expect(resolveDaypart(4)).toBe('night');
  });
});

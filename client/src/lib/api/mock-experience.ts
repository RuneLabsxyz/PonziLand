export interface UserStats {
  address: string;
  total_points: number;
  rank: number;
  total_users: number;
  completions_count: number;
}

export const mockUserStats: UserStats = {
  address: '0x62f0ca21835f5fb7470f80eaee41dcf29f7989e14607f023f390fcfb864bc7c',
  total_points: 5,
  rank: 3,
  total_users: 101,
  completions_count: 1,
};

export function getMockUserStats(address: string): UserStats {
  return {
    ...mockUserStats,
    address,
  };
}

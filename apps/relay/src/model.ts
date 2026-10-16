export type Room = {
  id: string;
  origin: string;
  expires: number;
  pair_hash: string;
  pair_expires: number;
  pair_used: number;
  pair_attempts: number;
};

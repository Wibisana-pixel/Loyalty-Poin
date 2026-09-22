// File: src/types/index.ts

export type Role = 'admin' | 'staff';

export interface UserSession {
  id: number;
  username: string;
  role: Role;
  storeId: number | null;
  storeName: string;
  loginTime: number;
}

export interface Member {
  id: number;
  created_at: string;
  nama: string;
  no_hp: string;
  pin: string;
  total_poin: number;
  referral_code: string | null;
  referred_by_id: number | null;
  last_reset_date?: string | null; // Untuk misi mingguan
  stores?: { nama_toko: string }; // Relasi
  referrer?: { nama: string } | null; // Join untuk nama pengajak
}

export interface ReferralSettings {
  id: number;
  bonus_points_for_referrer: number;
  bonus_points_for_new_member: number;
}

export interface Voucher {
  id: number;
  code: string; // Kode Unik (V2.0)
  status: 'active' | 'used' | 'expired';
  created_at: string;
  reward_id: number;
  rewards?: {
    nama_hadiah: string;
    nilai_voucher: number;
  };
}

export interface Transaction {
  id: number;
  created_at: string;
  type: 'earning' | 'redeem';
  amount: number;
  description: string;
  store_id: number | null;
  stores?: { nama_toko: string };
  members?: { nama: string; no_hp: string };
}

export interface Store {
  id: number;
  nama_toko: string;
  alamat: string | null;
}

export interface CheckinReward {
  id: number;
  day_number: number;
  reward_points: number;
  description: string;
  created_at: string;
}

export interface MemberCheckin {
  id: number;
  member_id: number;
  total_days: number;
  last_checkin_date: string;
}

export interface Quest {
  id: number;
  name: string;
  description: string;
  target_count: number;
  reward_points: number;
  is_active: boolean;
  created_at?: string;
}

export interface MemberQuest {
  id: number;
  member_id: number;
  quest_id: number;
  current_progress: number;
  is_completed: boolean;
  created_at?: string;
  quests?: Quest; // Relasi
}

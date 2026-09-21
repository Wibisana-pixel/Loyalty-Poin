"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ReferralSettings } from "@/types";
import { Loader2, Copy, Users, Gift, CheckCircle2, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

interface ReferralViewProps {
  member: {
    id: number;
    nama: string;
    referral_code: string | null;
  };
  onUpdate: () => void;
}

// Generator kode referral: 3 huruf depan nama + 4 angka acak
function generateReferralCode(nama: string): string {
  const cleanName = nama.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const prefix = cleanName.substring(0, 3).padEnd(3, "X");
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 digit
  return `${prefix}${randomNum}`;
}

export function ReferralView({ member, onUpdate }: ReferralViewProps) {
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(member.referral_code);
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [member.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Ambil referral settings
      const { data: settingsData } = await supabase
        .from("referral_settings")
        .select("*")
        .limit(1)
        .single();
      if (settingsData) setSettings(settingsData);

      // 2. Ambil kode referral terbaru dari DB
      const { data: memberData } = await supabase
        .from("members")
        .select("referral_code")
        .eq("id", member.id)
        .single();

      let currentCode = memberData?.referral_code || null;

      // 3. Jika belum punya kode, generate dan simpan
      if (!currentCode) {
        currentCode = await generateAndSaveCode();
      }

      setReferralCode(currentCode);

      // 4. Ambil daftar teman yang diajak
      const { data: friendsData } = await supabase
        .from("members")
        .select("id, nama, created_at")
        .eq("referred_by_id", member.id)
        .order("created_at", { ascending: false });

      if (friendsData) setFriends(friendsData);
    } catch (error) {
      console.error("Error fetching referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateAndSaveCode = async (): Promise<string> => {
    setGenerating(true);
    let code = generateReferralCode(member.nama);
    let attempts = 0;

    // Pastikan kode unik
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("members")
        .select("id")
        .eq("referral_code", code)
        .single();

      if (!existing) break; // Kode unik
      code = generateReferralCode(member.nama); // Coba lagi
      attempts++;
    }

    const { error } = await supabase
      .from("members")
      .update({ referral_code: code })
      .eq("id", member.id);

    if (error) {
      console.error("Gagal menyimpan kode referral:", error);
      toast.error("Gagal membuat kode referral.");
    }

    setGenerating(false);
    return code;
  };

  const handleCopy = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode).then(() => {
      toast.success("Kode berhasil disalin!");
    }).catch(() => {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = referralCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success("Kode berhasil disalin!");
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8 bg-white rounded-3xl shadow-xl">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl p-5 border border-slate-100 flex flex-col gap-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-50 rounded-full opacity-50 z-0" />
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-50 rounded-full opacity-50 z-0" />

      {/* Header */}
      <div className="text-center relative z-10">
        <h2 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
          <Users className="text-indigo-600" size={24} /> Ajak Teman
        </h2>
        {settings && (
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Ajak teman daftar member, kamu dapat{" "}
            <span className="font-bold text-indigo-600">{settings.bonus_points_for_referrer} Poin</span>,
            temanmu dapat{" "}
            <span className="font-bold text-emerald-600">{settings.bonus_points_for_new_member} Poin</span>!
          </p>
        )}
      </div>

      {/* Kode Referral */}
      <div className="relative z-10">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-2">Kode Referral Kamu</p>
        <div className="bg-slate-900 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            {generating ? (
              <Loader2 className="animate-spin text-white mx-auto" size={24} />
            ) : (
              <span className="text-3xl font-black text-white tracking-[0.3em]">{referralCode || "---"}</span>
            )}
          </div>
          <button
            onClick={handleCopy}
            disabled={!referralCode}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-all hover:-translate-y-0.5 disabled:bg-slate-700 disabled:cursor-not-allowed"
            title="Salin Kode"
          >
            <Copy size={20} />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-2">
          Berikan kode ini ke temanmu saat mendaftar di kasir
        </p>
      </div>

      {/* Info Bonus Aktif */}
      {settings && (
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Kamu Dapat</p>
            <p className="text-2xl font-black text-indigo-600">+{settings.bonus_points_for_referrer}</p>
            <p className="text-[10px] text-indigo-400">Poin</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
            <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Teman Dapat</p>
            <p className="text-2xl font-black text-emerald-600">+{settings.bonus_points_for_new_member}</p>
            <p className="text-[10px] text-emerald-400">Poin</p>
          </div>
        </div>
      )}

      {/* Catatan */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 relative z-10">
        <p className="text-xs text-amber-700 flex items-start gap-2">
          <Gift size={16} className="shrink-0 mt-0.5" />
          <span>Bonus poin akan otomatis masuk saat temanmu melakukan <span className="font-bold">transaksi pertama</span> di toko.</span>
        </p>
      </div>

      {/* Daftar Teman */}
      <div className="relative z-10">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <UserPlus size={16} className="text-indigo-600" /> Teman yang Kamu Ajak
        </h3>
        <div className="bg-slate-50/80 rounded-2xl border border-slate-100 overflow-hidden">
          {friends.length === 0 ? (
            <div className="p-6 text-center">
              <Users size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Belum ada teman yang diajak</p>
              <p className="text-xs text-slate-400 mt-1">Bagikan kode di atas ke temanmu!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 p-4 hover:bg-slate-100/50 transition">
                  <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                    {friend.nama.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-700 text-sm truncate">{friend.nama}</p>
                    <p className="text-[10px] text-slate-400">
                      Bergabung {new Date(friend.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
        {friends.length > 0 && (
          <p className="text-xs text-slate-400 text-center mt-2">
            Total {friends.length} teman berhasil diajak
          </p>
        )}
      </div>
    </div>
  );
}

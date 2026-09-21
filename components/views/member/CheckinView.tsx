"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CheckinReward, MemberCheckin } from "@/types";
import { Loader2, Calendar, Gift, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

interface CheckinViewProps {
  member: {
    id: number;
    nama: string;
    total_poin: number;
  };
  onUpdate: () => void;
}

export function CheckinView({ member, onUpdate }: CheckinViewProps) {
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [rewards, setRewards] = useState<CheckinReward[]>([]);
  const [checkinData, setCheckinData] = useState<MemberCheckin | null>(null);

  useEffect(() => {
    fetchData();
  }, [member.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch rewards
      const { data: rewardsData } = await supabase
        .from("checkin_rewards")
        .select("*")
        .order("day_number", { ascending: true });
      
      if (rewardsData) setRewards(rewardsData);

      // Fetch member checkin info
      const { data: checkinData, error } = await supabase
        .from("member_checkins")
        .select("*")
        .eq("member_id", member.id)
        .single();

      if (!error && checkinData) {
        setCheckinData(checkinData);
      }
    } catch (error) {
      console.error("Error fetching checkin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const isCheckedInToday = () => {
    if (!checkinData?.last_checkin_date) return false;
    
    // Gunakan tanggal WIB
    const today = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    const lastCheckinDateStr = new Date(checkinData.last_checkin_date).toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    
    const todayDate = new Date(today);
    const lastCheckinDate = new Date(lastCheckinDateStr);

    return (
      todayDate.getFullYear() === lastCheckinDate.getFullYear() &&
      todayDate.getMonth() === lastCheckinDate.getMonth() &&
      todayDate.getDate() === lastCheckinDate.getDate()
    );
  };

  const handleCheckin = async () => {
    if (checkingIn || isCheckedInToday()) return;
    setCheckingIn(true);

    try {
      // WIB Time
      const now = new Date();
      // ISO String format for Supabase TIMESTAMPTZ
      const currentDays = checkinData?.total_days || 0;
      const newDays = currentDays + 1;

      // Cek apakah hari baru mendapat reward
      const rewardForToday = rewards.find(r => r.day_number === newDays);
      let newTotalPoin = member.total_poin;

      // 1. Upsert Member Checkins
      const { data: updatedCheckin, error: checkinError } = await supabase
        .from("member_checkins")
        .upsert({
          member_id: member.id,
          total_days: newDays,
          last_checkin_date: now.toISOString(),
        }, { onConflict: "member_id" })
        .select()
        .single();

      if (checkinError) throw checkinError;

      // 2. Add Reward Points if any
      if (rewardForToday) {
        newTotalPoin += rewardForToday.reward_points;
        const { error: updateError } = await supabase
          .from("members")
          .update({ total_poin: newTotalPoin })
          .eq("id", member.id);
        
        if (updateError) throw updateError;
        toast.success(`Check-in berhasil! Anda mendapat hadiah ${rewardForToday.reward_points} poin! 🎉`);
      } else {
        toast.success("Check-in harian berhasil!");
      }

      setCheckinData(updatedCheckin);
      if (rewardForToday) {
        onUpdate(); // refresh member data to get new points
      }
    } catch (error: any) {
      toast.error(error.message || "Gagal melakukan check-in.");
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8 bg-white rounded-3xl shadow-xl">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  const currentDays = checkinData?.total_days || 0;
  const alreadyCheckedIn = isCheckedInToday();
  const maxDays = 30;

  // Generate days array 1..30
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-3xl shadow-xl p-5 border border-slate-100 flex flex-col gap-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-50 rounded-full opacity-50 z-0" />
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-50 rounded-full opacity-50 z-0" />

      <div className="text-center relative z-10">
        <h2 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
          <Calendar className="text-indigo-600" size={24} /> Check-in Harian
        </h2>
        <p className="text-xs text-slate-500 mt-1">Kumpulkan poin dengan rajin check-in</p>
      </div>

      <div className="flex flex-col items-center relative z-10">
        <div className="text-5xl font-black text-slate-800 mb-2">{currentDays} <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">Hari</span></div>
      </div>

      <button
        onClick={handleCheckin}
        disabled={alreadyCheckedIn || checkingIn}
        className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 relative z-10
          ${alreadyCheckedIn 
            ? "bg-slate-300 shadow-none cursor-not-allowed" 
            : "bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-1 hover:shadow-indigo-500/30"}
        `}
      >
        {checkingIn ? (
          <Loader2 className="animate-spin" size={20} />
        ) : alreadyCheckedIn ? (
          <>
            <CheckCircle2 size={20} /> Sudah Check-in Hari Ini
          </>
        ) : (
          "Check-in Hari Ini"
        )}
      </button>

      {/* TIMELINE */}
      <div className="mt-4 relative z-10">
        <h3 className="text-sm font-bold text-slate-800 mb-4 px-2">Perjalanan Anda</h3>
        <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl p-4 max-h-[300px] overflow-y-auto border border-slate-100 shadow-inner">
          <div className="flex flex-col gap-3 relative before:absolute before:inset-y-0 before:left-[19px] before:w-0.5 before:bg-slate-200">
            {days.map((day) => {
              const isPast = day <= currentDays;
              const isToday = day === currentDays && alreadyCheckedIn;
              const reward = rewards.find(r => r.day_number === day);
              const isRewardDay = !!reward || day % 5 === 0;

              return (
                <div key={day} className="flex gap-4 relative z-10 items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors
                    ${isPast ? "border-indigo-500 bg-white text-indigo-600 shadow-sm" : "border-slate-200 bg-white text-slate-400"}
                    ${isToday ? "ring-4 ring-indigo-100 bg-indigo-50 border-indigo-500" : ""}
                  `}>
                    {isPast ? <CheckCircle2 size={20} /> : <span className="text-sm font-bold">{day}</span>}
                  </div>
                  <div className={`flex-1 rounded-xl p-3 border transition-all ${isPast ? "bg-indigo-50/50 border-indigo-100 shadow-sm" : "bg-white border-slate-100"}`}>
                    <div className="flex justify-between items-center">
                      <span className={`font-bold ${isPast ? "text-indigo-900" : "text-slate-600"}`}>Hari ke-{day}</span>
                      {reward ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                          <Gift size={14} /> +{reward.reward_points} Poin
                        </div>
                      ) : isRewardDay && !isPast ? (
                        <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                          <Gift size={14} /> Hadiah?
                        </div>
                      ) : null}
                    </div>
                    {reward && <p className="text-xs text-slate-500 mt-1">{reward.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

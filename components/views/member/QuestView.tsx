"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Member, Quest, MemberQuest } from "@/types";
import { Target, Gift, Loader2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

interface QuestViewProps {
  member: any;
  onUpdate: () => void;
}

export function QuestView({ member, onUpdate }: QuestViewProps) {
  const [activeQuests, setActiveQuests] = useState<(Quest & { progress?: MemberQuest })[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  // Helper to get this week's Monday date in YYYY-MM-DD format (WIB timezone)
  const getThisWeekMonday = () => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    // Format to YYYY-MM-DD
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const date = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  const handleResetIfNeeded = useCallback(async () => {
    const thisWeekMonday = getThisWeekMonday();
    const lastReset = member.last_reset_date ? member.last_reset_date.split('T')[0] : null;

    if (lastReset !== thisWeekMonday) {
      try {
        // Reset member's quests: current_progress = 0, is_completed = false
        await supabase
          .from("member_quests")
          .update({ current_progress: 0, is_completed: false })
          .eq("member_id", member.id);

        // Update member's last_reset_date
        await supabase
          .from("members")
          .update({ last_reset_date: thisWeekMonday })
          .eq("id", member.id);

        // Tell parent to refresh member data so we get the new last_reset_date
        onUpdate();
      } catch (error) {
        console.error("Gagal melakukan reset misi mingguan:", error);
      }
    }
  }, [member.id, member.last_reset_date, onUpdate]);

  const fetchQuests = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch active quests
      const { data: questsData, error: questsError } = await supabase
        .from("quests")
        .select("*")
        .eq("is_active", true)
        .order("id", { ascending: true });

      if (questsError) throw questsError;

      // 2. Fetch member progress
      const { data: memberQuestsData, error: mqError } = await supabase
        .from("member_quests")
        .select("*")
        .eq("member_id", member.id);

      if (mqError) throw mqError;

      // 3. Combine data
      const combined = (questsData || []).map((quest: Quest) => {
        const progress = memberQuestsData?.find((mq: MemberQuest) => mq.quest_id === quest.id);
        return {
          ...quest,
          progress,
        };
      });

      setActiveQuests(combined);
    } catch (error: any) {
      toast.error(error.message || "Gagal memuat misi mingguan");
    } finally {
      setLoading(false);
    }
  }, [member.id]);

  useEffect(() => {
    const init = async () => {
      await handleResetIfNeeded();
      await fetchQuests();
    };
    init();
  }, [handleResetIfNeeded, fetchQuests]);

  const handleClaim = async (quest: Quest & { progress?: MemberQuest }) => {
    if (!quest.progress) return;
    
    setClaimingId(quest.id);
    try {
      // Update is_completed to true
      const { error: updateError } = await supabase
        .from("member_quests")
        .update({ is_completed: true })
        .eq("id", quest.progress.id);

      if (updateError) throw updateError;

      // Add points to member
      const newTotal = member.total_poin + quest.reward_points;
      const { error: memberError } = await supabase
        .from("members")
        .update({ total_poin: newTotal })
        .eq("id", member.id);

      if (memberError) throw memberError;

      // Catat di tabel transactions (Optional, tapi disarankan agar riwayat poin jelas)
      await supabase.from('transactions').insert([{ 
          member_id: member.id, 
          type: 'earning', 
          amount: quest.reward_points, 
          description: `Klaim Misi Mingguan: ${quest.name}`, 
      }]);

      toast.success(`Berhasil klaim ${quest.reward_points} poin!`);
      
      // Refresh
      fetchQuests();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Gagal mengklaim misi");
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 mb-6 flex justify-center py-10">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 mb-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="bg-orange-100 p-2.5 rounded-xl text-orange-600">
          <Target size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Misi Mingguan</h2>
          <p className="text-slate-500 text-sm">Selesaikan misi dan dapatkan poin!</p>
        </div>
      </div>

      <div className="space-y-4">
        {activeQuests.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Target size={40} className="mx-auto text-slate-300 mb-3" />
            <p>Belum ada misi minggu ini.</p>
          </div>
        ) : (
          activeQuests.map((quest) => {
            const progressCount = quest.progress ? quest.progress.current_progress : 0;
            const isCompleted = quest.progress ? quest.progress.is_completed : false;
            const progressPercent = Math.min((progressCount / quest.target_count) * 100, 100);
            const canClaim = progressCount >= quest.target_count && !isCompleted;

            return (
              <div key={quest.id} className={`p-4 rounded-2xl border ${isCompleted ? 'border-green-100 bg-green-50' : 'border-slate-200 bg-slate-50'} relative overflow-hidden transition-all hover:shadow-md`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="pr-16">
                    <h3 className="font-bold text-slate-800 mb-1">{quest.name}</h3>
                    {quest.description && (
                      <p className="text-xs text-slate-500">{quest.description}</p>
                    )}
                  </div>
                  <div className="absolute right-4 top-4 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-orange-100 text-orange-600 font-bold text-sm shadow-sm">
                    <Gift size={14} /> +{quest.reward_points}
                  </div>
                </div>

                {isCompleted ? (
                  <div className="flex items-center gap-2 text-green-600 font-bold text-sm mt-4 bg-green-100/50 p-2 rounded-xl justify-center">
                    <CheckCircle2 size={16} /> Misi Selesai
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                      <span>Progres</span>
                      <span>{progressCount} / {quest.target_count}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 mb-4 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>

                    {canClaim ? (
                      <button 
                        onClick={() => handleClaim(quest)}
                        disabled={claimingId === quest.id}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 shadow-lg shadow-orange-200"
                      >
                        {claimingId === quest.id ? <Loader2 className="animate-spin" size={18} /> : "Klaim Bonus Poin"}
                      </button>
                    ) : (
                      <div className="text-center text-xs text-slate-400 bg-white py-2 rounded-xl border border-slate-100">
                        Belum dapat diklaim
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

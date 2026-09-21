"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, LogOut, User, Wallet, Menu, X, Home, CalendarCheck, Users } from "lucide-react";
import { RewardView } from "@/components/views/member/RewardView";
import { CheckinView } from "@/components/views/member/CheckinView";
import { ReferralView } from "@/components/views/member/ReferralView";
import { MEMBER_SESSION_KEY } from "@/lib/constants";
import toast from "react-hot-toast"; // Import Toast

// Definisi Tipe Data
interface MemberData {
  id: number;
  nama: string;
  total_poin: number;
  referral_code: string | null;
  referred_by_id: number | null;
  stores?: { nama_toko: string };
}

export default function MemberPage() {
  const router = useRouter();
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'checkin' | 'referral'>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 1. Fetch Member
  const fetchMember = useCallback(
    async (id: number) => {
      try {
        const { data, error } = await supabase
          .from("members")
          .select("*, stores(nama_toko)")
          .eq("id", id)
          .single();

        if (error || !data) {
          sessionStorage.clear();
          router.replace("/");
        } else {
          setMember(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  // 2. Cek Session
  useEffect(() => {
    const sessionStr = sessionStorage.getItem(MEMBER_SESSION_KEY);
    if (!sessionStr) {
      router.replace("/");
    } else {
      try {
        const session = JSON.parse(sessionStr);
        fetchMember(session.id);
      } catch (e) {
        console.error("Invalid session data:", e);
        sessionStorage.clear();
        router.replace("/");
      }
    }
  }, [fetchMember, router]);

  // 3. LOGOUT HANDLER (Pakai Toast)
  const handleLogout = async () => {
    toast.success("Sampai jumpa lagi!");
    await new Promise((r) => setTimeout(r, 1000));
    sessionStorage.clear();
    router.replace("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className="min-h-screen bg-slate-100 font-poppins flex justify-center">
      <div className="w-full max-w-[480px] bg-slate-50 min-h-screen shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* MOBILE MENU OVERLAY */}
        {isMenuOpen && (
          <div className="absolute inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)}></div>
            <div className="relative w-64 bg-slate-900 h-full shadow-2xl flex flex-col p-6 animate-in slide-in-from-left duration-300">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                  <User size={20} className="text-indigo-400" /> Menu
                </h2>
                <button onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <button 
                  onClick={() => { setActiveTab('home'); setIsMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'home' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  <Home size={20} /> Beranda
                </button>
                <button 
                  onClick={() => { setActiveTab('checkin'); setIsMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'checkin' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  <CalendarCheck size={20} /> Check-in Harian
                </button>
                <button 
                  onClick={() => { setActiveTab('referral'); setIsMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'referral' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  <Users size={20} /> Ajak Teman
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="bg-slate-900 text-white pt-10 pb-20 px-6 rounded-b-[2.5rem] shadow-lg relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex gap-4 items-center">
              <button onClick={() => setIsMenuOpen(true)} className="bg-slate-800 p-2.5 rounded-xl hover:bg-slate-700 text-white transition border border-slate-700 shadow-md">
                <Menu size={20} />
              </button>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                  Member • {member.stores?.nama_toko || "Pusat"}
                </p>
                <h1 className="text-lg sm:text-xl font-bold truncate max-w-[160px]">{member.nama}</h1>
              </div>
            </div>

            {/* BUTTON LOGOUT */}
            <button
              onClick={handleLogout}
              className="bg-slate-800 p-2.5 rounded-xl hover:bg-red-600 hover:text-white text-slate-400 transition border border-slate-700"
              title="Keluar Aplikasi"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 px-5 -mt-14 pb-10 z-20 relative overflow-y-auto">
          {activeTab === 'home' ? (
            <>
              {/* KARTU SALDO */}
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 mb-6 text-center relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                    <Wallet size={14} /> Poin saat ini:
                  </p>
                  <h2 className="text-6xl font-black text-slate-800 tracking-tighter">
                    {member.total_poin}
                  </h2>
                </div>
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-indigo-50 rounded-full opacity-50" />
                <div className="absolute -left-8 -top-8 w-32 h-32 bg-indigo-50 rounded-full opacity-50" />
              </div>

              <RewardView member={member} onUpdate={() => fetchMember(member.id)} />
            </>
          ) : activeTab === 'checkin' ? (
            <CheckinView member={member} onUpdate={() => fetchMember(member.id)} />
          ) : (
            <ReferralView member={member} onUpdate={() => fetchMember(member.id)} />
          )}
        </div>
      </div>
    </div>
  );
}

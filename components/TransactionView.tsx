"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
// PERBAIKAN: Tambahkan 'Gift' ke dalam import
import { Search, Loader2, CheckCircle, QrCode, ShoppingCart, Gift } from "lucide-react";
import { Button } from "@/components/ui/Button"; 
import toast from "react-hot-toast";

export default function TransactionView({ session }: any) {
    const [hp, setHp] = useState("");
    const [belanja, setBelanja] = useState("");
    const [poin, setPoin] = useState(0);
    const [memberData, setMemberData] = useState<any>(null);
    const [loadingCari, setLoadingCari] = useState(false);
    const [loadingSimpan, setLoadingSimpan] = useState(false);
    const [divisor, setDivisor] = useState(25000);
    const [showSuccess, setShowSuccess] = useState(false);
    
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch Divisor (Nilai Poin)
    useEffect(() => { 
        supabase.from('settings').select('value').eq('key', 'poin_divisor').single()
            .then(({ data }) => { if(data) setDivisor(parseInt(data.value)); });
        if(inputRef.current) inputRef.current.focus();
    }, []);

    // Auto Search Logic (Scanner Optimization)
    useEffect(() => {
        if(hp.length >= 10 && !memberData && !loadingCari) {
            const timeout = setTimeout(() => cariMember(), 800);
            return () => clearTimeout(timeout);
        }
    }, [hp]);

    const hitung = (val: string) => { 
        setBelanja(val); 
        setPoin(Math.floor((parseInt(val)||0) / divisor)); 
    }
    
    const cariMember = async () => {
        if(!hp) return; 
        setLoadingCari(true); 
        setMemberData(null); 
        setBelanja("");
        
        // Cek Member (Global, tanpa filter store_id agar member lintas cabang bisa belanja)
        const { data, error } = await supabase.from('members').select('*, referred_by_id').eq('no_hp', hp).single();
        
        if (data) setMemberData(data);
        setLoadingCari(false);
    }

    const processTransaction = async () => {
        if(!memberData || !belanja) {
            toast.error("Data belum lengkap!");
            return;
        }
        setLoadingSimpan(true);
        
        try {
            const newTotalPoin = memberData.total_poin + poin;
            
            // Update Poin Member
            await supabase.from('members').update({ total_poin: newTotalPoin }).eq('id', memberData.id);
            
            // Catat Transaksi Belanja
            await supabase.from('transactions').insert([{ 
                member_id: memberData.id, 
                type: 'earning', 
                amount: poin, 
                description: `Belanja Rp ${parseInt(belanja).toLocaleString()}`, 
                store_id: session.storeId
            }]);

            // ============================================
            // LOGIKA BONUS REFERRAL (TRANSAKSI PERTAMA)
            // ============================================
            if (memberData.referred_by_id) {
                // Cek apakah ini transaksi pertama (sebelum transaksi ini, belum ada riwayat)
                const { count } = await supabase
                    .from('transactions')
                    .select('id', { count: 'exact', head: true })
                    .eq('member_id', memberData.id)
                    .eq('type', 'earning');
                
                // count === 1 berarti hanya transaksi yang baru saja dimasukkan di atas
                if (count === 1) {
                    // Ambil pengaturan referral
                    const { data: refSettings } = await supabase
                        .from('referral_settings')
                        .select('*')
                        .limit(1)
                        .single();

                    if (refSettings) {
                        const bonusNewMember = refSettings.bonus_points_for_new_member || 0;
                        const bonusReferrer = refSettings.bonus_points_for_referrer || 0;

                        // --- Bonus untuk Member Baru ---
                        if (bonusNewMember > 0) {
                            const updatedPoin = newTotalPoin + bonusNewMember;
                            await supabase.from('members').update({ total_poin: updatedPoin }).eq('id', memberData.id);
                            await supabase.from('transactions').insert([{
                                member_id: memberData.id,
                                type: 'earning',
                                amount: bonusNewMember,
                                description: 'Bonus Referral (Member Baru)',
                                store_id: session.storeId
                            }]);
                            // Update local data agar modal success menampilkan poin terbaru
                            memberData.total_poin = updatedPoin;
                        }

                        // --- Bonus untuk Pengajak ---
                        if (bonusReferrer > 0) {
                            const { data: referrer } = await supabase
                                .from('members')
                                .select('id, total_poin')
                                .eq('id', memberData.referred_by_id)
                                .single();

                            if (referrer) {
                                const referrerNewPoin = referrer.total_poin + bonusReferrer;
                                await supabase.from('members').update({ total_poin: referrerNewPoin }).eq('id', referrer.id);
                                await supabase.from('transactions').insert([{
                                    member_id: referrer.id,
                                    type: 'earning',
                                    amount: bonusReferrer,
                                    description: `Bonus Mengajak Teman (${memberData.nama})`,
                                    store_id: session.storeId
                                }]);
                            }
                        }

                        toast.success(`🎉 Bonus referral berhasil diberikan!`);
                    }
                }
            }

            // ============================================
            // LOGIKA UPDATE MISI MINGGUAN
            // ============================================
            try {
                // 1. Ambil misi yang aktif
                const { data: activeQuests } = await supabase.from('quests').select('*').eq('is_active', true);
                if (activeQuests && activeQuests.length > 0) {
                    // 2. Ambil progres member saat ini
                    const { data: memberQuests } = await supabase.from('member_quests').select('*').eq('member_id', memberData.id);
                    
                    for (const quest of activeQuests) {
                        const existingMq = memberQuests?.find((mq: any) => mq.quest_id === quest.id);
                        if (existingMq) {
                            if (!existingMq.is_completed) {
                                await supabase.from('member_quests').update({ current_progress: existingMq.current_progress + 1 }).eq('id', existingMq.id);
                            }
                        } else {
                            await supabase.from('member_quests').insert([{
                                member_id: memberData.id,
                                quest_id: quest.id,
                                current_progress: 1,
                                is_completed: false
                            }]);
                        }
                    }
                }
            } catch (questErr) {
                console.error("Gagal update progres misi:", questErr);
            }

            setMemberData({ ...memberData, total_poin: memberData.total_poin || newTotalPoin });
            setLoadingSimpan(false); 
            setShowSuccess(true);
        } catch (err: any) {
            console.error(err);
            toast.error("Gagal menyimpan transaksi: " + err.message);
            setLoadingSimpan(false);
        }
    }

    const closeSuccess = () => { 
        setShowSuccess(false); setMemberData(null); setHp(""); setBelanja(""); setPoin(0); 
        if(inputRef.current) inputRef.current.focus(); 
    }
  
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-lg mx-auto animate-in fade-in relative overflow-hidden">
        
        {/* Header */}
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-50">
            <QrCode className="text-indigo-600"/> Input Transaksi
        </h2>
        
        {/* Step 1: Input Scan (Desain Compact) */}
        <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Scan QR / No HP Member</label>
            <div className="flex gap-2 relative">
                <div className="absolute left-4 top-3.5 text-slate-400"><Search size={20}/></div>
                <input 
                    ref={inputRef}
                    type="tel" 
                    className="flex-1 pl-12 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 tracking-wide transition-all"
                    placeholder="08..." 
                    value={hp} 
                    onChange={(e) => setHp(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && cariMember()} 
                />
                {loadingCari && <div className="absolute right-4 top-3.5"><Loader2 className="animate-spin text-indigo-600" size={20}/></div>}
            </div>
        </div>

        {/* Step 2: Result & Input Belanja */}
        {memberData ? (
            <div className="animate-in slide-in-from-bottom-4 fade-in">
                {/* Kartu Member Ringkas */}
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex justify-between items-center mb-6">
                    <div>
                        <p className="text-xs text-indigo-600 font-bold uppercase mb-1">Member Terdeteksi</p>
                        <p className="text-slate-800 font-bold text-lg">{memberData.nama}</p>
                        <p className="text-slate-500 text-xs">{memberData.no_hp}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400">Sisa Poin</p>
                        <p className="text-2xl font-black text-indigo-600">{memberData.total_poin}</p>
                    </div>
                </div>

                {/* Input Belanja */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Total Belanja (Rupiah)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-4 text-slate-400 font-bold">Rp</span>
                            <input 
                                type="number" 
                                className="w-full pl-12 p-3 border-2 border-slate-200 rounded-xl text-xl font-bold text-slate-800 focus:border-indigo-500 outline-none transition-colors" 
                                value={belanja} 
                                onChange={(e) => hitung(e.target.value)} 
                                placeholder="0" 
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Estimasi Poin */}
                    {parseInt(belanja) > 0 && (
                        <div className="flex justify-between items-center px-4 py-3 bg-green-50 border border-green-100 rounded-xl">
                            <span className="text-green-700 font-medium text-sm flex items-center gap-2">
                                <Gift size={16}/> Poin didapat
                            </span>
                            <span className="text-xl font-bold text-green-600">+{poin}</span>
                        </div>
                    )}

                    <Button 
                        onClick={processTransaction} 
                        isLoading={loadingSimpan}
                        disabled={!belanja || parseInt(belanja) <= 0} 
                        className="w-full py-4 text-base bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                    >
                        Simpan Transaksi
                    </Button>
                </div>
            </div>
        ) : (
            // Placeholder State
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300 shadow-sm">
                    <ShoppingCart size={24}/>
                </div>
                <p className="text-slate-400 text-sm">Silakan scan member untuk mulai.</p>
            </div>
        )}

        {/* Modal Success */}
        {showSuccess && (
             <div className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center text-center animate-in fade-in p-6">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-in zoom-in">
                    <CheckCircle size={40}/>
                </div>
                <h3 className="font-bold text-slate-800 text-2xl mb-2">Transaksi Sukses!</h3>
                <p className="text-slate-500 mb-8">Poin berhasil ditambahkan ke {memberData?.nama}</p>
                <Button onClick={closeSuccess} className="w-full bg-slate-900 text-white hover:bg-slate-800">
                    Transaksi Baru
                </Button>
            </div>
        )}
      </div>
    );
}

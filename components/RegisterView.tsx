"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth"; 
import { Input } from "@/components/ui/Input"; 
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import { hashData } from "@/lib/security"; 
import { UserPlus, Smartphone, Lock, User, Store, Gift } from "lucide-react";

export function RegisterView() {
  const { session } = useAuth(); // Ambil data sesi (termasuk storeId)
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nama: "", hp: "", pin: "", referralCode: "" });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validasi Session
    if (!session?.storeId) {
        alert("Gagal: ID Toko tidak ditemukan. Silakan login ulang.");
        setLoading(false);
        return;
    }

    if (form.pin.length < 4) {
      alert("PIN minimal 4 angka!");
      setLoading(false);
      return;
    }

    try {
      // 1. Cek duplikasi No HP
      const { data: existing } = await supabase
        .from("members")
        .select("id")
        .eq("no_hp", form.hp)
        .single();

      if (existing) {
        alert("❌ Nomor HP sudah terdaftar di sistem!");
        setLoading(false);
        return;
      }

      // 2. Validasi kode referral jika diisi
      let referrerId: number | null = null;

      if (form.referralCode.trim()) {
        const { data: referrer } = await supabase
          .from("members")
          .select("id")
          .eq("referral_code", form.referralCode.trim().toUpperCase())
          .single();

        if (!referrer) {
          alert("❌ Kode Referral tidak ditemukan! Periksa kembali kodenya.");
          setLoading(false);
          return;
        }

        referrerId = referrer.id;
      }

      // 3. Enkripsi PIN
      const hashedPin = await hashData(form.pin);

      // 4. Simpan member baru dengan STORE ID & REFERRAL
      const insertData: any = {
        nama: form.nama,
        no_hp: form.hp,
        pin: hashedPin, 
        store_id: session.storeId,
        total_poin: 0,
      };

      // Set referred_by_id jika ada kode referral valid
      if (referrerId) {
        insertData.referred_by_id = referrerId;
      }

      const { error } = await supabase.from("members").insert([insertData]);

      if (error) throw error;

      const successMsg = referrerId 
        ? `✅ Member berhasil didaftarkan di ${session.storeName} dengan referral!`
        : `✅ Member berhasil didaftarkan di ${session.storeName}!`;
      
      alert(successMsg);
      setForm({ nama: "", hp: "", pin: "", referralCode: "" });

    } catch (err: any) {
      console.error(err);
      alert("Gagal: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-lg animate-in fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="text-indigo-600" /> Registrasi Pelanggan
        </h2>
        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Store size={12}/> Mendaftarkan untuk: <span className="font-bold text-indigo-600">{session?.storeName}</span>
        </p>
      </div>
      
      <form onSubmit={handleRegister} className="space-y-4">
        {/* Input Nama */}
        <div className="relative">
            <User className="absolute top-9 left-3 text-slate-400" size={18}/>
            <Input 
                label="Nama Lengkap" 
                value={form.nama} 
                onChange={(e: any) => setForm({...form, nama: e.target.value})} 
                placeholder="Contoh: Budi Santoso"
                className="pl-10"
            />
        </div>

        {/* Input HP */}
        <div className="relative">
            <Smartphone className="absolute top-9 left-3 text-slate-400" size={18}/>
            <Input 
                label="Nomor WhatsApp" 
                type="tel"
                value={form.hp} 
                onChange={(e: any) => setForm({...form, hp: e.target.value})} 
                placeholder="0812..."
                className="pl-10"
            />
        </div>

        {/* Input PIN */}
        <div className="relative">
            <Lock className="absolute top-9 left-3 text-slate-400" size={18}/>
            <Input 
                label="Buat PIN Baru" 
                type="number"
                value={form.pin} 
                onChange={(e: any) => setForm({...form, pin: e.target.value})} 
                placeholder="Min. 4 Angka"
                className="pl-10"
            />
        </div>

        {/* Input Kode Referral (Opsional) */}
        <div className="relative">
            <Gift className="absolute top-9 left-3 text-slate-400" size={18}/>
            <Input 
                label="Kode Referral (Opsional)" 
                type="text"
                value={form.referralCode} 
                onChange={(e: any) => setForm({...form, referralCode: e.target.value})} 
                placeholder="Contoh: BUD1234"
                className="pl-10"
            />
            <p className="text-[10px] text-slate-400 mt-1 ml-1">Kosongkan jika tidak ada kode referral</p>
        </div>

        <Button type="submit" isLoading={loading} className="w-full mt-4 py-4">
            Simpan Data Member
        </Button>
      </form>
    </div>
  );
}

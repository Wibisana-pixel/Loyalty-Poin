"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ReferralSettings } from "@/types";
import { Loader2, UsersRound, Save } from "lucide-react";
import toast from "react-hot-toast";

export function ReferralSettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [form, setForm] = useState({
    bonus_points_for_referrer: 0,
    bonus_points_for_new_member: 0,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("referral_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setForm({
          bonus_points_for_referrer: data.bonus_points_for_referrer,
          bonus_points_for_new_member: data.bonus_points_for_new_member,
        });
      }
    } catch (error: any) {
      toast.error("Gagal mengambil pengaturan referral.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!settings) {
      toast.error("Data pengaturan tidak ditemukan.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("referral_settings")
        .update({
          bonus_points_for_referrer: form.bonus_points_for_referrer,
          bonus_points_for_new_member: form.bonus_points_for_new_member,
        })
        .eq("id", settings.id);

      if (error) throw error;

      toast.success("Pengaturan referral berhasil diperbarui!");
      fetchSettings();
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-12 flex justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-slate-100">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
          <UsersRound size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pengaturan Referral</h2>
          <p className="text-slate-500">Atur bonus poin untuk sistem ajak teman</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-md space-y-6">
        {/* Bonus Pengajak */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Bonus Poin untuk Pengajak
          </label>
          <p className="text-xs text-slate-400 mb-2">
            Poin yang didapat member yang mengajak temannya
          </p>
          <input
            type="number"
            min="0"
            value={form.bonus_points_for_referrer}
            onChange={(e) =>
              setForm({ ...form, bonus_points_for_referrer: parseInt(e.target.value) || 0 })
            }
            className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-lg font-bold text-slate-800"
            required
          />
        </div>

        {/* Bonus Member Baru */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Bonus Poin untuk Member Baru
          </label>
          <p className="text-xs text-slate-400 mb-2">
            Poin yang didapat member baru yang menggunakan kode referral
          </p>
          <input
            type="number"
            min="0"
            value={form.bonus_points_for_new_member}
            onChange={(e) =>
              setForm({ ...form, bonus_points_for_new_member: parseInt(e.target.value) || 0 })
            }
            className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-lg font-bold text-slate-800"
            required
          />
        </div>

        {/* Preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-slate-600 mb-2">Preview Teks Member:</p>
          <p className="text-sm text-slate-500 italic">
            &ldquo;Ajak teman daftar member, kamu dapat{" "}
            <span className="font-bold text-indigo-600">{form.bonus_points_for_referrer} Poin</span>,
            temanmu dapat{" "}
            <span className="font-bold text-emerald-600">{form.bonus_points_for_new_member} Poin</span>!&rdquo;
          </p>
        </div>

        {/* Info */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p className="text-xs text-amber-700">
            ⚠️ Bonus poin baru diberikan saat member baru melakukan <b>transaksi pertama</b> di toko,
            bukan saat mendaftar. Ini untuk mencegah penyalahgunaan sistem referral.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition flex justify-center items-center gap-2 disabled:bg-slate-400"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Simpan Pengaturan
        </button>
      </form>
    </div>
  );
}

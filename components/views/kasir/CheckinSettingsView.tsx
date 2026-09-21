"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CheckinReward } from "@/types";
import { Loader2, Plus, Trash2, CalendarCheck } from "lucide-react";
import toast from "react-hot-toast";

export function CheckinSettingsView() {
  const [rewards, setRewards] = useState<CheckinReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [dayNumber, setDayNumber] = useState<string>("");
  const [rewardPoints, setRewardPoints] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("checkin_rewards")
        .select("*")
        .order("day_number", { ascending: true });

      if (error) throw error;
      setRewards(data || []);
    } catch (error: any) {
      toast.error(error.message || "Gagal mengambil data reward.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    const day = parseInt(dayNumber);
    const points = parseInt(rewardPoints);

    if (!day || !points || day < 1 || day > 30) {
      toast.error("Hari harus antara 1 - 30 dan poin harus valid.");
      return;
    }

    // Check if day already exists
    if (rewards.some(r => r.day_number === day)) {
      toast.error(`Reward untuk hari ke-${day} sudah ada.`);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("checkin_rewards")
        .insert([{
          day_number: day,
          reward_points: points,
          description: description || `Hadiah check-in hari ke-${day}`
        }]);

      if (error) throw error;

      toast.success("Reward berhasil ditambahkan!");
      setDayNumber("");
      setRewardPoints("");
      setDescription("");
      fetchRewards();
    } catch (error: any) {
      toast.error(error.message || "Gagal menambah reward.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus reward ini?")) return;

    try {
      const { error } = await supabase
        .from("checkin_rewards")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Reward dihapus.");
      fetchRewards();
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus reward.");
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-slate-100">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
          <CalendarCheck size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pengaturan Check-in</h2>
          <p className="text-slate-500">Atur hadiah poin untuk check-in harian member</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* FORM TAMBAH REWARD */}
        <div className="md:col-span-1">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Plus size={18} /> Tambah Hadiah
            </h3>
            <form onSubmit={handleAddReward} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Hari Ke-</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={dayNumber}
                  onChange={(e) => setDayNumber(e.target.value)}
                  placeholder="Contoh: 5"
                  className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Jumlah Poin</label>
                <input
                  type="number"
                  min="1"
                  value={rewardPoints}
                  onChange={(e) => setRewardPoints(e.target.value)}
                  placeholder="Contoh: 100"
                  className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Deskripsi (Opsional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Hadiah spesial hari ke-5"
                  className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition flex justify-center items-center gap-2 disabled:bg-slate-400"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : "Simpan Hadiah"}
              </button>
            </form>
          </div>
        </div>

        {/* DAFTAR REWARD */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-sm">
                    <th className="p-4 font-bold border-b border-slate-200">Hari Ke-</th>
                    <th className="p-4 font-bold border-b border-slate-200">Poin Hadiah</th>
                    <th className="p-4 font-bold border-b border-slate-200">Deskripsi</th>
                    <th className="p-4 font-bold border-b border-slate-200 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center">
                        <Loader2 className="animate-spin text-indigo-600 mx-auto" size={24} />
                      </td>
                    </tr>
                  ) : rewards.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        Belum ada pengaturan hadiah check-in.
                      </td>
                    </tr>
                  ) : (
                    rewards.map((reward) => (
                      <tr key={reward.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition">
                        <td className="p-4 font-bold text-slate-800">Hari {reward.day_number}</td>
                        <td className="p-4 font-semibold text-indigo-600">+{reward.reward_points} Poin</td>
                        <td className="p-4 text-slate-500 text-sm">{reward.description}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDelete(reward.id)}
                            className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

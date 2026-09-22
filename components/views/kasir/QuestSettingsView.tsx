"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Quest } from "@/types";
import { Loader2, Plus, Trash2, Target, Check, X } from "lucide-react";
import toast from "react-hot-toast";

export function QuestSettingsView() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [targetCount, setTargetCount] = useState<string>("");
  const [rewardPoints, setRewardPoints] = useState<string>("");

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quests")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;
      setQuests(data || []);
    } catch (error: any) {
      toast.error(error.message || "Gagal mengambil data misi.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(targetCount);
    const reward = parseInt(rewardPoints);

    if (!name || !target || !reward || target < 1 || reward < 1) {
      toast.error("Nama, Target (min 1), dan Poin (min 1) harus diisi dengan benar.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("quests")
        .insert([{
          name,
          description,
          target_count: target,
          reward_points: reward,
          is_active: true
        }]);

      if (error) throw error;

      toast.success("Misi berhasil ditambahkan!");
      setName("");
      setDescription("");
      setTargetCount("");
      setRewardPoints("");
      fetchQuests();
    } catch (error: any) {
      toast.error(error.message || "Gagal menambah misi.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("quests")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(currentStatus ? "Misi dinonaktifkan" : "Misi diaktifkan");
      fetchQuests();
    } catch (error: any) {
      toast.error(error.message || "Gagal mengubah status misi.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus misi ini? Semua progres member untuk misi ini juga akan hilang (Cascade) atau error jika ada relasi.")) return;

    try {
      const { error } = await supabase
        .from("quests")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Misi dihapus.");
      fetchQuests();
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus misi.");
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-slate-100 animate-in fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
          <Target size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pengaturan Misi Mingguan</h2>
          <p className="text-slate-500">Buat tantangan berhadiah poin untuk member</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* FORM TAMBAH MISI */}
        <div className="md:col-span-1">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Plus size={18} /> Tambah Misi Baru
            </h3>
            <form onSubmit={handleAddQuest} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Nama Misi</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Belanja 3x Minggu Ini"
                  className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Deskripsi (Opsional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan lebih detail..."
                  className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 transition resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Target Transaksi (Jumlah)</label>
                <input
                  type="number"
                  min="1"
                  value={targetCount}
                  onChange={(e) => setTargetCount(e.target.value)}
                  placeholder="Contoh: 3"
                  className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Hadiah Poin</label>
                <input
                  type="number"
                  min="1"
                  value={rewardPoints}
                  onChange={(e) => setRewardPoints(e.target.value)}
                  placeholder="Contoh: 50"
                  className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition flex justify-center items-center gap-2 disabled:bg-slate-400"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : "Simpan Misi"}
              </button>
            </form>
          </div>
        </div>

        {/* DAFTAR MISI */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-sm">
                    <th className="p-4 font-bold border-b border-slate-200">Misi & Detail</th>
                    <th className="p-4 font-bold border-b border-slate-200">Target</th>
                    <th className="p-4 font-bold border-b border-slate-200">Hadiah</th>
                    <th className="p-4 font-bold border-b border-slate-200 text-center">Status</th>
                    <th className="p-4 font-bold border-b border-slate-200 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center">
                        <Loader2 className="animate-spin text-orange-500 mx-auto" size={24} />
                      </td>
                    </tr>
                  ) : quests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Belum ada misi mingguan yang dibuat.
                      </td>
                    </tr>
                  ) : (
                    quests.map((quest) => (
                      <tr key={quest.id} className={`hover:bg-slate-50 border-b border-slate-100 last:border-0 transition ${!quest.is_active && 'opacity-60'}`}>
                        <td className="p-4">
                            <p className="font-bold text-slate-800">{quest.name}</p>
                            {quest.description && <p className="text-xs text-slate-500 truncate max-w-[150px]" title={quest.description}>{quest.description}</p>}
                        </td>
                        <td className="p-4 font-semibold text-slate-600">{quest.target_count}x</td>
                        <td className="p-4 font-bold text-orange-500">+{quest.reward_points}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleActive(quest.id, quest.is_active)}
                            className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 transition ${
                              quest.is_active 
                                ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' 
                                : 'bg-slate-100 text-slate-500 hover:bg-green-100 hover:text-green-700'
                            }`}
                            title={quest.is_active ? "Nonaktifkan" : "Aktifkan"}
                          >
                            {quest.is_active ? <><Check size={12}/> Aktif</> : <><X size={12}/> Nonaktif</>}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDelete(quest.id)}
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

"use client";

import { useEffect, useState } from "react";

interface FontCdnLink {
  id: number;
  font_name: string;
  cdn_link: string;
}

export default function FontsPage() {
  const [fonts, setFonts] = useState<FontCdnLink[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [fontName, setFontName] = useState("");
  const [cdnLink, setCdnLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFonts();
  }, []);

  const fetchFonts = async () => {
    const res = await fetch("/api/font-cdn-links");
    const json = await res.json();
    if (json.success) setFonts(json.data);
    setLoading(false);
  };

  const handleAddFont = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fontName.trim() || !cdnLink.trim()) return;

    setSubmitting(true);
    const res = await fetch("/api/font-cdn-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        font_name: fontName.trim(),
        cdn_link: cdnLink.trim(),
      }),
    });

    const json = await res.json();
    if (json.success) {
      setFontName("");
      setCdnLink("");
      setShowModal(false);
      fetchFonts();
    } else {
      alert(json.error || "Failed to save font");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this font CDN link?")) return;
    const res = await fetch(`/api/font-cdn-links/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (json.success) fetchFonts();
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Fonts</h1>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-black text-white rounded"
        >
          Add Font
        </button>
      </div>

      {/* Table */}
      <div className="border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3">Font Name</th>
              <th className="text-left p-3">CDN Link</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {fonts.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">
                  No fonts found
                </td>
              </tr>
            )}

            {fonts.map((font) => (
              <tr key={font.id} className="border-t">
                <td className="p-3">{font.font_name}</td>
                <td className="p-3 text-gray-600 break-all">
                  {font.cdn_link}
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => handleDelete(font.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Add Font</h2>

            <form onSubmit={handleAddFont} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Font Name</label>
                <input
                  value={fontName}
                  onChange={(e) => setFontName(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm mb-1">CDN Link</label>
                <input
                  value={cdnLink}
                  onChange={(e) => setCdnLink(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-black text-white rounded"
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

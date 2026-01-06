'use client';

import { useEffect, useState } from 'react';

interface Color {
    id: number;
    name: string;
    hex_code: string;
}

export default function ColorManagement() {
    const [colors, setColors] = useState<Color[]>([]);
    const [loading, setLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState({ name: '', hex_code: '#000000' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchColors();
    }, []);

    const fetchColors = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/colors');
            const json = await res.json();
            if (json.success) setColors(json.data);
        } catch {
            setError('Failed to load colors');
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => {
        setForm({ name: '', hex_code: '#000000' });
        setEditingId(null);
        setDrawerOpen(true);
    };

    const openEdit = (c: Color) => {
        setForm({ name: c.name, hex_code: c.hex_code });
        setEditingId(c.id);
        setDrawerOpen(true);
    };

    const closeDrawer = () => {
        setDrawerOpen(false);
        setError('');
    };

    const saveColor = async () => {
        if (!form.name.trim()) {
            setError('Color name is required');
            return;
        }

        if (!/^#[0-9A-F]{6}$/i.test(form.hex_code)) {
            setError('Invalid hex code');
            return;
        }

        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `/api/colors/${editingId}` : '/api/colors';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const json = await res.json();
            if (!json.success) throw new Error(json.error);

            setSuccess(editingId ? 'Color updated' : 'Color added');
            fetchColors();
            closeDrawer();
            setTimeout(() => setSuccess(''), 2500);
        } catch (e: any) {
            setError(e.message || 'Failed to save');
        }
    };

    const deleteColor = async (id: number) => {
        if (!confirm('Delete this color?')) return;

        try {
            const res = await fetch(`/api/colors/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);

            setSuccess('Color deleted');
            fetchColors();
            setTimeout(() => setSuccess(''), 2500);
        } catch (e: any) {
            setError(e.message || 'Delete failed');
        }
    };

    return (
        <div className="relative min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-gray-50 pb-4 mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Colors</h1>
                <button
                    onClick={openAdd}
                    className="px-5 py-2 rounded-lg bg-[#d18b47] text-white font-medium hover:bg-blue-700"
                >
                    + Add Color
                </button>
            </div>

            {/* Alerts */}
            {success && (
                <div className="fixed top-6 right-6 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
                    {success}
                </div>
            )}
            {error && (
                <div className="fixed top-6 right-6 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
                    {error}
                </div>
            )}

            {/* Content */}
            {/* TABLE VIEW */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : colors.length === 0 ? (
                <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-600">
                    No colors found. Add your first color.
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
                    <table className="min-w-full border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                    Preview
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                    Name
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                    Hex Code
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y">
                            {colors.map((color) => (
                                <tr
                                    key={color.id}
                                    className="hover:bg-gray-50 transition"
                                >
                                    {/* Preview */}
                                    <td className="px-4 py-3">
                                        <div
                                            className="w-8 h-8 rounded-md border"
                                            style={{ backgroundColor: color.hex_code }}
                                        />
                                    </td>

                                    {/* Name */}
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {color.name}
                                    </td>

                                    {/* Hex */}
                                    <td className="px-4 py-3 font-mono text-sm text-gray-600">
                                        {color.hex_code}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 text-right">
                                        <div className="inline-flex gap-2">
                                            <button
                                                onClick={() => openEdit(color)}
                                                className="px-3 py-1.5 text-sm rounded-md bg-blue-200 text-white hover:bg-blue-300"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => deleteColor(color.id)}
                                                className="px-3 py-1.5 text-sm rounded-md bg-red-500 text-white hover:bg-red-600"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Drawer */}
            {drawerOpen && (
                <div className="fixed inset-0 z-30 flex">
                    <div className="flex-1 bg-black/30" onClick={closeDrawer} />
                    <div className="w-full max-w-md bg-white p-6 shadow-xl space-y-5">
                        <h2 className="text-xl font-semibold">
                            {editingId ? 'Edit Color' : 'Add Color'}
                        </h2>

                        <div>
                            <label className="text-sm font-medium">Name</label>
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="text-sm font-medium">Hex</label>
                                <input
                                    value={form.hex_code}
                                    onChange={(e) => setForm({ ...form, hex_code: e.target.value })}
                                    className="mt-1 w-full rounded-lg border px-3 py-2 font-mono"
                                />
                            </div>
                            <input
                                type="color"
                                value={form.hex_code}
                                onChange={(e) => setForm({ ...form, hex_code: e.target.value })}
                                className="h-10 w-10 cursor-pointer"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={saveColor}
                                className="flex-1 rounded-lg bg-[#d18b47] text-white py-2 hover:bg-[#b3773a]"
                            >
                                Save
                            </button>
                            <button
                                onClick={closeDrawer}
                                className="flex-1 rounded-lg bg-gray-200 py-2 hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

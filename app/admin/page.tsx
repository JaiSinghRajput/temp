'use client';
import { useEffect, useState } from 'react';
import axiosInstance from '@/lib/axios';
import { AdminHeader } from '@/components/admin/admin-header';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

interface DashboardStats {
  totalUsers: number;
  totalTemplates: number;
  totalUserCards: number;
  totalEVideoTemplates: number;
  totalCategories: number;
  totalVideoCategories: number;
  eVideoRequests: {
    new: number;
    in_progress: number;
    done: number;
    cancelled: number;
  };
  recentCards: any[];
  recentRequests: any[];
  userGrowth: any[];
  cardsCreated: any[];
  templateUsage: any[];
  categoryDistribution: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await axiosInstance.get('/api/admin/dashboard');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title="Admin Dashboard"
        subtitle="Overview of your e-card and e-video business"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            icon="👥"
            color="bg-blue-500"
          />
          <StatCard
            title="E-Card Templates"
            value={stats?.totalTemplates || 0}
            icon="🎨"
            color="bg-green-500"
          />
          <StatCard
            title="User Cards Created"
            value={stats?.totalUserCards || 0}
            icon="💌"
            color="bg-purple-500"
          />
          <StatCard
            title="E-Video Templates"
            value={stats?.totalEVideoTemplates || 0}
            icon="🎬"
            color="bg-pink-500"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Card Categories"
            value={stats?.totalCategories || 0}
            icon="📁"
            color="bg-yellow-500"
          />
          <StatCard
            title="Video Categories"
            value={stats?.totalVideoCategories || 0}
            icon="🎥"
            color="bg-indigo-500"
          />
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-4">E-Video Requests</h3>
            <div className="space-y-2">
              <RequestStatusBadge label="New" count={stats?.eVideoRequests.new || 0} color="blue" />
              <RequestStatusBadge label="In Progress" count={stats?.eVideoRequests.in_progress || 0} color="yellow" />
              <RequestStatusBadge label="Done" count={stats?.eVideoRequests.done || 0} color="green" />
              <RequestStatusBadge label="Cancelled" count={stats?.eVideoRequests.cancelled || 0} color="red" />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats?.userGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Cards Created Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cards Created (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats?.cardsCreated || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Template Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Template Usage */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Templates by Usage</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.templateUsage || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="usage_count" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Templates by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.categoryDistribution || []}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                >
                  {(stats?.categoryDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent User Cards */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent User Cards</h3>
            <div className="space-y-3">
              {stats?.recentCards && stats.recentCards.length > 0 ? (
                stats.recentCards.map((card: any) => (
                  <div key={card.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{card.user_name || 'Anonymous'}</p>
                      <p className="text-xs text-gray-500">{card.template_name}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(card.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No recent cards</p>
              )}
            </div>
          </div>

          {/* Recent E-Video Requests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent E-Video Requests</h3>
            <div className="space-y-3">
              {stats?.recentRequests && stats.recentRequests.length > 0 ? (
                stats.recentRequests.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{req.requester_name}</p>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                        req.status === 'new' ? 'bg-blue-100 text-blue-700' :
                        req.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                        req.status === 'done' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No recent requests</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value.toLocaleString()}</p>
        </div>
        <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function RequestStatusBadge({ label, count, color }: { label: string; count: number; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
        {count}
      </span>
    </div>
  );
}

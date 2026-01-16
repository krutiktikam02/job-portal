import React from 'react';
import DashboardAnalytics from './DashboardAnalytics.jsx';
import DashboardKpis from './DashboardKpis.jsx';
import { getDashboardStats } from '../utils/api';

function Card({ title, value, className = '' }) {
  return (
    <div className={`bg-white p-4 rounded shadow-sm ${className}`}>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function Dashboard() {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
        <div className="text-center text-gray-600">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
        <div className="bg-red-50 text-red-600 p-4 rounded">
          Error loading dashboard: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>

      {/* 1. TOP STATS CARDS */}
      <DashboardKpis stats={stats} loading={loading} />

      {/* 2. ANALYTICS CHARTS (Added Here) */}
      <DashboardAnalytics />

      {/* 3. RECENT ACTIVITY TABLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        
        {/* Recent Jobs Table */}
        <section className="bg-white p-4 rounded shadow-sm">
          <h2 className="text-lg font-medium mb-3">Recent Jobs</h2>
          <div className="space-y-3">
            {stats?.recentJobs?.map(job => (
              <div key={job.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <div className="font-medium">{job.title}</div>
                  <div className="text-sm text-gray-500">{job.company_name}</div>
                </div>
                <div className="text-sm text-gray-600">
                  {formatDate(job.created_at)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Applications Table */}
        <section className="bg-white p-4 rounded shadow-sm">
          <h2 className="text-lg font-medium mb-3">Recent Applications</h2>
          <div className="space-y-3">
            {stats?.recentApplications?.map(app => (
              <div key={app.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <div className="font-medium">{app.applicant_name}</div>
                  <div className="text-sm text-gray-500">Applied for: {app.title}</div>
                </div>
                <div className="text-sm text-gray-600">
                  {formatDate(app.created_at)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
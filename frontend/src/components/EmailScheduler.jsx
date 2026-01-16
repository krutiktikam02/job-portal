// components/EmailScheduler.jsx
import React, { useState } from 'react';

const EmailScheduler = ({ 
  to = '', 
  subject = 'Interview Scheduled', 
  message = 'Your interview has been scheduled.',
}) => {
  const [email, setEmail] = useState(to);
  const [subj, setSubj] = useState(subject);
  const [msg, setMsg] = useState(message);
  const [cron, setCron] = useState(''); // Empty = send now
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const cronPresets = {
    'Tomorrow 9 AM': '0 9 * * *',
    'In 2 days 10 AM': '0 10 * * *',
    'Every Monday 9 AM': '0 9 * * 1',
    'Every 3 hours': '0 */3 * * *',
  };

  const sendEmail = async (isNow = false) => {
    if (!email || !subj || !msg) {
      alert('Please fill To, Subject, and Message');
      return;
    }

    if (!isNow && !cron) {
      alert('Please select a schedule');
      return;
    }

    setLoading(true);
    setResult(null);

    const payload = { to: email, subject: subj, text: msg };
    if (!isNow) payload.cronExpression = cron;

    const endpoint = isNow 
      ? `${API_URL}/api/email/send-now`
      : `${API_URL}/api/email/schedule-email`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, data });
        alert(isNow ? 'Email sent!' : `Scheduled! ID: ${data.scheduledId}`);
      } else {
        throw new Error(data.error || 'Failed');
      }
    } catch (err) {
      setResult({ success: false, error: err.message });
      alert('Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: '24px',
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      maxWidth: '520px',
      margin: '20px auto',
      backgroundColor: '#fafafa',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: '600', color: '#1a1a1a' }}>
        Send Interview Email
      </h3>

      {/* To */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: '#333' }}>To:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="candidate@example.com"
          style={inputStyle}
        />
      </div>

      {/* Subject */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: '#333' }}>Subject:</label>
        <input
          type="text"
          value={subj}
          onChange={(e) => setSubj(e.target.value)}
          placeholder="Interview Scheduled"
          style={inputStyle}
        />
      </div>

      {/* Message */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: '#333' }}>Message:</label>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows="4"
          placeholder="Your interview is scheduled for..."
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Schedule */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
          Schedule (optional):
        </label>
        <select
          value={cron}
          onChange={(e) => setCron(e.target.value)}
          style={inputStyle}
        >
          <option value="">Send Now (default)</option>
          {Object.entries(cronPresets).map(([label, value]) => (
            <option key={value} value={value}>{label}</option>
          ))}
          <option value="custom">Custom (cron)</option>
        </select>
        {cron === 'custom' && (
          <input
            type="text"
            placeholder="e.g. 0 9 * * 1"
            onChange={(e) => setCron(e.target.value)}
            style={{ ...inputStyle, marginTop: '8px' }}
          />
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => sendEmail(true)}
          disabled={loading}
          style={btnStyle('green', loading)}
        >
          {loading ? 'Sending...' : 'Send Now'}
        </button>
        <button
          onClick={() => sendEmail(false)}
          disabled={loading || !cron}
          style={btnStyle('blue', loading || !cron)}
        >
          {loading ? 'Scheduling...' : 'Schedule'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {result.success ? (
            <div style={{ color: '#1a7f37', background: '#f0fdf4', padding: '10px', borderRadius: '6px' }}>
              Success! {result.data.messageId ? 'Sent immediately.' : `Scheduled (ID: ${result.data.scheduledId})`}
            </div>
          ) : (
            <div style={{ color: '#d32f2f', background: '#fff1f0', padding: '10px', borderRadius: '6px' }}>
              Error: {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #d0d5dd',
  fontSize: '14px',
  backgroundColor: '#fff',
  transition: 'border 0.2s',
};

const btnStyle = (color, disabled) => ({
  flex: 1,
  padding: '12px',
  border: 'none',
  borderRadius: '8px',
  color: 'white',
  fontWeight: '600',
  fontSize: '15px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  backgroundColor: disabled 
    ? '#9ca3af' 
    : (color === 'green' ? '#16a34a' : '#2563eb'),
  opacity: disabled ? 0.7 : 1,
  transition: 'all 0.2s'
});

export default EmailScheduler;
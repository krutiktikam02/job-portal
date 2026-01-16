import React, { useState } from 'react';
import { adminApi } from '../utils/adminApi';

export default function SendEmail() {
  // Email account selection
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(() => {
    return localStorage.getItem('selectedEmailAccount') || 'account1';
  });
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [formData, setFormData] = useState(() => {
    // Load saved email template from localStorage
    const savedTemplate = localStorage.getItem('adminEmailTemplate');
    if (savedTemplate) {
      try {
        return JSON.parse(savedTemplate);
      } catch (e) {
        console.error('Failed to load saved template:', e);
      }
    }
    // Default template if nothing saved
    return {
      recipients: '',
      subject: 'Discover Your Dream Job on Talent Corner Job Portal',
      message: `Dear Job Seeker,

We are excited to introduce you to Talent Corner Job Portal - your gateway to amazing career opportunities!

Why Join Us?
- Access to hundreds of job openings across various industries
- Direct connection with top recruiters
- Easy profile creation and resume upload
- Personalized job recommendations based on your skills

Visit our website: https://jobportal-talentcor.vercel.app

Upload Your Resume Today!
Create your profile and upload your resume to get discovered by recruiters looking for talent like you.

Do not miss out on great opportunities! Join thousands of successful candidates who found their dream jobs through our platform.

Best regards,
Talent Corner Team`
    };
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailList, setEmailList] = useState([]);
  const [emailError, setEmailError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [emailHistory, setEmailHistory] = useState(() => {
    const history = localStorage.getItem('adminEmailHistory');
    return history ? JSON.parse(history) : [];
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [currentTime, setCurrentTime] = useState(new Date().getTime()); // For live countdown
  const [showRateLimitWarning, setShowRateLimitWarning] = useState(() => {
    const savedRateLimit = localStorage.getItem(`rateLimitRetryTime_${selectedAccount}`);
    console.log('Checking saved rate limit on load:', savedRateLimit);
    if (savedRateLimit) {
      const retryTime = parseInt(savedRateLimit);
      const now = new Date().getTime();
      const shouldShow = now < retryTime;
      console.log('Rate limit check:', { retryTime, now, shouldShow, minutesRemaining: Math.ceil((retryTime - now) / 60000) });
      return shouldShow; // Show warning if time hasn't passed yet
    }
    return false;
  });
  const [rateLimitRetryTime, setRateLimitRetryTime] = useState(() => {
    const savedRateLimit = localStorage.getItem(`rateLimitRetryTime_${selectedAccount}`);
    if (savedRateLimit) {
      const retryTime = parseInt(savedRateLimit);
      const now = new Date().getTime();
      if (now < retryTime) {
        console.log('Restoring rate limit time:', new Date(retryTime).toLocaleTimeString());
        return retryTime; // Restore if time hasn't passed
      } else {
        console.log('Rate limit expired, cleaning up');
        localStorage.removeItem(`rateLimitRetryTime_${selectedAccount}`); // Clean up expired
      }
    }
    return null;
  });
  
  // New state for daily limits and progress tracking
  const [dailyEmailCount, setDailyEmailCount] = useState({ dailyCount: 0, remaining: 300, dailyLimit: 300 });
  const [showDailyLimitPopup, setShowDailyLimitPopup] = useState(false);
  const [emailProgress, setEmailProgress] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(() => {
    return localStorage.getItem('currentEmailSessionId') || null;
  });
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState(null);

  // Fetch available email accounts and daily count on mount
  React.useEffect(() => {
    const fetchEmailAccounts = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/admin/email-accounts`);
        const data = await response.json();
        if (data.accounts && data.accounts.length > 0) {
          setEmailAccounts(data.accounts);
          // If selected account is not in the list, default to first account
          const accountExists = data.accounts.some(acc => acc.id === selectedAccount);
          if (!accountExists) {
            setSelectedAccount(data.accounts[0].id);
            localStorage.setItem('selectedEmailAccount', data.accounts[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch email accounts:', error);
        setToastMessage('⚠️ Failed to load email accounts');
        setShowToast(true);
      } finally {
        setLoadingAccounts(false);
      }
    };
    
    const fetchDailyEmailCount = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/admin/daily-email-count`);
        const data = await response.json();
        setDailyEmailCount(data);
      } catch (error) {
        console.error('Failed to fetch daily email count:', error);
      }
    };
    
    fetchEmailAccounts();
    fetchDailyEmailCount();
  }, []);

  // Update rate limit check when account changes
  React.useEffect(() => {
    const savedRateLimit = localStorage.getItem(`rateLimitRetryTime_${selectedAccount}`);
    if (savedRateLimit) {
      const retryTime = parseInt(savedRateLimit);
      const now = new Date().getTime();
      if (now < retryTime) {
        setShowRateLimitWarning(true);
        setRateLimitRetryTime(retryTime);
      } else {
        setShowRateLimitWarning(false);
        setRateLimitRetryTime(null);
        localStorage.removeItem(`rateLimitRetryTime_${selectedAccount}`);
      }
    } else {
      setShowRateLimitWarning(false);
      setRateLimitRetryTime(null);
    }
  }, [selectedAccount]);
  
  // Check for existing email session on mount
  React.useEffect(() => {
    if (currentSessionId) {
      checkEmailProgress(currentSessionId);
    }
  }, [currentSessionId]);
  
  // Poll for progress updates when session is active
  React.useEffect(() => {
    if (currentSessionId && emailProgress && emailProgress.status === 'sending') {
      const interval = setInterval(() => {
        checkEmailProgress(currentSessionId);
      }, 3000); // Check every 3 seconds
      
      return () => clearInterval(interval);
    }
  }, [currentSessionId, emailProgress]);

  // Save template to localStorage whenever subject or message changes
  React.useEffect(() => {
    const templateToSave = {
      recipients: formData.recipients,
      subject: formData.subject,
      message: formData.message
    };
    localStorage.setItem('adminEmailTemplate', JSON.stringify(templateToSave));
  }, [formData.subject, formData.message, formData.recipients]);

  // Auto-hide toast after 4 seconds (only for non-loading toasts)
  React.useEffect(() => {
    if (showToast && !loading) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast, loading]);

  // Auto-hide error/success messages after 10 seconds
  React.useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
        setSuccessMessage('');
      }, 10000); // 10 seconds
      return () => clearTimeout(timer);
    }
  }, [errorMessage, successMessage]);

  // Helper function to check email progress
  const checkEmailProgress = async (sessionId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/admin/email-progress/${sessionId}`);
      if (response.ok) {
        const progress = await response.json();
        setEmailProgress(progress);
        
        if (progress.status === 'completed' || progress.status === 'cancelled' || progress.status === 'daily_limit_reached' || progress.status === 'error') {
          // Session completed, show completion modal
          setCompletionData(progress);
          setShowCompletionModal(true);
          setCurrentSessionId(null);
          localStorage.removeItem('currentEmailSessionId');
          setEmailProgress(null);
          // Commit this session to local email history from the pending snapshot
          try {
            const pendingKey = `adminEmailPending_${sessionId}`;
            const pendingRaw = localStorage.getItem(pendingKey);
            const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
            const newEntry = {
              id: sessionId,
              date: pending?.date || new Date().toISOString(),
              subject: pending?.subject || formData.subject || 'Email Campaign',
              recipients: Array.isArray(pending?.recipients) ? pending.recipients : [],
              sentCount: progress.sentCount || 0,
              failed: progress.failedCount || 0,
              totalEmails: progress.totalEmails || 0,
              status: progress.status,
              accountId: pending?.accountId || selectedAccount
            };
            const updatedHistory = [newEntry, ...emailHistory];
            setEmailHistory(updatedHistory);
            localStorage.setItem('adminEmailHistory', JSON.stringify(updatedHistory));
            if (pending) localStorage.removeItem(pendingKey);
          } catch (e) {
            console.warn('Failed to update local email history:', e);
          }
          
          // Refresh daily count
          const countResponse = await fetch(`${apiUrl}/api/admin/daily-email-count`);
          if (countResponse.ok) {
            const countData = await countResponse.json();
            setDailyEmailCount(countData);
          }
          // Inform user if error
          if (progress.status === 'error') {
            setToastMessage('⚠️ Couldn\'t send emails right now. You can start a new send.');
            setShowToast(true);
          }
        }
      } else if (response.status === 404) {
        // Session not found (e.g., backend restarted) — clear stuck state
        setCurrentSessionId(null);
        localStorage.removeItem('currentEmailSessionId');
        setEmailProgress(null);
        setToastMessage('ℹ️ Previous sending session ended. You can start a new one.');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Failed to check email progress:', error);
      // Soft-reset to avoid being stuck forever
      setCurrentSessionId(null);
      localStorage.removeItem('currentEmailSessionId');
      setEmailProgress(null);
      setToastMessage('⚠️ Lost connection while checking progress. You can start a new send.');
      setShowToast(true);
    }
  };
  
  // Helper function to cancel email session
  const cancelEmailSession = async () => {
    if (!currentSessionId) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      await fetch(`${apiUrl}/api/admin/cancel-email/${currentSessionId}`, {
        method: 'POST'
      });
      
      setToastMessage('✅ Email sending cancelled');
      setShowToast(true);
    } catch (error) {
      console.error('Failed to cancel email session:', error);
      setToastMessage('⚠️ Failed to cancel email session');
      setShowToast(true);
    }
  };

  // Check if rate limit time has passed
  React.useEffect(() => {
    if (rateLimitRetryTime) {
      // Save to localStorage with account-specific key
      localStorage.setItem(`rateLimitRetryTime_${selectedAccount}`, rateLimitRetryTime.toString());
      
      const checkInterval = setInterval(() => {
        const now = new Date().getTime();
        setCurrentTime(now); // Update current time for countdown
        
        if (now >= rateLimitRetryTime) {
          setShowRateLimitWarning(false);
          setRateLimitRetryTime(null);
          localStorage.removeItem(`rateLimitRetryTime_${selectedAccount}`);
          setToastMessage('✅ You can send emails again now!');
          setShowToast(true);
        }
      }, 1000); // Check every second

      return () => clearInterval(checkInterval);
    }
  }, [rateLimitRetryTime, selectedAccount]);

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Handle adding email
  const handleEmailInputChange = (e) => {
    const value = e.target.value;
    setEmailInput(value);
    setEmailError('');

    // Check for comma, Enter, or space to add email
    if (value.includes(',') || value.includes(' ')) {
      let email = value.replace(/[,\s]/g, '').trim();
      if (email) {
        // Auto-append @gmail.com if no @ symbol present
        if (!email.includes('@')) {
          email = email + '@gmail.com';
        }
        addEmail(email);
      }
      setEmailInput('');
    }
  };

  const handleEmailKeyDown = (e) => {
    // Ctrl+A to select all emails
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault();
      // Select all email indices
      const allIndices = new Set(emailList.map((_, index) => index));
      setSelectedEmails(allIndices);
      return;
    }

    // Delete or Backspace to remove selected emails
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEmails.size > 0 && !emailInput) {
      e.preventDefault();
      // Remove all selected emails
      const newList = emailList.filter((_, index) => !selectedEmails.has(index));
      setEmailList(newList);
      setFormData(prev => ({
        ...prev,
        recipients: newList.join(', ')
      }));
      setSelectedEmails(new Set());
      return;
    }

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      let email = emailInput.trim();
      if (email) {
        // Auto-append @gmail.com if no @ symbol present
        if (!email.includes('@')) {
          email = email + '@gmail.com';
        }
        addEmail(email);
      }
      setEmailInput('');
      setSelectedEmails(new Set()); // Clear selection
    } else if (e.key === 'Backspace' && !emailInput && emailList.length > 0 && selectedEmails.size === 0) {
      // Remove last email on backspace if input is empty and nothing selected
      removeEmail(emailList.length - 1);
    }
  };

  const addEmail = (email) => {
    if (!isValidEmail(email)) {
      setEmailError(`"${email}" is not a valid email address`);
      return;
    }
    if (emailList.includes(email)) {
      setEmailError(`"${email}" is already added`);
      return;
    }
    const newList = [...emailList, email];
    setEmailList(newList);
    setFormData(prev => ({
      ...prev,
      recipients: newList.join(', ')
    }));
    setEmailError('');
  };

  const removeEmail = (index) => {
    const newList = emailList.filter((_, i) => i !== index);
    setEmailList(newList);
    setFormData(prev => ({
      ...prev,
      recipients: newList.join(', ')
    }));
    setSelectedEmails(new Set()); // Clear selection after removal
  };

  // Handle file upload (CSV/Excel)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    setEmailError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        console.log('File type:', file.type);
        console.log('File name:', file.name);
        
        let textContent = '';
        
        // For Excel files, read as binary and extract printable characters
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          if (content instanceof ArrayBuffer) {
            const uint8Array = new Uint8Array(content);
            // Extract only printable ASCII characters
            for (let i = 0; i < uint8Array.length; i++) {
              const char = uint8Array[i];
              // Keep printable ASCII characters and @ symbol
              if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
                textContent += String.fromCharCode(char);
              }
            }
          }
        } else {
          // CSV files
          textContent = content;
        }
        
        console.log('Cleaned text length:', textContent.length);
        console.log('Text sample:', textContent.substring(0, 500));
        
        const emails = extractEmailsFromFile(textContent, file.name);
        console.log('Extracted emails:', emails);
        
        if (emails.length === 0) {
          setEmailError('No valid email addresses found in the file. Please ensure the file contains email addresses or try saving it as CSV format.');
          setUploadingFile(false);
          return;
        }

        // Limit to first 50 emails and add all valid emails to the list
        const validEmails = emails.filter(email => isValidEmail(email)).slice(0, 50);
        const uniqueEmails = [...new Set([...emailList, ...validEmails])];
        
        // Show warning if more than 50 emails were found
        if (emails.length > 50) {
          setToastMessage(`⚠️ CSV contained ${emails.length} emails. Only the first 50 were imported due to processing limits.`);
          setShowToast(true);
        }
        
        setEmailList(uniqueEmails);
        setFormData(prev => ({
          ...prev,
          recipients: uniqueEmails.join(', ')
        }));

        if (validEmails.length > 100) {
          setToastMessage(`✅ Imported ${validEmails.length} emails! They will be sent in ${Math.ceil(validEmails.length / 100)} batches.`);
        } else {
          setToastMessage(`✅ Imported ${validEmails.length} email(s) from file`);
        }
        setShowToast(true);
        setUploadingFile(false);
      } catch (error) {
        console.error('Error reading file:', error);
        setEmailError('Failed to read file. Please ensure it\'s a valid CSV or Excel file.');
        setUploadingFile(false);
      }
    };

    reader.onerror = () => {
      setEmailError('Failed to read file');
      setUploadingFile(false);
    };

    // Read Excel files as ArrayBuffer, CSV as text
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
    e.target.value = ''; // Reset input
  };

  // Extract emails from CSV/Excel file content
  const extractEmailsFromFile = (text, filename) => {
    const emails = [];
    
    console.log('Searching for emails in text...');
    
    // Simple but effective email regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    
    console.log('Regex matches:', matches);
    
    if (matches) {
      matches.forEach(email => {
        const cleanEmail = email.toLowerCase().trim();
        console.log('Found email:', cleanEmail);
        if (isValidEmail(cleanEmail)) {
          emails.push(cleanEmail);
        }
      });
    }

    console.log('Final extracted emails:', emails);
    return [...new Set(emails)]; // Remove duplicates
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that at least one email is added
    if (emailList.length === 0) {
      setErrorMessage('Please add at least one recipient email address');
      return;
    }
    
    // Check daily limit before starting
    if (dailyEmailCount.remaining <= 0) {
      setShowDailyLimitPopup(true);
      return;
    }
    
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const token = localStorage.getItem('adminToken');
      
      // Show daily limit info if close to limit
      if (dailyEmailCount.remaining < emailList.length) {
        setToastMessage(`⚠️ Only ${dailyEmailCount.remaining} emails can be sent today. Will send first ${dailyEmailCount.remaining} emails.`);
        setShowToast(true);
      }

      // Send email request to new API
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/admin/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipients: emailList,
          subject: formData.subject,
          message: formData.message,
          emailAccountId: selectedAccount
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store session ID and start tracking progress
        setCurrentSessionId(data.sessionId);
        localStorage.setItem('currentEmailSessionId', data.sessionId);
        
        setToastMessage(`📧 Email sending started! Processing ${data.totalEmails} emails with 1.2-minute intervals.`);
        setShowToast(true);
        setShowProgressModal(true);
        // Save a pending history snapshot so we can record it when the session finishes
        try {
          const pendingEntry = {
            id: data.sessionId,
            date: new Date().toISOString(),
            subject: formData.subject,
            recipients: emailList,
            accountId: selectedAccount
          };
          localStorage.setItem(`adminEmailPending_${data.sessionId}`, JSON.stringify(pendingEntry));
        } catch (e) {
          console.warn('Failed to save pending email history snapshot:', e);
        }
        
        // Clear form
        setEmailList([]);
        setEmailInput('');
        setFormData(prev => ({
          ...prev,
          recipients: ''
        }));
        
        // Start checking progress
        checkEmailProgress(data.sessionId);
        
      } else if (response.status === 429) {
        // Daily limit reached
        setDailyEmailCount(prev => ({
          ...prev,
          dailyCount: data.dailyCount || prev.dailyCount,
          remaining: 0
        }));
        setShowDailyLimitPopup(true);
      } else if (response.status === 503) {
        // Backend preflight failed – inform and allow immediate retry
        setErrorMessage(data.error || 'Unable to send emails right now.');
        setToastMessage('⚠️ Unable to send right now. Try switching account or later.');
        setShowToast(true);
      } else {
        setErrorMessage(data.error || 'Failed to start email sending');
      }
      
    } catch (error) {
      console.error('Error starting email send:', error);
      setErrorMessage('Failed to start email sending. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{toastMessage}</span>
            <button
              onClick={() => setShowToast(false)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Daily Limit Popup */}
      {showDailyLimitPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-red-600">Daily Email Limit Reached</h3>
              <button
                onClick={() => setShowDailyLimitPopup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-red-800">You've reached your daily email limit!</h4>
                    <p className="text-red-600">Come back tomorrow to send more emails.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white rounded p-3 border">
                    <div className="text-gray-600">Sent Today</div>
                    <div className="text-2xl font-bold text-red-600">{dailyEmailCount.dailyCount}</div>
                  </div>
                  <div className="bg-white rounded p-3 border">
                    <div className="text-gray-600">Daily Limit</div>
                    <div className="text-2xl font-bold text-gray-800">{dailyEmailCount.dailyLimit}</div>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <div className="text-sm text-gray-600">Remaining: <span className="font-semibold text-red-600">{dailyEmailCount.remaining} emails</span></div>
                </div>
              </div>
              <button
                onClick={() => setShowDailyLimitPopup(false)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Got it, I'll try tomorrow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Tracking Modal */}
      {showProgressModal && emailProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-blue-600">Email Sending in Progress</h3>
              <button
                onClick={() => setShowProgressModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-blue-800">Sending emails...</h4>
                    <p className="text-blue-600">Please keep this window open</p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{emailProgress.currentEmail || 0} of {emailProgress.totalEmails}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${emailProgress.totalEmails > 0 ? ((emailProgress.currentEmail || 0) / emailProgress.totalEmails) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-white rounded p-3 border text-center">
                    <div className="text-gray-600">Sent</div>
                    <div className="text-lg font-bold text-green-600">{emailProgress.sentCount || 0}</div>
                  </div>
                  <div className="bg-white rounded p-3 border text-center">
                    <div className="text-gray-600">Failed</div>
                    <div className="text-lg font-bold text-red-600">{emailProgress.failedCount || 0}</div>
                  </div>
                  <div className="bg-white rounded p-3 border text-center">
                    <div className="text-gray-600">Remaining</div>
                    <div className="text-lg font-bold text-blue-600">{emailProgress.totalEmails - (emailProgress.currentEmail || 0)}</div>
                  </div>
                </div>
                
                {/* Current Email */}
                {emailProgress.currentRecipient && (
                  <div className="mt-4 text-center">
                    <div className="text-sm text-gray-600">Currently sending to:</div>
                    <div className="font-medium text-blue-800">{emailProgress.currentRecipient}</div>
                  </div>
                )}
                
                {/* Time Info */}
                <div className="mt-4 text-xs text-gray-500 text-center">
                  Sending 1 email every 1.2 minutes to respect Gmail limits
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowProgressModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Hide Progress
                </button>
                <button
                  onClick={cancelEmailSession}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Cancel Sending
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && completionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-green-600">Email Sending Complete!</h3>
              <button
                onClick={() => setShowCompletionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className={`${completionData.status === 'completed' ? 'bg-green-50 border-green-200' : completionData.status === 'cancelled' ? 'bg-yellow-50 border-yellow-200' : completionData.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-12 h-12 ${completionData.status === 'completed' ? 'bg-green-100' : completionData.status === 'cancelled' ? 'bg-yellow-100' : completionData.status === 'error' ? 'bg-red-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
                    {completionData.status === 'completed' ? (
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : completionData.status === 'cancelled' ? (
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    ) : completionData.status === 'error' ? (
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h4 className={`text-lg font-semibold ${completionData.status === 'completed' ? 'text-green-800' : completionData.status === 'cancelled' ? 'text-yellow-800' : completionData.status === 'error' ? 'text-red-800' : 'text-red-800'}`}>
                      {completionData.status === 'completed' ? 'All emails sent successfully!' : 
                       completionData.status === 'cancelled' ? 'Email sending was cancelled' :
                       completionData.status === 'error' ? 'Unable to send right now' :
                       'Daily limit reached'}
                    </h4>
                    <p className={`${completionData.status === 'completed' ? 'text-green-600' : completionData.status === 'cancelled' ? 'text-yellow-600' : completionData.status === 'error' ? 'text-red-600' : 'text-red-600'}`}>
                      {completionData.status === 'completed' ? 'Your promotional campaign has been completed.' :
                       completionData.status === 'cancelled' ? 'The email sending process was stopped.' :
                       completionData.status === 'error' ? 'Please try again later or switch the sending account.' :
                       'Email sending stopped due to daily limit.'}
                    </p>
                  </div>
                </div>
                
                {/* Final Stats */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-white rounded p-3 border text-center">
                    <div className="text-gray-600">Total Sent</div>
                    <div className="text-lg font-bold text-green-600">{completionData.sentCount || 0}</div>
                  </div>
                  <div className="bg-white rounded p-3 border text-center">
                    <div className="text-gray-600">Failed</div>
                    <div className="text-lg font-bold text-red-600">{completionData.failedCount || 0}</div>
                  </div>
                  <div className="bg-white rounded p-3 border text-center">
                    <div className="text-gray-600">Total Emails</div>
                    <div className="text-lg font-bold text-blue-600">{completionData.totalEmails || 0}</div>
                  </div>
                </div>
                
                {/* Duration */}
                {completionData.startTime && completionData.endTime && (
                  <div className="mt-3 text-center text-sm text-gray-600">
                    Duration: {Math.round((new Date(completionData.endTime) - new Date(completionData.startTime)) / 60000)} minutes
                  </div>
                )}
              </div>
              
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  // Refresh daily count
                  const fetchDailyCount = async () => {
                    try {
                      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
                      const response = await fetch(`${apiUrl}/api/admin/daily-email-count`);
                      const data = await response.json();
                      setDailyEmailCount(data);
                    } catch (error) {
                      console.error('Failed to refresh daily count:', error);
                    }
                  };
                  fetchDailyCount();
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-900">Email History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {emailHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No email history yet. Sent emails will appear here.</p>
              ) : (
                <div className="space-y-4">
                  {emailHistory.map((entry) => (
                    <div key={entry.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{entry.subject}</h4>
                          <p className="text-sm text-gray-500">
                            {new Date(entry.date).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full text-center">
                            {entry.sentCount} sent
                          </span>
                          {entry.batches && entry.batches > 1 && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full text-center">
                              {entry.batches} batches
                            </span>
                          )}
                          {entry.failed && entry.failed > 0 && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full text-center">
                              {entry.failed} failed
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Recipients: {entry.recipients.length}
                          {entry.recipients.length > 10 && ' (showing first 10)'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {entry.recipients.slice(0, 10).map((email, idx) => (
                            <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                              {email}
                            </span>
                          ))}
                          {entry.recipients.length > 10 && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              +{entry.recipients.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between p-6 border-t bg-gray-50 flex-shrink-0">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear all email history?')) {
                    setEmailHistory([]);
                    localStorage.removeItem('adminEmailHistory');
                    setShowHistory(false);
                  }
                }}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Clear History
              </button>
              <button
                onClick={() => setShowHistory(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Promotional Email</h2>
        
        <p className="text-gray-600 mb-4">
          Send promotional emails to potential candidates. Include a link to your website to attract visitors and collect resumes for your database.
        </p>

        {/* Daily Email Counter */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-900">Daily Email Usage</h3>
                <p className="text-xs text-blue-700">Track your daily email sending progress</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">
                {dailyEmailCount.dailyCount}<span className="text-lg text-gray-600">/{dailyEmailCount.dailyLimit}</span>
              </div>
              <div className="text-xs text-blue-600">
                {dailyEmailCount.remaining} remaining today
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  dailyEmailCount.remaining <= 50 ? 'bg-red-500' : 
                  dailyEmailCount.remaining <= 100 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{
                  width: `${(dailyEmailCount.dailyCount / dailyEmailCount.dailyLimit) * 100}%`
                }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-blue-600 mt-1">
              <span>0</span>
              <span className={dailyEmailCount.remaining <= 50 ? 'text-red-600 font-semibold' : ''}>
                {dailyEmailCount.remaining <= 50 ? `Only ${dailyEmailCount.remaining} left!` : `${dailyEmailCount.remaining} remaining`}
              </span>
              <span>{dailyEmailCount.dailyLimit}</span>
            </div>
          </div>
        </div>

        {/* Active Email Session Notification */}
        {currentSessionId && emailProgress && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-800">Email Sending in Progress</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Sending {emailProgress.totalEmails} emails • {emailProgress.sentCount} sent, {emailProgress.failedCount} failed
                  </p>
                  <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${emailProgress.totalEmails > 0 ? ((emailProgress.currentEmail || 0) / emailProgress.totalEmails) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowProgressModal(true)}
                className="text-blue-600 hover:text-blue-800 ml-2 text-sm font-medium"
              >
                View Progress
              </button>
            </div>
          </div>
        )}

        {showRateLimitWarning && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800">Gmail Rate Limit Active</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {rateLimitRetryTime ? (
                    <>
                      You've hit Gmail's sending limit. You can send emails again after{' '}
                      <strong>{new Date(rateLimitRetryTime).toLocaleTimeString()}</strong>
                      {(() => {
                        const minutesLeft = Math.ceil((rateLimitRetryTime - currentTime) / 60000);
                        return minutesLeft > 0 ? ` (${minutesLeft} ${minutesLeft === 1 ? 'minute' : 'minutes'} remaining)` : '';
                      })()}
                    </>
                  ) : (
                    <>
                      Gmail limits sending to approximately <strong>100 emails per hour</strong>. Please wait before sending more emails.
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowRateLimitWarning(false);
                  setRateLimitRetryTime(null);
                  localStorage.removeItem(`rateLimitRetryTime_${selectedAccount}`);
                }}
                className="text-yellow-600 hover:text-yellow-800 ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Account Selection */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4">
            <label htmlFor="emailAccount" className="block text-sm font-semibold text-gray-800 mb-2">
              Send From Email Account <span className="text-red-500">*</span>
            </label>
            {loadingAccounts ? (
              <div className="flex items-center space-x-2 text-gray-600">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">Loading email accounts...</span>
              </div>
            ) : emailAccounts.length === 0 ? (
              <div className="text-red-600 text-sm">
                ⚠️ No email accounts configured. Please configure email accounts in backend .env file.
              </div>
            ) : (
              <div>
                <select
                  id="emailAccount"
                  value={selectedAccount}
                  onChange={(e) => {
                    setSelectedAccount(e.target.value);
                    localStorage.setItem('selectedEmailAccount', e.target.value);
                    setToastMessage(`📧 Switched to ${emailAccounts.find(acc => acc.id === e.target.value)?.email || e.target.value}`);
                    setShowToast(true);
                  }}
                  className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900 font-medium"
                >
                  {emailAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-2 flex items-start">
                  <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Switch between accounts when one hits the rate limit to continue sending emails.
                </p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="recipients" className="block text-sm font-medium text-gray-700 mb-2">
              Recipients <span className="text-red-500">*</span>
            </label>
            
            {/* File Upload Button */}
            <div className="mb-3">
              <label className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition cursor-pointer">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="font-medium">{uploadingFile ? 'Processing...' : 'Upload CSV/Excel'}</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">Upload a CSV or Excel file containing email addresses (max 50 emails will be processed)</p>
            </div>

            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent min-h-[80px]">
              <div className="flex flex-wrap gap-2 mb-2 email-chips-container">
                {emailList.map((email, index) => (
                  <div
                    key={index}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm email-chip cursor-pointer transition ${
                      selectedEmails.has(index)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                    onClick={() => {
                      // Toggle selection on click
                      const newSelected = new Set(selectedEmails);
                      if (newSelected.has(index)) {
                        newSelected.delete(index);
                      } else {
                        newSelected.add(index);
                      }
                      setSelectedEmails(newSelected);
                    }}
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEmail(index);
                      }}
                      className={`ml-2 font-bold ${
                        selectedEmails.has(index)
                          ? 'text-white hover:text-gray-200'
                          : 'text-indigo-600 hover:text-indigo-800'
                      }`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <input
                type="text"
                id="recipients"
                value={emailInput}
                onChange={handleEmailInputChange}
                onKeyDown={handleEmailKeyDown}
                onBlur={() => {
                  if (emailInput.trim()) {
                    let email = emailInput.trim();
                    // Auto-append @gmail.com if no @ symbol present
                    if (!email.includes('@')) {
                      email = email + '@gmail.com';
                    }
                    addEmail(email);
                    setEmailInput('');
                  }
                }}
                placeholder={emailList.length === 0 ? "Type username (e.g., 'john' becomes 'john@gmail.com')" : "Add another email..."}
                className="w-full outline-none"
              />
            </div>
            {emailError && (
              <p className="mt-1 text-sm text-red-500">{emailError}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Type username or full email and press Enter, comma, or space. <strong>@gmail.com</strong> will be added automatically if not specified.
            </p>
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-xs text-yellow-800">
                  <strong>New Email System:</strong> Emails are now sent with 1.2-minute intervals (50/hour max), include unsubscribe headers, and respect a 300-email daily limit. Process continues even if you log out.
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              placeholder="Enter email subject"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              rows="12"
              value={formData.message}
              onChange={handleChange}
              required
              placeholder="Enter your email message here. Include a link to your website to attract visitors and encourage them to upload their resumes."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {/* <p className="mt-1 text-sm text-gray-500">
              Tip: Include a call-to-action with your website link to drive traffic and collect resumes
            </p> */}
          </div>

          {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips for Effective Promotional Emails:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>The default template is ready to use - just add recipient email addresses</li>
              <li>Customize the subject line and message content as needed</li>
              <li>Include your website URL: <strong>https://jobportal-talentcor.vercel.app</strong></li>
              <li>Encourage recipients to create profiles and upload resumes</li>
              <li>Keep the tone professional yet inviting</li>
            </ul>
          </div> */}

          <div className="flex items-center justify-between pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="px-6 py-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>View History ({emailHistory.length})</span>
            </button>

            <button
              type="submit"
              disabled={loading || dailyEmailCount.remaining <= 0 || currentSessionId}
              className="px-8 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting...' : 
               currentSessionId ? 'Sending in Progress...' :
               dailyEmailCount.remaining <= 0 ? 'Daily Limit Reached' : 
               'Start Email Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

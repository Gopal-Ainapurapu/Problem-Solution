import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';
import Navbar from './components/Navbar';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
      setError('');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load notifications. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const response = await api.get('/notifications');
        if (!ignore) {
          setNotifications(response.data.notifications || []);
          setUnreadCount(response.data.unreadCount || 0);
          setError('');
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err.response?.data?.message ||
              'Unable to load notifications. Please try again.'
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    init();

    const handleIncomingNotif = (event) => {
      if (event.detail) {
        setNotifications((prev) => [event.detail, ...prev]);
        setUnreadCount((c) => c + 1);
      }
    };

    window.addEventListener('locallens:notification', handleIncomingNotif);

    return () => {
      ignore = true;
      window.removeEventListener('locallens:notification', handleIncomingNotif);
    };
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications((current) =>
        current.map((notification) =>
          notification._id === notificationId
            ? { ...notification, isRead: true, readAt: new Date().toISOString() }
            : notification
        )
      );
      setUnreadCount((current) => {
        const next = Math.max(0, current - 1);
        window.dispatchEvent(
          new CustomEvent('locallens:notifications-read', { detail: { unreadCount: next } })
        );
        return next;
      });
      toast.success('Notification marked as read.');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Unable to mark notification as read.'
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      window.dispatchEvent(
        new CustomEvent('locallens:notifications-read', { detail: { unreadCount: 0 } })
      );
      toast.success('All notifications marked as read.');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Unable to mark all notifications as read.'
      );
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return '';
    return parsedDate.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', color: 'var(--color-text)' }}>
      <Navbar />

      <main style={{ width: 'min(900px, calc(100% - 40px))', margin: '0 auto', padding: '36px 0 64px' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--color-primary-dark)',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Activity Feed
            </span>
            <h1
              style={{
                margin: 0,
                fontFamily: "'Manrope', sans-serif",
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--color-navy)',
              }}
            >
              Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
            </h1>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="btn btn-outline"
            >
              ✓ Mark All as Read
            </button>
          )}
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
            <p className="text-muted">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <h3>Unable to load notifications</h3>
            <p>{error}</p>
            <button
              type="button"
              onClick={loadNotifications}
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
            >
              Try Again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}>🔔</span>
            <h3>No notifications yet</h3>
            <p>You'll receive updates here when your community reports are verified, assigned, or resolved.</p>
            <Link to="/reports" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Explore Community Reports
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {notifications.map((item) => (
              <article
                key={item._id}
                style={{
                  padding: '20px 24px',
                  background: item.isRead ? 'var(--color-surface)' : 'var(--color-soft-green)',
                  border: `1px solid ${item.isRead ? 'var(--color-border)' : '#C8E6D3'}`,
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: item.isRead ? 'var(--shadow-xs)' : 'var(--shadow-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  transition: 'all var(--transition)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '6px',
                    }}
                  >
                    {!item.isRead && (
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: 'var(--color-primary)',
                          display: 'inline-block',
                        }}
                      />
                    )}
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: 750,
                        color: 'var(--color-text)',
                      }}
                    >
                      {item.title}
                    </h3>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-secondary)',
                        marginLeft: 'auto',
                      }}
                    >
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: '0 0 10px',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      color: 'var(--color-text)',
                    }}
                  >
                    {item.message}
                  </p>

                  {item.report && (
                    <Link
                      to={`/reports/${item.report._id || item.report}`}
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--color-primary-dark)',
                        textDecoration: 'none',
                      }}
                    >
                      View Related Report →
                    </Link>
                  )}
                </div>

                {!item.isRead && (
                  <button
                    type="button"
                    onClick={() => markAsRead(item._id)}
                    className="btn btn-sm btn-outline"
                    title="Mark as read"
                  >
                    Mark Read
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

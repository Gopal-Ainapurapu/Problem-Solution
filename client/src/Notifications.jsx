import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';

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
    const timer = setTimeout(() => {
      loadNotifications();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);

      setNotifications((current) =>
        current.map((notification) =>
          notification._id === notificationId
            ? {
                ...notification,
                isRead: true,
                readAt: new Date().toISOString(),
              }
            : notification
        )
      );

      setUnreadCount((current) => Math.max(0, current - 1));
      setError('');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to mark notification as read.'
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
      setError('');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to mark all notifications as read.'
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

  const pageStyle = {
    maxWidth: '850px',
    margin: '30px auto',
    padding: '20px',
    color: '#1f2937',
  };

  const cardStyle = {
    padding: '18px',
    marginBottom: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
  };

  const buttonStyle = {
    padding: '9px 14px',
    border: 'none',
    borderRadius: '7px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    cursor: 'pointer',
  };

  return (
    <main style={pageStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ marginBottom: '6px' }}>Notifications</h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            You have {unreadCount} unread notification
            {unreadCount === 1 ? '' : 's'}.
          </p>
        </div>

        <button
          type="button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0 || loading}
          style={{
            ...buttonStyle,
            opacity: unreadCount === 0 || loading ? 0.5 : 1,
          }}
        >
          Mark all as read
        </button>
      </div>

      {error && (
        <div role="alert" style={{ color: '#dc2626', marginBottom: '16px' }}>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              loadNotifications();
            }}
            style={buttonStyle}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p>Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <div
          style={{
            ...cardStyle,
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: '#ffffff',
          }}
        >
          <h3>No notifications yet</h3>
          <p style={{ color: '#6b7280' }}>
            Updates about your community reports will appear here.
          </p>
          <Link to="/reports">Browse community reports</Link>
        </div>
      ) : (
        notifications.map((notification) => (
          <article
            key={notification._id}
            style={{
              ...cardStyle,
              backgroundColor: notification.isRead ? '#ffffff' : '#eff6ff',
              borderColor: notification.isRead ? '#e5e7eb' : '#bfdbfe',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 8px' }}>
                  {!notification.isRead && (
                    <span
                      aria-label="Unread"
                      style={{ color: '#2563eb', marginRight: '7px' }}
                    >
                      ●
                    </span>
                  )}
                  {notification.title}
                </h3>

                <p style={{ margin: '0 0 10px', lineHeight: 1.6 }}>
                  {notification.message}
                </p>

                <small style={{ color: '#6b7280' }}>
                  {formatDate(notification.createdAt)}
                </small>
              </div>

              {!notification.isRead && (
                <button
                  type="button"
                  onClick={() => markAsRead(notification._id)}
                  style={{
                    ...buttonStyle,
                    flexShrink: 0,
                    fontSize: '12px',
                  }}
                >
                  Mark read
                </button>
              )}
            </div>

            {notification.report && (
              <p style={{ marginBottom: 0, marginTop: '14px' }}>
                <Link
                  to={`/reports/${notification.report._id}`}
                  onClick={() => {
                    if (!notification.isRead) {
                      markAsRead(notification._id);
                    }
                  }}
                >
                  View report
                </Link>
              </p>
            )}
          </article>
        ))
      )}

      <p style={{ marginTop: '24px' }}>
        <Link to="/">← Back to Home</Link>
      </p>
    </main>
  );
}
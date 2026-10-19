
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Unable to load unread notification count:', error);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUnreadCount();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadUnreadCount]);

  return (
    <Link
      to="/notifications"
      aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        textDecoration: 'none',
        color: 'inherit',
        fontWeight: 500,
      }}
    >
      <span role="img" aria-hidden="true">
        🔔
      </span>
      <span>Notifications</span>

      {unreadCount > 0 && (
        <span
          style={{
            minWidth: '20px',
            height: '20px',
            padding: '0 5px',
            borderRadius: '999px',
            backgroundColor: '#dc2626',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/\/api\/?$/, '');
  }
  return 'http://localhost:5001';
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function fetchUnread() {
      try {
        const response = await api.get('/notifications');
        if (!ignore) {
          setUnreadCount(response.data.unreadCount || 0);
        }
      } catch {
        // Silently ignore
      }
    }

    if (user) {
      fetchUnread();
    }

    return () => {
      ignore = true;
    };
  }, [user]);

  // Real-time Push Notifications via Socket.io
  useEffect(() => {
    if (!user) return undefined;

    const userId = user.id || user._id;
    if (!userId) return undefined;

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.emit('join', userId);

    socket.on('notification', (newNotif) => {
      setUnreadCount((prev) => prev + 1);

      const title = newNotif.title || 'Community Update';
      const msg = newNotif.message || 'You have a new notification.';
      toast(`${title}: ${msg}`, {
        icon: '🔔',
        duration: 5000,
      });

      // Dispatch event for any active page view (e.g. Notifications.jsx)
      window.dispatchEvent(
        new CustomEvent('locallens:notification', { detail: newNotif })
      );
    });

    const handleReadSync = (event) => {
      if (typeof event.detail?.unreadCount === 'number') {
        setUnreadCount(event.detail.unreadCount);
      } else {
        setUnreadCount(0);
      }
    };

    window.addEventListener('locallens:notifications-read', handleReadSync);

    return () => {
      socket.emit('leave', userId);
      socket.disconnect();
      window.removeEventListener('locallens:notifications-read', handleReadSync);
    };
  }, [user]);

  return (
    <Link
      to="/notifications"
      className="nav-bell-link"
      aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
      title="View notifications"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        backgroundColor: '#ffffff',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
        textDecoration: 'none',
        transition: 'all var(--transition)',
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      {unreadCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            minWidth: '18px',
            height: '18px',
            padding: '0 4px',
            borderRadius: '999px',
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 800,
            boxShadow: '0 2px 6px rgba(36, 72, 61, 0.35)',
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

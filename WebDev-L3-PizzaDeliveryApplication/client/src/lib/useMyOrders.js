import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from './api';
import { useSocket } from './useSocket';

/** The logged-in user's orders, kept current by `order:updated` pushes from the server. */
export function useMyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/mine');
      setOrders(data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSocket(
    'user',
    {
      'order:updated': (order) =>
        setOrders((prev) => {
          const exists = prev.some((o) => o._id === order._id);
          return exists ? prev.map((o) => (o._id === order._id ? order : o)) : [order, ...prev];
        }),
    },
    load
  );

  return { orders, loading, error, reload: load };
}

export const isActiveOrder = (o) => !['Delivered', 'Cancelled'].includes(o.status);

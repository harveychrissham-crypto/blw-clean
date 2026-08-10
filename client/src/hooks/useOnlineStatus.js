import { useEffect, useState } from 'react';
import { Network } from '@capacitor/network';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    let listener;

    const setup = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);

      listener = await Network.addListener(
        'networkStatusChange',
        status => {
          setIsOnline(status.connected);
        }
      );
    };

    setup();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, []);

  return isOnline;
}
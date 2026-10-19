import { useEffect, useState } from 'react';

export interface GeoState {
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
    status: 'locating' | 'ok' | 'denied' | 'unavailable';
}

/** Ask the browser for the current position once (optionally keep watching). */
export const useGeolocation = (watch = false): GeoState => {
    const [state, setState] = useState<GeoState>({ lat: null, lng: null, accuracy: null, status: 'locating' });

    useEffect(() => {
        if (!('geolocation' in navigator)) {
            setState((s) => ({ ...s, status: 'unavailable' }));
            return;
        }
        const ok = (pos: GeolocationPosition) =>
            setState({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, status: 'ok' });
        const fail = (err: GeolocationPositionError) =>
            setState((s) => ({ ...s, status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable' }));
        const options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 };

        if (watch) {
            const id = navigator.geolocation.watchPosition(ok, fail, options);
            return () => navigator.geolocation.clearWatch(id);
        }
        navigator.geolocation.getCurrentPosition(ok, fail, options);
    }, [watch]);

    return state;
};

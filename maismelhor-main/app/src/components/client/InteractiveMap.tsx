import * as React from 'react';
import Map, { Marker, useMap } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, ChevronLeft, MapPin, Star, Clock, Truck, X, Loader2, ChevronRight } from 'lucide-react';
import { STORES, type Store } from '../../lib/stores';

const MAPBOX_TOKEN = (import.meta as any).env.PUBLIC_MAPBOX_TOKEN || '';

type GeoStatus = 'idle' | 'loading' | 'success' | 'denied';

const MAP_ID = 'main-map';

const CATEGORY_ICONS: Record<string, string> = {
  'Restaurante': '🍕',
  'Saúde & Bem-estar': '💊',
  'Mercado & Hortifruti': '🛒',
  'Café & Confeitaria': '☕',
};

function MapController({ userLocation }: { userLocation: { lng: number; lat: number } | null }) {
  const { [MAP_ID]: map } = useMap();
  React.useEffect(() => {
    if (userLocation && map) {
      map.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 15, duration: 1400, essential: true });
    }
  }, [userLocation, map]);
  return null;
}

export default function InteractiveMap() {
  const [viewState, setViewState] = React.useState({
    longitude: -48.7640,
    latitude: -24.2230,
    zoom: 14.5,
  });

  const [selectedStore, setSelectedStore] = React.useState<Store | null>(null);
  const [userLocation, setUserLocation] = React.useState<{ lng: number; lat: number } | null>(null);
  const [geoStatus, setGeoStatus] = React.useState<GeoStatus>('idle');

  const handleLocateMe = React.useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('denied');
      return;
    }
    // If already located, just fly back
    if (geoStatus === 'success' && userLocation) {
      setViewState(v => ({ ...v, longitude: userLocation.lng, latitude: userLocation.lat, zoom: 15 }));
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;
        setUserLocation({ lng, lat });
        setGeoStatus('success');
      },
      () => {
        setGeoStatus('denied');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [geoStatus, userLocation]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="absolute inset-0 flex items-center justify-center flex-col p-6 text-center"
        style={{ background: 'radial-gradient(ellipse at top left, #1a0f00 0%, #0A0908 60%, #050403 100%)' }}>
        <div className="glass-2 rounded-3xl p-8 max-w-sm w-full highlight-top glow-brand">
          <div className="w-16 h-16 bg-brand-500/15 text-brand-400 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <MapPin className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-display font-bold text-neutral-100 mb-2">Token Mapbox Pendente</h2>
          <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
            Adicione a variável{' '}
            <code className="bg-neutral-800 text-brand-400 px-1.5 py-0.5 rounded font-mono text-xs font-bold">
              PUBLIC_MAPBOX_TOKEN
            </code>{' '}
            no arquivo{' '}
            <code className="bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded font-mono text-xs">.env</code>.
          </p>
          <a
            href="/client"
            className="btn-primary w-full justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar ao Início
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Map */}
      <div className="absolute inset-0">
        <Map
          id={MAP_ID}
          {...viewState}
          onMove={(evt: any) => setViewState(evt.viewState)}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: '100%', height: '100%' }}
          onClick={() => setSelectedStore(null)}
        >
          <MapController userLocation={userLocation} />
          {/* Store Markers */}
          {STORES.map((store) => (
            <Marker
              key={store.id}
              longitude={store.position[0]}
              latitude={store.position[1]}
              anchor="bottom"
              onClick={(e: any) => {
                e.originalEvent?.stopPropagation();
                setSelectedStore(store);
              }}
            >
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: Number(store.id) * 0.08 }}
                className="relative cursor-pointer group"
                style={{ marginBottom: '8px' }}
              >
                {/* Deal badge */}
                {store.deal && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-brand-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg shadow-brand-500/30">
                    {store.deal}
                  </div>
                )}
                {/* Pin body */}
                <div
                  className="relative w-11 h-11 rounded-2xl flex items-center justify-center shadow-xl transition-transform duration-200 group-hover:scale-110 group-hover:-translate-y-0.5"
                  style={{
                    background: selectedStore?.id === store.id
                      ? 'rgba(255,107,0,0.95)'
                      : 'rgba(20,18,16,0.92)',
                    border: selectedStore?.id === store.id
                      ? '2px solid rgba(255,107,0,0.8)'
                      : '1.5px solid rgba(255,255,255,0.12)',
                    boxShadow: selectedStore?.id === store.id
                      ? '0 0 0 1px rgba(255,107,0,0.3), 0 0 20px rgba(255,107,0,0.35), 0 4px 16px rgba(0,0,0,0.5)'
                      : '0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
                  }}
                >
                  <span className="text-lg leading-none select-none">
                    {CATEGORY_ICONS[store.category] ?? '🏪'}
                  </span>
                </div>
                {/* Pointer triangle — use individual border sides to avoid React shorthand conflict */}
                <div
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
                  style={{
                    background: selectedStore?.id === store.id ? 'rgba(255,107,0,0.95)' : 'rgba(20,18,16,0.92)',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: selectedStore?.id === store.id ? '1.5px solid rgba(255,107,0,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
                    borderBottom: selectedStore?.id === store.id ? '1.5px solid rgba(255,107,0,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
                  }}
                />
              </motion.div>
            </Marker>
          ))}

          {/* User Location Marker */}
          {userLocation && (
            <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
              <div className="relative flex items-center justify-center">
                {/* Outer pulse */}
                <div className="absolute w-12 h-12 rounded-full bg-brand-500/20 animate-ping" />
                {/* Mid ring */}
                <div className="absolute w-8 h-8 rounded-full bg-brand-500/30 border border-brand-500/50" />
                {/* Core dot */}
                <div className="relative w-5 h-5 rounded-full bg-brand-500 border-2 border-white shadow-xl shadow-brand-500/50" />
              </div>
            </Marker>
          )}
        </Map>
      </div>

      {/* Floating Header */}
      <div className="absolute top-0 inset-x-0 p-4 z-10 pointer-events-none">
        <div className="flex items-center space-x-3 mt-2 w-full pointer-events-auto">
          {/* Back button */}
          <motion.a
            href="/client"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 22 }}
            className="w-12 h-12 flex-shrink-0 rounded-2xl glass-3 flex items-center justify-center text-neutral-100 hover:bg-white/10 active:scale-95 transition-all shadow-lg"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.a>

          {/* Title pill */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-3 px-5 py-3 rounded-2xl flex-1 flex items-center justify-between shadow-lg"
          >
            <div>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest leading-none mb-0.5">
                Explorar
              </p>
              <h2 className="text-sm font-display font-bold text-gradient leading-none">
                Lojas Próximas
              </h2>
            </div>
            <div className="flex items-center space-x-1 bg-brand-500/10 border border-brand-500/20 rounded-full px-2 py-1">
              <MapPin className="w-3 h-3 text-brand-400" />
              <span className="text-[10px] text-brand-400 font-bold">{STORES.length} lojas</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Popup card for selected store */}
      <AnimatePresence>
        {selectedStore && (
          <motion.div
            key={selectedStore.id}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+90px)] inset-x-4 z-20"
          >
            <div
              className="rounded-3xl overflow-hidden highlight-top"
              style={{
                background: 'rgba(20,18,16,0.88)',
                backdropFilter: 'blur(28px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,107,0,0.12), 0 0 32px rgba(255,107,0,0.06)',
              }}
            >
              {/* Store Image Strip */}
              <div className="relative w-full h-28 overflow-hidden">
                <img
                  src={selectedStore.image}
                  alt={selectedStore.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-neutral-950/80" />
                {selectedStore.deal && (
                  <div className="absolute top-3 left-3 bg-brand-500 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shadow-lg shadow-brand-500/40">
                    {selectedStore.deal}
                  </div>
                )}
                <button
                  onClick={() => setSelectedStore(null)}
                  className="absolute top-3 right-3 w-7 h-7 bg-neutral-950/60 backdrop-blur rounded-full flex items-center justify-center text-neutral-300 hover:text-white active:scale-95 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Info */}
              <div className="p-4">
                {/* Category + Name */}
                <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest mb-0.5">
                  {selectedStore.category}
                </p>
                <h3 className="font-display font-bold text-neutral-100 text-base leading-tight mb-3">
                  {selectedStore.name}
                </h3>

                {/* Stats row */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center space-x-1 bg-warning/10 border border-warning/20 rounded-full px-2 py-1">
                    <Star className="w-3 h-3 text-warning fill-warning" />
                    <span className="text-[11px] font-bold text-warning">{selectedStore.rating}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span className="text-[11px] text-neutral-400 font-medium">{selectedStore.deliveryTime}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Truck className="w-3 h-3 text-neutral-400" />
                    <span className="text-[11px] text-neutral-400 font-medium">{selectedStore.deliveryFee}</span>
                  </div>
                  <div className="flex items-center space-x-1 ml-auto">
                    <MapPin className="w-3 h-3 text-neutral-500" />
                    <span className="text-[11px] text-neutral-500">{selectedStore.distance}</span>
                  </div>
                </div>

                {/* CTA Button */}
                <a
                  href={`/client/loja/${selectedStore.slug}`}
                  className="flex items-center justify-center space-x-2 w-full py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #FF8C32, #FF6B00)',
                    boxShadow: '0 4px 16px rgba(255,107,0,0.35)',
                  }}
                >
                  <span>Ver Loja</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Buttons */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] right-4 z-10 flex flex-col space-y-3"
      >
        {/* GPS button */}
        <button
          onClick={handleLocateMe}
          disabled={geoStatus === 'loading'}
          className="w-12 h-12 glass-3 rounded-2xl shadow-lg flex items-center justify-center transition-all active:scale-95 hover:bg-white/10 outline-none disabled:opacity-70"
          aria-label={geoStatus === 'success' ? 'Minha localização ativa' : 'Localizar minha posição'}
          style={geoStatus === 'success' ? {
            border: '1.5px solid rgba(255,107,0,0.5)',
            boxShadow: '0 0 0 1px rgba(255,107,0,0.2), 0 0 16px rgba(255,107,0,0.2)',
          } : {}}
        >
          {geoStatus === 'loading' ? (
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
          ) : geoStatus === 'denied' ? (
            <Navigation className="w-5 h-5 text-error" />
          ) : (
            <Navigation className={`w-5 h-5 ${geoStatus === 'success' ? 'text-brand-400 fill-brand-400/30' : 'text-neutral-300'}`} />
          )}
        </button>
      </motion.div>

      {/* Geolocation denied hint */}
      <AnimatePresence>
        {geoStatus === 'denied' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-24 inset-x-4 z-20"
          >
            <div className="glass-2 rounded-2xl px-4 py-3 flex items-center space-x-3 border border-error/20">
              <div className="w-7 h-7 bg-error/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Navigation className="w-4 h-4 text-error" />
              </div>
              <p className="text-xs text-neutral-300 flex-1">
                Permissão de localização negada. Verifique as configurações do navegador.
              </p>
              <button onClick={() => setGeoStatus('idle')} className="text-neutral-500 hover:text-neutral-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

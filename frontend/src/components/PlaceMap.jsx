import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Vista inicial cuando todavía no hay lugares con ubicación: el centro de la ciudad de Formosa.
// Es solo el encuadre del mapa, no la ubicación de ningún lugar.
const formosaCity = [-26.1833, -58.1833];

// Leaflet se maneja por fuera de React: este componente crea el mapa una vez,
// redibuja los marcadores cuando cambian los lugares y centra el lugar elegido.
export default function PlaceMap({ places, selectedId, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    const map = L.map(containerRef.current, { center: formosaCity, zoom: 13, scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    // La rueda del mouse solo hace zoom después de hacer clic en el mapa: así no se traba el scroll de la página.
    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());
    mapRef.current = map;
    // stop() corta animaciones pendientes: si no, Leaflet falla al desmontar en medio de un zoom.
    return () => { map.stop(); map.off(); map.remove(); mapRef.current = null; markersRef.current.clear(); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    markers.forEach(marker => marker.remove());
    markers.clear();
    const located = places.filter(place => place.location);
    for (const place of located) {
      const { latitude, longitude } = place.location;
      const icon = L.divIcon({ className: 'place-marker', html: '<span class="place-pin"></span>', iconSize: [34, 34], iconAnchor: [17, 32], popupAnchor: [0, -28] });
      // El contenido del globo se arma con texto, nunca con HTML del servidor.
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = place.name;
      popup.append(title);
      if (place.addressLabel) { const address = document.createElement('span'); address.textContent = place.addressLabel; popup.append(address); }
      const marker = L.marker([latitude, longitude], { icon, title: place.name, alt: place.name, keyboard: true }).bindPopup(popup, { className: 'place-popup' }).addTo(map);
      marker.on('click', () => selectRef.current(place.id));
      markers.set(place.id, marker);
    }
    if (located.length === 1) map.setView([located[0].location.latitude, located[0].location.longitude], 16, { animate: false });
    else if (located.length > 1) map.fitBounds(L.latLngBounds(located.map(place => [place.location.latitude, place.location.longitude])), { padding: [40, 40], maxZoom: 16, animate: false });
  }, [places]);

  useEffect(() => {
    const marker = markersRef.current.get(selectedId);
    if (!marker) return;
    // Sin animación: un zoom animado que termina después de desmontar el mapa rompe Leaflet.
    mapRef.current.setView(marker.getLatLng(), Math.max(mapRef.current.getZoom(), 16), { animate: false });
    marker.openPopup();
  }, [selectedId, places]);

  return <div ref={containerRef} className="place-map" role="region" aria-label="Mapa de lugares"/>;
}

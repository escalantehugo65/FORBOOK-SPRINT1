import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Encuadre inicial cuando todavía no hay paradas: el centro de la ciudad de Formosa (no es ninguna parada).
const formosaCity = [-26.1833, -58.1833];

// Paradas de una ruta (FF-22) como puntos en el mapa. No se dibuja el recorrido entre ellas.
// - stops: [{ id, name, reference, latitude, longitude }]
// - focus: { id, at } para centrar y abrir una parada desde la lista (at cambia en cada clic).
export default function StopsMap({ stops, focus, label = 'Mapa de las paradas' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());

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
    return () => { map.stop(); map.off(); map.remove(); mapRef.current = null; markersRef.current.clear(); };
  }, []);

  // Se vuelven a dibujar y encuadrar solo si cambian las paradas (no en cada render).
  const signature = stops.map(stop => `${stop.id}|${stop.name}|${stop.reference ?? ''}|${stop.latitude}|${stop.longitude}`).join(';');
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    markers.forEach(marker => marker.remove());
    markers.clear();
    for (const stop of stops) {
      const icon = L.divIcon({ className: 'place-marker', html: '<span class="place-pin pin-stop"></span>', iconSize: [34, 34], iconAnchor: [17, 32], popupAnchor: [0, -28] });
      // El globo se arma con texto, nunca con HTML.
      const popup = document.createElement('div');
      const kind = document.createElement('small');
      kind.textContent = 'Parada';
      const title = document.createElement('strong');
      title.textContent = stop.name;
      popup.append(kind, title);
      if (stop.reference) { const reference = document.createElement('span'); reference.textContent = stop.reference; popup.append(reference); }
      const marker = L.marker([stop.latitude, stop.longitude], { icon, title: stop.name, alt: `Parada: ${stop.name}`, keyboard: true, riseOnHover: true })
        .bindPopup(popup, { className: 'place-popup' }).addTo(map);
      markers.set(stop.id, marker);
    }
    const points = stops.map(stop => [stop.latitude, stop.longitude]);
    if (!points.length) map.setView(formosaCity, 13, { animate: false });
    else if (points.length === 1) map.setView(points[0], 16, { animate: false });
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16, animate: false });
  }, [signature]);

  useEffect(() => {
    const marker = focus && markersRef.current.get(focus.id);
    if (!marker) return;
    // Sin animación: un zoom animado que termina después de desmontar el mapa rompe Leaflet.
    mapRef.current.setView(marker.getLatLng(), Math.max(mapRef.current.getZoom(), 16), { animate: false });
    marker.openPopup();
  }, [focus]);

  return <div ref={containerRef} className="stops-map" role="region" aria-label={label}/>;
}

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { placeKinds } from '../utils/places';

// Vista inicial cuando todavía no hay lugares con ubicación: el centro de la ciudad de Formosa.
// Es solo el encuadre del mapa, no la ubicación de ningún lugar.
const formosaCity = [-26.1833, -58.1833];
const pointsOf = places => places.filter(place => place.location).map(place => [place.location.latitude, place.location.longitude]);

// Leaflet se maneja por fuera de React: el mapa se crea una sola vez y se mantiene al filtrar.
// - frame: lugares que definen el encuadre (todos los cargados), así el mapa no salta al cambiar de categoría.
// - places: lugares que se dibujan (los del filtro), con un color por categoría.
export default function PlaceMap({ frame, places, selectedId, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const framedRef = useRef(false);
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
    return () => { map.stop(); map.off(); map.remove(); mapRef.current = null; markersRef.current.clear(); framedRef.current = false; };
  }, []);

  // Encuadre: una sola vez, con todos los lugares que tienen ubicación.
  useEffect(() => {
    const points = pointsOf(frame);
    if (framedRef.current || !points.length) return;
    framedRef.current = true;
    if (points.length === 1) mapRef.current.setView(points[0], 16, { animate: false });
    else mapRef.current.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16, animate: false });
  }, [frame]);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    markers.forEach(marker => marker.remove());
    markers.clear();
    for (const place of places.filter(item => item.location)) {
      const icon = L.divIcon({ className: 'place-marker', html: `<span class="place-pin pin-${place.kind}"></span>`, iconSize: [34, 34], iconAnchor: [17, 32], popupAnchor: [0, -28] });
      // El contenido del globo se arma con texto, nunca con HTML del servidor.
      const popup = document.createElement('div');
      const kind = document.createElement('small');
      kind.textContent = placeKinds[place.kind];
      const title = document.createElement('strong');
      title.textContent = place.name;
      popup.append(kind, title);
      if (place.addressLabel) { const address = document.createElement('span'); address.textContent = place.addressLabel; popup.append(address); }
      const marker = L.marker([place.location.latitude, place.location.longitude], { icon, title: place.name, alt: `${placeKinds[place.kind]}: ${place.name}`, keyboard: true, riseOnHover: true })
        .bindPopup(popup, { className: 'place-popup' }).addTo(map);
      marker.on('click', () => selectRef.current(place.id));
      markers.set(place.id, marker);
    }
  }, [places]);

  useEffect(() => {
    const marker = markersRef.current.get(selectedId);
    if (!marker) { mapRef.current.closePopup(); return; }
    // Sin animación: un zoom animado que termina después de desmontar el mapa rompe Leaflet.
    mapRef.current.setView(marker.getLatLng(), Math.max(mapRef.current.getZoom(), 16), { animate: false });
    marker.openPopup();
  }, [selectedId, places]);

  // Vuelve a mostrar todos los lugares visibles del filtro actual.
  function showAll() {
    const points = pointsOf(places.length && pointsOf(places).length ? places : frame);
    if (!points.length) { mapRef.current.setView(formosaCity, 13, { animate: false }); return; }
    if (points.length === 1) mapRef.current.setView(points[0], 16, { animate: false });
    else mapRef.current.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16, animate: false });
    mapRef.current.closePopup();
  }

  return <>
    <div ref={containerRef} className="place-map" role="region" aria-label="Mapa de lugares"/>
    <button className="map-reset" type="button" onClick={showAll}>Ver todos</button>
  </>;
}

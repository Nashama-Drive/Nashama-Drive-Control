import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, ExternalLink, MapPin } from "lucide-react";
import { Modal, ModalTitle } from "@/components/ui";
import {
  googleMapsUrl,
  parseGoogleMapsLocation,
  validCoordinates,
  type Coordinates,
} from "@/lib/maps";

const DEFAULT_CENTER: Coordinates = { latitude: 31.9539, longitude: 35.9106 };
const googleKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
let googleLoaderConfigured = false;

type MapController = {
  move: (position: Coordinates) => void;
  destroy: () => void;
};

export default function LocationPicker({
  latitude,
  longitude,
  address,
  onConfirm,
  onClose,
}: {
  latitude: number | null;
  longitude: number | null;
  address: string;
  onConfirm: (point: Coordinates) => void;
  onClose: () => void;
}) {
  const initial =
    latitude != null &&
    longitude != null &&
    validCoordinates(latitude, longitude)
      ? { latitude, longitude }
      : null;
  const [picked, setPicked] = useState<Coordinates | null>(initial);
  const [provider, setProvider] = useState<"google" | "openstreetmap">(
    googleKey ? "google" : "openstreetmap",
  );
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const mapElement = useRef<HTMLDivElement>(null);
  const controller = useRef<MapController | null>(null);
  const selectedPosition = useRef<Coordinates | null>(initial);

  const choose = (point: Coordinates) => {
    const position = {
      latitude: Number(point.latitude.toFixed(6)),
      longitude: Number(point.longitude.toFixed(6)),
    };
    setPicked(position);
    selectedPosition.current = position;
    setError("");
    controller.current?.move(position);
  };

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const element = mapElement.current;
    if (!element) return;

    const initialize = async () => {
      const center = initial ?? DEFAULT_CENTER;
      if (googleKey) {
        try {
          const { setOptions, importLibrary } = await import("@googlemaps/js-api-loader");
          if (!googleLoaderConfigured) {
            setOptions({ key: googleKey, v: "weekly", language: "ar", region: "JO" });
            googleLoaderConfigured = true;
          }
          const [{ Map }, { Marker }] = await Promise.all([
            importLibrary("maps"),
            importLibrary("marker"),
          ]);
          if (cancelled) return;
          const map = new Map(element, {
            center: { lat: center.latitude, lng: center.longitude },
            zoom: initial ? 15 : 11,
            mapTypeControl: false,
            streetViewControl: false,
          });
          const marker = new Marker({
            map,
            draggable: true,
            visible: Boolean(initial),
            position: { lat: center.latitude, lng: center.longitude },
          });
          const click = map.addListener("click", (event: google.maps.MapMouseEvent) => {
            if (!event.latLng) return;
            choose({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
          });
          const drag = marker.addListener("dragend", () => {
            const point = marker.getPosition();
            if (point) choose({ latitude: point.lat(), longitude: point.lng() });
          });
          controller.current = {
            move: (point) => {
              marker.setVisible(true);
              marker.setPosition({ lat: point.latitude, lng: point.longitude });
              map.panTo({ lat: point.latitude, lng: point.longitude });
            },
            destroy: () => {
              click.remove();
              drag.remove();
              marker.setMap(null);
            },
          };
          if (selectedPosition.current) controller.current.move(selectedPosition.current);
          setProvider("google");
          setReady(true);
          return;
        } catch {
          // Keep the picker usable if the optional Google key is unavailable.
          if (cancelled) return;
          element.replaceChildren();
        }
      }

      const map = L.map(element).setView(
        [center.latitude, center.longitude],
        initial ? 15 : 11,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const marker = L.marker([center.latitude, center.longitude], {
        draggable: true,
        icon: L.divIcon({
          className: "nashama-map-marker",
          html: "<span></span>",
          iconSize: [32, 42],
          iconAnchor: [16, 39],
        }),
      });
      if (initial) marker.addTo(map);
      map.on("click", (event: L.LeafletMouseEvent) => {
        choose({ latitude: event.latlng.lat, longitude: event.latlng.lng });
      });
      marker.on("dragend", () => {
        const point = marker.getLatLng();
        choose({ latitude: point.lat, longitude: point.lng });
      });
      controller.current = {
        move: (point) => {
          if (!map.hasLayer(marker)) marker.addTo(map);
          marker.setLatLng([point.latitude, point.longitude]);
          map.panTo([point.latitude, point.longitude]);
        },
        destroy: () => map.remove(),
      };
      if (selectedPosition.current) controller.current.move(selectedPosition.current);
      setProvider("openstreetmap");
      setReady(true);
      timeout = setTimeout(() => map.invalidateSize(), 80);
    };

    void initialize();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      controller.current?.destroy();
      controller.current = null;
    };
    // This modal is mounted afresh for each address; its initial coordinates
    // should not reinitialize the map when the marker moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const locate = () => {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع. اختر نقطة على الخريطة بدلاً من ذلك.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        choose({ latitude: coords.latitude, longitude: coords.longitude });
        setLocating(false);
      },
      () => {
        setError("تعذر تحديد موقعك. تأكد من السماح بالوصول للموقع أو اختره من الخريطة.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const fromLink = () => {
    const point = parseGoogleMapsLocation(url);
    if (!point) {
      setError("الصق رابط خرائط Google كاملاً يحتوي على الإحداثيات، أو اكتب خط العرض والطول مفصولين بفاصلة.");
      return;
    }
    choose(point);
  };

  return (
    <Modal className="map-dialog">
      <ModalTitle eyebrow="الموقع الجغرافي" title="تحديد موقع مركز الشحن" onClose={onClose} />
      <p className="map-help">
        اضغط على الموقع في الخريطة أو اسحب المؤشر. يمكنك أيضاً استخدام موقعك الحالي
        أو لصق رابط كامل من خرائط Google.
      </p>
      <div className="map-canvas" ref={mapElement} aria-label="خريطة تحديد موقع المركز" />
      <div className="map-tools">
        <button type="button" className="ghost-button" onClick={locate} disabled={locating}>
          <Crosshair size={15} /> {locating ? "جاري التحديد..." : "موقعي الحالي"}
        </button>
        <a
          href={googleMapsUrl(picked?.latitude ?? null, picked?.longitude ?? null, address || "عمّان")}
          target="_blank"
          rel="noopener noreferrer"
          className="ghost-button"
        >
          <ExternalLink size={15} /> فتح في خرائط Google
        </a>
      </div>
      <div className="map-link-input">
        <input
          aria-label="رابط الموقع من خرائط Google"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="الصق رابط الموقع من خرائط Google أو الإحداثيات"
          dir="ltr"
        />
        <button type="button" onClick={fromLink}>تحديد من الرابط</button>
      </div>
      {error && <p className="map-error" role="alert">{error}</p>}
      <div className="map-footer">
        <span>
          <MapPin size={15} />
          {picked
            ? `${picked.latitude.toFixed(6)}, ${picked.longitude.toFixed(6)}`
            : ready
              ? "لم يتم اختيار موقع بعد"
              : "جاري تحميل الخريطة..."}
        </span>
        <button
          type="button"
          className="red-button"
          disabled={!picked}
          onClick={() => picked && onConfirm(picked)}
        >
          اعتماد الموقع
        </button>
      </div>
      <small className="map-provider-note">
        {provider === "google"
          ? "خريطة Google التفاعلية"
          : "الخريطة التفاعلية من OpenStreetMap؛ يمكنك فتح الموقع في خرائط Google مباشرة."}
      </small>
    </Modal>
  );
}
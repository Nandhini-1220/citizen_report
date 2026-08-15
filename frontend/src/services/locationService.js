/**
 * Fetches high-accuracy GPS coordinates and reverse-geocodes to a readable address.
 */
export const getDeviceLocation = async () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        success: false,
        lat: 13.0827,
        lng: 80.2707,
        address: "Location unavailable (Using Default: Chennai Central)",
        error: "Geolocation not supported by browser"
      });
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        try {
          // Reverse geocode via OpenStreetMap Nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            {
              headers: {
                "Accept-Language": "en"
              }
            }
          );
          if (response.ok) {
            const data = await response.json();
            const road = data.address?.road || data.address?.suburb || data.address?.neighbourhood || "";
            const city = data.address?.city || data.address?.town || data.address?.county || "";
            if (road || city) {
              address = [road, city].filter(Boolean).join(", ");
            } else if (data.display_name) {
              address = data.display_name.split(",").slice(0, 3).join(",");
            }
          }
        } catch (e) {
          console.warn("Reverse geocoding lookup timed out or failed:", e);
        }

        resolve({
          success: true,
          lat,
          lng,
          address,
          error: null
        });
      },
      (err) => {
        console.warn("Geolocation permission denied or error:", err.message);
        resolve({
          success: false,
          lat: 13.0827,
          lng: 80.2707,
          address: "Location Permission Denied (Manual entry available)",
          error: err.message
        });
      },
      options
    );
  });
};
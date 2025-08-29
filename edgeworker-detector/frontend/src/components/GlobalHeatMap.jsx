import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default markers in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const GlobalHeatMap = ({ data = [] }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [selectedPop, setSelectedPop] = useState(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    mapInstanceRef.current = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true
    });

    // Add dark theme tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap, ©CartoDB',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !data.length) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    // Add markers for each PoP
    data.forEach(pop => {
      const { lat, lon, popCode, city, country, coldStartTime, status } = pop;
      
      if (!lat || !lon) return;

      // Determine marker color based on performance
      const getMarkerColor = (time, status) => {
        if (status === 'critical') return '#f44336';
        if (status === 'warning') return '#ff9800';
        if (time > 15) return '#f44336';
        if (time > 10) return '#ff9800';
        if (time > 5) return '#ffeb3b';
        return '#4caf50';
      };

      const color = getMarkerColor(coldStartTime, status);

      // Create custom marker
      const marker = L.circleMarker([lat, lon], {
        radius: Math.max(6, Math.min(coldStartTime * 2, 20)),
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.7
      });

      // Popup content
      const popupContent = `
        <div style="color: #333; font-family: 'Inter', sans-serif;">
          <h3 style="margin: 0 0 8px 0; color: #1976d2;">${city}, ${country}</h3>
          <p style="margin: 4px 0;"><strong>PoP Code:</strong> ${popCode}</p>
          <p style="margin: 4px 0;"><strong>Cold Start:</strong> ${coldStartTime.toFixed(2)}ms</p>
          <p style="margin: 4px 0;"><strong>Status:</strong> 
            <span style="color: ${color}; font-weight: bold;">${status.toUpperCase()}</span>
          </p>
        </div>
      `;

      marker.bindPopup(popupContent);
      
      // Add click handler
      marker.on('click', () => {
        setSelectedPop(pop);
      });

      // Add to map and track
      marker.addTo(mapInstanceRef.current);
      markersRef.current.push(marker);
    });
  }, [data]);

  return (
    <Box sx={{ height: 400, position: 'relative' }}>
      <div 
        ref={mapRef} 
        style={{ 
          height: '100%', 
          width: '100%',
          borderRadius: 8,
          overflow: 'hidden'
        }} 
      />
      
      {/* Legend */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 16, 
          right: 16, 
          bgcolor: 'rgba(0, 0, 0, 0.8)', 
          p: 2, 
          borderRadius: 1,
          backdropFilter: 'blur(10px)'
        }}
      >
        <Typography variant="subtitle2" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
          Performance Legend
        </Typography>
        {[
          { color: '#4caf50', label: '< 5ms (Excellent)' },
          { color: '#ffeb3b', label: '5-10ms (Good)' },
          { color: '#ff9800', label: '10-15ms (Warning)' },
          { color: '#f44336', label: '> 15ms (Critical)' }
        ].map((item, index) => (
          <Box key={index} display="flex" alignItems="center" mt={0.5}>
            <Box 
              sx={{ 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                bgcolor: item.color, 
                mr: 1,
                border: '1px solid rgba(255,255,255,0.3)'
              }} 
            />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Selected PoP Info */}
      {selectedPop && (
        <Box 
          sx={{ 
            position: 'absolute', 
            bottom: 16, 
            left: 16, 
            bgcolor: 'background.paper', 
            p: 2, 
            borderRadius: 1,
            minWidth: 200,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {selectedPop.city}, {selectedPop.country}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cold Start: {selectedPop.coldStartTime.toFixed(2)}ms
          </Typography>
          <Chip 
            label={selectedPop.status.toUpperCase()} 
            size="small" 
            color={selectedPop.status === 'healthy' ? 'success' : selectedPop.status === 'warning' ? 'warning' : 'error'}
            sx={{ mt: 1 }}
          />
        </Box>
      )}
    </Box>
  );
};

export default GlobalHeatMap;
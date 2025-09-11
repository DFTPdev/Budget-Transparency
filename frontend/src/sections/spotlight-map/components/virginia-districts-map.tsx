'use client';

import { useRef, useEffect, useState } from 'react';
import { Box, useTheme, Typography } from '@mui/material';

interface DistrictData {
  id: string;
  name: string;
  representative: string;
  party: 'R' | 'D' | 'I';
  totalBudget: number;
  population: number;
  perCapitaSpending: number;
}

interface VirginiaDistrictsMapProps {
  districts: DistrictData[];
  selectedDistrict: DistrictData | null;
  hoveredDistrict: DistrictData | null;
  onDistrictClick: (district: DistrictData) => void;
  onDistrictHover: (district: DistrictData | null) => void;
  filteredDistricts?: string[];
}

export function VirginiaDistrictsMap({
  districts,
  selectedDistrict,
  hoveredDistrict,
  onDistrictClick,
  onDistrictHover,
  filteredDistricts
}: VirginiaDistrictsMapProps) {
  const theme = useTheme();
  const svgRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [svgLoaded, setSvgLoaded] = useState(false);

  // Load and process the SVG
  useEffect(() => {
    // Use the optimized fallback SVG directly for better performance
    // The original SVG is 23MB and causes performance issues
    createFallbackSVG();
  }, []);

  // Create fallback SVG if loading fails
  const createFallbackSVG = () => {
    if (!svgRef.current) return;

    // Create a simplified interactive SVG with district numbers positioned like Virginia
    const districtPositions = [
      { id: 1, x: 531, y: 84 }, { id: 2, x: 468, y: 160 }, { id: 3, x: 402, y: 240 },
      { id: 4, x: 372, y: 290 }, { id: 5, x: 308, y: 298 }, { id: 6, x: 157, y: 324 },
      { id: 7, x: 349, y: 349 }, { id: 8, x: 423, y: 282 }, { id: 9, x: 488, y: 345 },
      { id: 10, x: 542, y: 249 }, { id: 11, x: 479, y: 225 }, { id: 12, x: 589, y: 277 },
      { id: 13, x: 627, y: 311 }, { id: 14, x: 620, y: 265 }, { id: 15, x: 602, y: 267 },
      { id: 16, x: 595, y: 244 }, { id: 17, x: 658, y: 354 }, { id: 18, x: 744, y: 129 },
      { id: 19, x: 799, y: 145 }, { id: 20, x: 801, y: 105 }, { id: 21, x: 761, y: 108 },
      { id: 22, x: 783, y: 126 }, { id: 23, x: 737, y: 64 }, { id: 24, x: 710, y: 296 },
      { id: 25, x: 644, y: 207 }, { id: 26, x: 701, y: 268 }, { id: 27, x: 603, y: 159 },
      { id: 28, x: 552, y: 150 }, { id: 29, x: 74, y: 177 }, { id: 30, x: 41, y: 132 },
      { id: 31, x: 571, y: 91 }, { id: 32, x: 65, y: 78 }, { id: 33, x: 109, y: 159 },
      { id: 34, x: 147, y: 155 }, { id: 35, x: 129, y: 127 }, { id: 36, x: 79, y: 118 },
      { id: 37, x: 123, y: 104 }, { id: 38, x: 106, y: 79 }, { id: 39, x: 164, y: 126 },
      { id: 40, x: 156, y: 107 }
    ];

    const fallbackSVG = `
      <svg viewBox="0 0 850 395" xmlns="http://www.w3.org/2000/svg">
        <rect width="850" height="395" fill="${theme.palette.background.default}" stroke="${theme.palette.divider}"/>
        <defs>
          <style>
            .district-text {
              font-family: Arial, sans-serif;
              font-weight: 700;
              font-size: 10.43px;
              cursor: pointer;
              transition: all 0.3s ease;
            }
            .district-circle {
              fill: transparent;
              cursor: pointer;
            }
          </style>
        </defs>
        ${districtPositions.map(pos => {
          const district = districts.find(d => d.id === `district-${pos.id}`);
          const fill = district?.party === 'D' ? theme.palette.info.main :
                      district?.party === 'R' ? theme.palette.error.main :
                      theme.palette.text.primary;

          return `
            <circle class="district-circle" cx="${pos.x}" cy="${pos.y}" r="15" data-district-id="district-${pos.id}"/>
            <text class="district-text" x="${pos.x}" y="${pos.y + 4}" text-anchor="middle" fill="${fill}" data-district-id="district-${pos.id}">
              ${pos.id}
            </text>
          `;
        }).join('')}
      </svg>
    `;

    svgRef.current.innerHTML = fallbackSVG;
    setSvgLoaded(true);

    // Add interactivity to fallback SVG
    setTimeout(() => {
      processSVGInteractivity();
    }, 100);
  };

  // Add interactivity to SVG elements
  const processSVGInteractivity = () => {
    if (!svgRef.current) return;

    const svg = svgRef.current.querySelector('svg');
    if (!svg) return;

    // Find all text elements with district numbers
    const textElements = svg.querySelectorAll('text');

    textElements.forEach((textElement) => {
      const tspan = textElement.querySelector('tspan');
      if (!tspan) return;

      const districtNumber = tspan.textContent?.trim();
      if (!districtNumber || isNaN(parseInt(districtNumber))) return;

      // Find corresponding district data
      const districtId = `district-${districtNumber}`;
      const district = districts.find(d => d.id === districtId);
      if (!district) return;

      // Create larger clickable area around text for better UX
      const bbox = textElement.getBBox();
      const clickArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

      // Use circle for better click target
      const centerX = bbox.x + bbox.width / 2;
      const centerY = bbox.y + bbox.height / 2;
      const radius = Math.max(bbox.width, bbox.height) / 2 + 15;

      clickArea.setAttribute('cx', centerX.toString());
      clickArea.setAttribute('cy', centerY.toString());
      clickArea.setAttribute('r', radius.toString());
      clickArea.setAttribute('fill', 'transparent');
      clickArea.setAttribute('cursor', 'pointer');
      clickArea.setAttribute('data-district-id', districtId);
      clickArea.setAttribute('data-district-number', districtNumber);

      // Add event listeners
      clickArea.addEventListener('click', () => handleDistrictClick(district));
      clickArea.addEventListener('mouseenter', (e) => handleDistrictMouseEnter(district, e));
      clickArea.addEventListener('mousemove', handleDistrictMouseMove);
      clickArea.addEventListener('mouseleave', handleDistrictMouseLeave);
      clickArea.addEventListener('touchstart', (e) => handleDistrictMouseEnter(district, e));
      clickArea.addEventListener('touchend', handleDistrictMouseLeave);

      // Insert click area before text element
      textElement.parentNode?.insertBefore(clickArea, textElement);

      // Also make the text element itself clickable
      textElement.style.cursor = 'pointer';
      textElement.addEventListener('click', () => handleDistrictClick(district));
      textElement.addEventListener('mouseenter', (e) => handleDistrictMouseEnter(district, e));
      textElement.addEventListener('mouseleave', handleDistrictMouseLeave);
    });
  };

  // Update district styling based on state
  useEffect(() => {
    if (!svgLoaded || !svgRef.current) return;

    const svg = svgRef.current.querySelector('svg');
    if (!svg) return;

    // Reset all text elements to default style
    const textElements = svg.querySelectorAll('text');
    textElements.forEach((textElement) => {
      const tspan = textElement.querySelector('tspan');
      if (!tspan) return;

      const districtNumber = tspan.textContent?.trim();
      if (!districtNumber) return;

      const districtId = `district-${districtNumber}`;
      const district = districts.find(d => d.id === districtId);
      if (!district) return;

      const isSelected = selectedDistrict?.id === district.id;
      const isHovered = hoveredDistrict?.id === district.id;
      const isFiltered = filteredDistricts && !filteredDistricts.includes(district.id);

      // Apply styling based on state
      let fill = theme.palette.text.primary;
      let fontSize = '10.43px';
      let fontWeight = '700';
      let opacity = 1;
      let filter = 'none';

      // Party colors
      if (district.party === 'D') {
        fill = theme.palette.info.main;
      } else if (district.party === 'R') {
        fill = theme.palette.error.main;
      }

      // Hover state
      if (isHovered) {
        fill = theme.palette.primary.main;
        fontSize = '12px';
        filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))';
      }

      // Selected state
      if (isSelected) {
        fill = theme.palette.success.main;
        fontSize = '14px';
        fontWeight = '900';
        filter = 'drop-shadow(0 4px 8px rgba(34, 197, 94, 0.5))';
      }

      // Filtered state
      if (isFiltered) {
        opacity = 0.3;
        fill = theme.palette.grey[400];
      }

      // Apply styles
      textElement.style.fill = fill;
      textElement.style.fontSize = fontSize;
      textElement.style.fontWeight = fontWeight;
      textElement.style.opacity = opacity.toString();
      textElement.style.filter = filter;
      textElement.style.transition = 'all 0.3s ease';
    });
  }, [selectedDistrict, hoveredDistrict, filteredDistricts, districts, theme, svgLoaded]);

  const handleDistrictClick = (district: DistrictData) => {
    onDistrictClick(district);
  };

  const handleDistrictMouseEnter = (district: DistrictData, event: MouseEvent | TouchEvent) => {
    onDistrictHover(district);
    
    const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX;
    const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY;
    
    setTooltipPosition({ x: clientX, y: clientY });
    setShowTooltip(true);
  };

  const handleDistrictMouseMove = (event: MouseEvent) => {
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleDistrictMouseLeave = () => {
    onDistrictHover(null);
    setShowTooltip(false);
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: { xs: 350, sm: 450, md: 500 },
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: theme.palette.background.paper,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* SVG Container */}
      <Box
        ref={svgRef}
        sx={{
          width: '100%',
          height: '100%',
          '& svg': {
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
          }
        }}
      />

      {/* Loading State */}
      {!svgLoaded && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Loading Virginia Districts Map...
          </Typography>
        </Box>
      )}

      {/* Floating Tooltip */}
      {showTooltip && hoveredDistrict && (
        <Box
          sx={{
            position: 'fixed',
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            zIndex: 1000,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            p: 1.5,
            boxShadow: theme.shadows[8],
            pointerEvents: 'none',
            maxWidth: 250,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {hoveredDistrict.name}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
            {hoveredDistrict.representative} ({hoveredDistrict.party === 'D' ? 'Democrat' : 'Republican'})
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
            <strong>Total Budget:</strong> ${(hoveredDistrict.totalBudget / 1000000).toFixed(1)}M
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
            <strong>Population:</strong> {hoveredDistrict.population.toLocaleString()}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
            <strong>Per Capita:</strong> ${hoveredDistrict.perCapitaSpending.toLocaleString()}
          </Typography>
        </Box>
      )}

      {/* Instructions */}
      {svgLoaded && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            p: 1,
            opacity: 0.9,
            maxWidth: 200,
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            💡 Click on any district number to view details
          </Typography>
        </Box>
      )}
    </Box>
  );
}

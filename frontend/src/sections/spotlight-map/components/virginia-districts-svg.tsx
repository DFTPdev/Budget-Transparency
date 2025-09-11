'use client';

import { useRef, useEffect, useState } from 'react';
import { Box, useTheme, Tooltip, Typography } from '@mui/material';

interface DistrictData {
  id: string;
  name: string;
  representative: string;
  party: 'R' | 'D' | 'I';
  totalBudget: number;
  population: number;
  perCapitaSpending: number;
}

interface VirginiaDistrictsSVGProps {
  districts: DistrictData[];
  selectedDistrict: DistrictData | null;
  hoveredDistrict: DistrictData | null;
  onDistrictClick: (district: DistrictData) => void;
  onDistrictHover: (district: DistrictData | null) => void;
  filteredDistricts?: string[];
}

export function VirginiaDistrictsSVG({
  districts,
  selectedDistrict,
  hoveredDistrict,
  onDistrictClick,
  onDistrictHover,
  filteredDistricts
}: VirginiaDistrictsSVGProps) {
  const theme = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  // District path data - simplified representation of Virginia districts
  const districtPaths = {
    'district-1': 'M50,100 L150,100 L150,200 L50,200 Z', // Northern VA
    'district-2': 'M150,100 L250,100 L250,200 L150,200 Z', // Richmond Metro
    'district-3': 'M250,100 L350,100 L350,200 L250,200 Z', // Hampton Roads
    'district-4': 'M50,200 L150,200 L150,300 L50,300 Z', // Shenandoah Valley
    'district-5': 'M150,200 L250,200 L250,300 L150,300 Z', // Southwest VA
    'district-6': 'M250,200 L350,200 L350,300 L250,300 Z', // Central VA
    'district-7': 'M50,300 L150,300 L150,400 L50,400 Z', // Southside
    'district-8': 'M150,300 L250,300 L250,400 L150,400 Z', // Eastern Shore
  };

  const getDistrictStyle = (district: DistrictData) => {
    const isSelected = selectedDistrict?.id === district.id;
    const isHovered = hoveredDistrict?.id === district.id;
    const isFiltered = filteredDistricts && !filteredDistricts.includes(district.id);
    
    let fill = theme.palette.grey[300];
    let stroke = theme.palette.grey[400];
    let strokeWidth = 1;
    let opacity = 1;

    // Party colors
    if (district.party === 'D') {
      fill = theme.palette.info.light;
    } else if (district.party === 'R') {
      fill = theme.palette.error.light;
    }

    // Hover state
    if (isHovered) {
      fill = theme.palette.primary.light;
      stroke = theme.palette.primary.main;
      strokeWidth = 2;
    }

    // Selected state
    if (isSelected) {
      fill = theme.palette.success.light;
      stroke = theme.palette.success.main;
      strokeWidth = 3;
    }

    // Filtered state
    if (isFiltered) {
      opacity = 0.3;
      fill = theme.palette.grey[200];
    }

    return {
      fill,
      stroke,
      strokeWidth,
      opacity,
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      filter: isSelected ? 'drop-shadow(0 4px 8px rgba(34, 197, 94, 0.3))' : 
              isHovered ? 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))' : 'none'
    };
  };

  const handleDistrictClick = (district: DistrictData) => {
    onDistrictClick(district);
  };

  const handleDistrictMouseEnter = (district: DistrictData, event: React.MouseEvent) => {
    onDistrictHover(district);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
    setShowTooltip(true);
  };

  const handleDistrictMouseMove = (event: React.MouseEvent) => {
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
      <svg
        ref={svgRef}
        viewBox="0 0 400 450"
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          touchAction: 'manipulation',
        }}
      >
        {/* Background */}
        <rect
          width="400"
          height="450"
          fill={theme.palette.background.default}
        />
        
        {/* District paths */}
        {districts.map((district) => {
          const pathData = districtPaths[district.id as keyof typeof districtPaths];
          if (!pathData) return null;

          const style = getDistrictStyle(district);

          return (
            <g key={district.id}>
              <path
                d={pathData}
                {...style}
                onClick={() => handleDistrictClick(district)}
                onMouseEnter={(e) => handleDistrictMouseEnter(district, e)}
                onMouseMove={handleDistrictMouseMove}
                onMouseLeave={handleDistrictMouseLeave}
                onTouchStart={(e) => handleDistrictMouseEnter(district, e as any)}
                onTouchEnd={handleDistrictMouseLeave}
              />
              
              {/* District label */}
              <text
                x={pathData.includes('M50') ? 100 : pathData.includes('M150') ? 200 : 300}
                y={pathData.includes(',100') ? 150 : pathData.includes(',200') ? 250 : pathData.includes(',300') ? 350 : 400}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={theme.palette.text.primary}
                fontSize="12"
                fontWeight="bold"
                pointerEvents="none"
                style={{
                  textShadow: '1px 1px 2px rgba(255, 255, 255, 0.8)',
                  opacity: style.opacity
                }}
              >
                {district.name.split(' ')[1]}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(20, 20)">
          <rect
            width="120"
            height="80"
            fill={theme.palette.background.paper}
            stroke={theme.palette.divider}
            strokeWidth="1"
            rx="4"
            opacity="0.95"
          />
          
          <text
            x="10"
            y="20"
            fill={theme.palette.text.primary}
            fontSize="10"
            fontWeight="bold"
          >
            Party Affiliation
          </text>
          
          <circle
            cx="20"
            cy="35"
            r="6"
            fill={theme.palette.info.light}
          />
          <text
            x="35"
            y="40"
            fill={theme.palette.text.primary}
            fontSize="9"
          >
            Democrat
          </text>
          
          <circle
            cx="20"
            cy="55"
            r="6"
            fill={theme.palette.error.light}
          />
          <text
            x="35"
            y="60"
            fill={theme.palette.text.primary}
            fontSize="9"
          >
            Republican
          </text>
        </g>

        {/* Instructions */}
        <g transform="translate(20, 380)">
          <rect
            width="200"
            height="40"
            fill={theme.palette.background.paper}
            stroke={theme.palette.divider}
            strokeWidth="1"
            rx="4"
            opacity="0.95"
          />
          
          <text
            x="10"
            y="20"
            fill={theme.palette.text.secondary}
            fontSize="9"
          >
            💡 Click on any district to view details
          </text>
          
          <text
            x="10"
            y="35"
            fill={theme.palette.text.secondary}
            fontSize="9"
          >
            Hover for quick info
          </text>
        </g>
      </svg>

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
    </Box>
  );
}

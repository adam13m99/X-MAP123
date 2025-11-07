// Enhanced script.js with Multi-Platform Vendor Support and Auto-Refresh Timer System
document.addEventListener('DOMContentLoaded', () => {
    let map;
    let vendorLayerGroup = L.featureGroup();
    let polygonLayerGroup = L.featureGroup();
    let coverageGridLayerGroup = L.featureGroup();
    let csvMarkersLayerGroup = L.featureGroup();
    let heatmapLayer;
    let tempLocationMarker = null; 
    let currentHeatmapType = 'none';
    let showVendorRadius = true;
    let vendorsAreVisible = true;
    let allVendorsData = [];
    let allPolygonsData = null;
    let allCoverageGridData = [];
    let initialFilterData = {};
    let lastHeatmapData = null;
    let currentRadiusModifier = 1.0;
    let currentRadiusMode = 'percentage'; // Can be 'percentage', 'fixed', 'grade', or 'grade-dynamic'
    let currentRadiusFixed = 3.0;
    let gradeRadiusSettings = {}; // Store custom radius for each grade
    let marketingAreasOnTop = false;
    
    // CSV marker customization settings
    let csvMarkerSettings = {
        color: '#ff9800',
        size: 14
    };
    
    // NEW: Dynamic Targets management
    let dynamicTargetsEnabled = false;
    let dynamicTargetsData = {}; // Store custom targets: {city: {business_line: {area_name: target_value}}}
    let staticTargetsData = {}; // Store static CSV targets: {city: {business_line: {area_name: target_value}}}
    
    // NEW: Multi-platform vendor management
    let currentVendorMapType = 'tapsifood_only';
    let vendorMapTypeOptions = [];

    // NEW: Historical view management
    let currentViewMode = 'live'; // 'live' or 'historical'
    let historicalTimelineData = null;
    let currentHistoricalHour = null;
    let isTimelineScrubbing = false;

    // NEW: Timeline playback controls
    let isPlaying = false;
    let playbackInterval = null;
    let playbackSpeed = 1000; // milliseconds between steps (1x normal speed)
    let currentVendorCount = 0;
    let isLoadingData = false; // Track if data is currently loading
    let playbackDelayTimeout = null; // For 5-second delay after loading

    // Heatmap management variables
    let currentZoomLevel = 11;
    let heatmapConfig = {
        autoOptimize: true,
        baseRadius: 25,
        baseBlur: 15,
        maxIntensity: 1.0,
        smoothTransitions: true,
        zoomIndependent: true
    };
    let lastOptimalParams = null;

    const API_BASE_URL = '/api';
    
    // --- DOM Elements ---
    const bodyEl = document.body;
    const daterangeStartEl = document.getElementById('daterange-start');
    const daterangeEndEl = document.getElementById('daterange-end');
    const cityEl = document.getElementById('city');
    const areaMainTypeEl = document.getElementById('area-main-type');
    const vendorCodesFilterEl = document.getElementById('vendor-codes-filter');
    const vendorVisibleEl = document.getElementById('vendor-visible');
    const vendorIsOpenEl = document.getElementById('vendor-is-open');
    const vendorRadiusToggleBtn = document.getElementById('vendor-radius-toggle');
    const radiusEdgeColorEl = document.getElementById('radius-edge-color');
    const radiusInnerColorEl = document.getElementById('radius-inner-color');
    const radiusInnerNoneEl = document.getElementById('radius-inner-none');
    const vendorMarkerSizeEl = document.getElementById('vendor-marker-size');
    const markerSizeValueEl = document.getElementById('marker-size-value');
    const areaFillColorEl = document.getElementById('area-fill-color');
    const areaFillNoneEl = document.getElementById('area-fill-none');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const extractVendorsBtn = document.getElementById('extract-vendors-btn');
    
    // NEW: Multi-platform vendor elements
    const vendorMapTypeEl = document.getElementById('vendor-map-type');
    const isExpressFilterEl = document.getElementById('is-express');
    const isExpressFilterContainer = document.getElementById('is-express-filter-container');
    const isDualFilterEl = document.getElementById('is-dual');
    const isDualFilterContainer = document.getElementById('is-dual-filter-container');
    const isOwnDeliveryEl = document.getElementById('is-own-delivery');
    const isOfoodDeliveryEl = document.getElementById('is-ofood-delivery');
    const deliveryFiltersContainer = document.getElementById('delivery-filters-container');
    const availabilityFilterEl = document.getElementById('availability-filter');
    const availabilityFilterContainer = document.getElementById('availability-filter-container');
    
    // NEW: Delivery rate filter elements
    const ofoodDeliveryRateMinEl = document.getElementById('ofood-delivery-rate-min');
    const ofoodDeliveryRateMaxEl = document.getElementById('ofood-delivery-rate-max');
    const ofoodDeliveryRateClearBtn = document.getElementById('ofood-delivery-rate-clear');
    const ownDeliveryRateMinEl = document.getElementById('own-delivery-rate-min');
    const ownDeliveryRateMaxEl = document.getElementById('own-delivery-rate-max');
    const ownDeliveryRateClearBtn = document.getElementById('own-delivery-rate-clear');

    // NEW: Historical view control elements
    const viewLiveEl = document.getElementById('view-live');
    const viewHistoricalEl = document.getElementById('view-historical');
    const timelineControlsEl = document.getElementById('timeline-controls');
    const timelineSliderEl = document.getElementById('timeline-slider');
    const timelineTimestampEl = document.getElementById('timeline-timestamp');
    const timelineStartEl = document.getElementById('timeline-start');
    const timelineEndEl = document.getElementById('timeline-end');

    // NEW: Enhanced timeline status elements
    const currentHourIdxEl = document.getElementById('current-hour-idx');
    const totalHoursEl = document.getElementById('total-hours');
    const currentDatetimeEl = document.getElementById('current-datetime');
    const currentVendorCountEl = document.getElementById('current-vendor-count');

    // NEW: Playback control elements
    const stepBackwardEl = document.getElementById('step-backward');
    const playPauseEl = document.getElementById('play-pause');
    const stepForwardEl = document.getElementById('step-forward');
    const playbackSpeedSelectEl = document.getElementById('playback-speed-select');

    // NEW: Historical flash notification elements
    const historicalFlashEl = document.getElementById('historical-flash');
    const flashDismissEl = document.getElementById('flash-dismiss');
    const timelineCollapseBtn = document.getElementById('timeline-collapse-btn');
    const timelineContentEl = document.getElementById('timeline-content');

    // Radius modifier elements
    const vendorRadiusModifierEl = document.getElementById('vendor-radius-modifier');
    const radiusModifierValueEl = document.getElementById('radius-modifier-value');
    const btnResetRadius = document.getElementById('btn-reset-radius');
    
    // Radius mode elements
    const radiusModeSelector = document.getElementById('radius-mode-selector');
    const radiusPercentageControl = document.getElementById('radius-percentage-control');
    const radiusFixedControl = document.getElementById('radius-fixed-control');
    const vendorRadiusFixedEl = document.getElementById('vendor-radius-fixed');
    const radiusFixedValueEl = document.getElementById('radius-fixed-value');
    const radiusGradeDynamicControl = document.getElementById('radius-grade-dynamic-control');
    const gradeRadiusControlsContainer = document.getElementById('grade-radius-controls');
    
    // Grid visualization elements
    const gridBlurEl = document.getElementById('grid-blur');
    const gridBlurValueEl = document.getElementById('grid-blur-value');
    const gridFadeEl = document.getElementById('grid-fade');
    const gridFadeValueEl = document.getElementById('grid-fade-value');
    const marketingAreasOnTopBtn = document.getElementById('marketing-areas-on-top');
    const gridVisualizationSection = document.getElementById('grid-visualization-section');
    const gridPointSizeEl = document.getElementById('grid-point-size');
    const gridPointSizeValueEl = document.getElementById('grid-point-size-value');
    
    // Lat/Lng finder elements
    const latFinderInputEl = document.getElementById('lat-finder-input');
    const lngFinderInputEl = document.getElementById('lng-finder-input');
    const btnFindLocation = document.getElementById('btn-find-location');
    
    // CSV file upload elements
    const csvFileInputEl = document.getElementById('csv-file-input');
    const btnClearCsvMarkers = document.getElementById('btn-clear-csv-markers');
    const csvMarkerControlsEl = document.getElementById('csv-marker-controls');
    const csvMarkerColorEl = document.getElementById('csv-marker-color');
    const csvMarkerSizeEl = document.getElementById('csv-marker-size');
    const csvMarkerSizeValueEl = document.getElementById('csv-marker-size-value');
    const btnApplyCsvStyle = document.getElementById('btn-apply-csv-style');
    
    // Dynamic Targets elements
    const dynamicTargetsButton = document.getElementById('dynamic-targets-button');
    const dynamicTargetsModal = document.getElementById('dynamic-targets-modal');
    const dynamicTargetsModalClose = document.getElementById('dynamic-targets-modal-close');
    const dynamicTargetsModalContent = document.getElementById('dynamic-targets-modal-content');
    const dynamicTargetsReset = document.getElementById('dynamic-targets-reset');
    const dynamicTargetsSave = document.getElementById('dynamic-targets-save');
    const modalSelectedCity = document.getElementById('modal-selected-city');
    const modalSelectedBusinessLine = document.getElementById('modal-selected-business-line');
    
    // Vendor Grade Clear/Select All buttons
    const vendorGradeClearAllBtn = document.getElementById('vendor-grade-clear-all');
    const vendorGradeSelectAllBtn = document.getElementById('vendor-grade-select-all');
    const vendorGradeACBtn = document.getElementById('vendor-grade-a-c');

    // Vendor Status ID Clear/Select All buttons
    const vendorStatusClearAllBtn = document.getElementById('vendor-status-clear-all');
    const vendorStatusSelectAllBtn = document.getElementById('vendor-status-select-all');

    // Vendor Status Text Clear/Select All buttons
    const vendorStatusTextClearAllBtn = document.getElementById('vendor-status-text-clear-all');
    const vendorStatusTextSelectAllBtn = document.getElementById('vendor-status-text-select-all');
    
    // Global target elements
    const globalTargetInput = document.getElementById('global-target-input');
    const applyGlobalTargetBtn = document.getElementById('apply-global-target');
    
    const vendorAreaMainTypeEl = document.getElementById('vendor-area-main-type');
    const globalLoadingOverlayEl = document.getElementById('map-loading-overlay-wrapper');
    
    const mapTypeButtons = {
        densityTotal: document.getElementById('btn-order-density-total'),
        densityOrganic: document.getElementById('btn-order-density-organic'),
        densityNonOrganic: document.getElementById('btn-order-density-non-organic'),
        userDensity: document.getElementById('btn-user-density-heatmap'),
        population: document.getElementById('btn-population-heatmap'),
        vendors: document.getElementById('btn-vendors-map'),
    };
    const btnToggleVendors = document.getElementById('btn-toggle-vendors');
    const btnClearHeatmap = document.getElementById('btn-clear-heatmap');
    
    // Heatmap control elements
    const heatmapRadiusEl = document.getElementById('heatmap-radius');
    const heatmapRadiusValueEl = document.getElementById('heatmap-radius-value');
    const heatmapBlurEl = document.getElementById('heatmap-blur');
    const heatmapBlurValueEl = document.getElementById('heatmap-blur-value');
    const heatmapMaxValEl = document.getElementById('heatmap-max-val');
    const heatmapMaxValValueEl = document.getElementById('heatmap-max-val-value');

    const customFilterConfigs = {
        areaSubType: {
            button: document.getElementById('area-sub-type-filter-button'),
            panel: document.getElementById('area-sub-type-filter-panel'),
            paramName: 'area_sub_type_filter', defaultText: 'Select Sub Types', optionsData: []
        },
        businessLine: {
            button: document.getElementById('business-line-filter-button'),
            panel: document.getElementById('business-line-filter-panel'),
            paramName: 'business_lines', defaultText: 'Select Business Lines', optionsData: []
        },
        vendorStatus: { 
            button: document.getElementById('vendor-status-filter-button'),
            panel: document.getElementById('vendor-status-filter-panel'),
            paramName: 'vendor_status_ids', defaultText: 'Select Statuses', optionsData: []
        },
        vendorGrade: { 
            button: document.getElementById('vendor-grade-filter-button'),
            panel: document.getElementById('vendor-grade-filter-panel'),
            paramName: 'vendor_grades', defaultText: 'Select Grades', optionsData: []
        },
        vendorStatusText: {
            button: document.getElementById('vendor-status-text-filter-button'),
            panel: document.getElementById('vendor-status-text-filter-panel'),
            paramName: 'vendor_status_filter', defaultText: 'Select Vendor Status', optionsData: []
        },
        vendorAreaSubType: {
            button: document.getElementById('vendor-area-sub-type-filter-button'),
            panel: document.getElementById('vendor-area-sub-type-filter-panel'),
            paramName: 'vendor_area_sub_type', defaultText: 'Select Sub Areas', optionsData: []
        }
    };

    let defaultVendorIcon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [12 * 2, 12 * (41/25) * 2],
        iconAnchor: [12, 12 * (41/25) * 2],
        popupAnchor: [0, -12 * (41/25) * 2],
        shadowSize: [12 * (41/25) * 2, 12 * (41/25) * 2],
    });

    // Helper functions for coverage grid normalization and hardening
    function toNum(x, fallback = null) {
        const n = Number(x);
        return Number.isFinite(n) ? n : fallback;
    }

    function normalizeCoverageGridPayload(payload) {
        const root =
            Array.isArray(payload) ? payload :
            Array.isArray(payload?.coverage_grid) ? payload.coverage_grid :
            Array.isArray(payload?.coverageGrid) ? payload.coverageGrid :
            Array.isArray(payload?.grid?.points) ? payload.grid.points :
            [];

        return root.map(p => {
            const lat = toNum(p.lat ?? p.latitude);
            const lng = toNum(p.lng ?? p.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            const coverage = p.coverage ?? {};
            return {
                lat,
                lng,
                marketing_area: p.marketing_area ?? p.area_name ?? null,
                target_business_line: p.target_business_line ?? p.bl ?? null,
                target_value: toNum(p.target_value),
                actual_value: toNum(p.actual_value ?? p.actual),
                performance_ratio: toNum(
                    p.performance_ratio,
                    (toNum(p.actual_value) != null && toNum(p.target_value) > 0)
                        ? (toNum(p.actual_value) / toNum(p.target_value))
                        : null
                ),
                coverage: {
                    total_vendors: toNum(coverage.total_vendors ?? p.total_vendors ?? 0, 0),
                    by_business_line: coverage.by_business_line ?? p.by_business_line ?? {},
                    by_grade: coverage.by_grade ?? p.by_grade ?? {}
                }
            };
        }).filter(Boolean);
    }

    // Enhanced heatmap configuration functions
    function calculateOptimalHeatmapParams(data, zoomLevel) {
        if (!data || data.length === 0) {
            return { max: 1.0, radius: 25, blur: 15 };
        }

        const values = data.map(point => point.value).filter(v => v != null && !isNaN(v));
        if (values.length === 0) {
            return { max: 1.0, radius: 25, blur: 15 };
        }

        // Calculate percentiles for robust statistics
        values.sort((a, b) => a - b);
        const p75 = values[Math.floor(values.length * 0.75)];
        const p90 = values[Math.floor(values.length * 0.90)];
        const p95 = values[Math.floor(values.length * 0.95)];

        // Set max to 90th percentile to avoid outlier dominance
        let optimalMax = p90 / 100.0;
        if (optimalMax <= 0) optimalMax = 1.0;
        
        // Zoom-dependent radius scaling
        let radiusMultiplier = 1.0;
        if (zoomLevel <= 10) {
            radiusMultiplier = 1.8;
        } else if (zoomLevel <= 12) {
            radiusMultiplier = 1.4;
        } else if (zoomLevel >= 16) {
            radiusMultiplier = 0.7;
        } else if (zoomLevel >= 14) {
            radiusMultiplier = 0.85;
        }

        const optimalRadius = Math.round(heatmapConfig.baseRadius * radiusMultiplier);

        // Data density-dependent blur
        const dataDensity = data.length / 1000;
        let blurMultiplier = 1.0;
        if (dataDensity > 3) {
            blurMultiplier = 1.4;  // More blur for very dense data
        } else if (dataDensity > 1.5) {
            blurMultiplier = 1.2;  // Slightly more blur for dense data
        } else if (dataDensity < 0.5) {
            blurMultiplier = 0.8;  // Less blur for sparse data
        }

        const optimalBlur = Math.round(heatmapConfig.baseBlur * blurMultiplier);

        return {
            max: Math.max(0.1, Math.min(3.0, optimalMax)),
            radius: Math.max(5, Math.min(60, optimalRadius)),
            blur: Math.max(5, Math.min(40, optimalBlur))
        };
    }

    function getZoomAdjustedHeatmapOptions() {
        const currentZoom = map.getZoom();
        const userRadius = parseInt(heatmapRadiusEl.value);
        const userBlur = parseInt(heatmapBlurEl.value);
        const userMax = parseFloat(heatmapMaxValEl.value);
        
        if (!heatmapConfig.autoOptimize) {
            // Use user-defined values with minimal zoom adjustment
            const zoomFactor = Math.pow(1.1, currentZoom - 11); // Reference zoom 11
            return {
                radius: Math.round(userRadius * Math.min(2, Math.max(0.5, zoomFactor))),
                blur: userBlur,
                max: userMax,
                minOpacity: 0.3
            };
        }

        // Auto-optimize mode
        if (lastOptimalParams && heatmapConfig.smoothTransitions) {
            // Smooth transition to new optimal parameters
            const optimal = calculateOptimalHeatmapParams(lastHeatmapData, currentZoom);
            return {
                radius: Math.round((lastOptimalParams.radius + optimal.radius) / 2),
                blur: Math.round((lastOptimalParams.blur + optimal.blur) / 2),
                max: (lastOptimalParams.max + optimal.max) / 2,
                minOpacity: 0.3
            };
        }

        return calculateOptimalHeatmapParams(lastHeatmapData, currentZoom);
    }

    function updateHeatmapControlsDisplay(optimalParams) {
        if (!heatmapConfig.autoOptimize || !optimalParams) return;

        // Update sliders to show optimal values without triggering events
        const originalRadiusHandler = heatmapRadiusEl.oninput;
        const originalBlurHandler = heatmapBlurEl.oninput;
        const originalMaxHandler = heatmapMaxValEl.oninput;

        heatmapRadiusEl.oninput = null;
        heatmapBlurEl.oninput = null;
        heatmapMaxValEl.oninput = null;

        heatmapRadiusEl.value = optimalParams.radius;
        heatmapRadiusValueEl.textContent = optimalParams.radius;

        heatmapBlurEl.value = optimalParams.blur;
        heatmapBlurValueEl.textContent = optimalParams.blur;

        heatmapMaxValEl.value = optimalParams.max.toFixed(1);
        heatmapMaxValValueEl.textContent = optimalParams.max.toFixed(1);

        // Restore event handlers
        setTimeout(() => {
            heatmapRadiusEl.oninput = originalRadiusHandler;
            heatmapBlurEl.oninput = originalBlurHandler;
            heatmapMaxValEl.oninput = originalMaxHandler;
        }, 100);
    }

    function updateVendorIconSize(baseSize) { 
        const aspectRatio = 41/25;
        const iconWidth = parseInt(baseSize);
        const iconHeight = parseInt(iconWidth * aspectRatio);
        defaultVendorIcon = L.icon({
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [iconWidth, iconHeight],
            iconAnchor: [iconWidth / 2, iconHeight],
            popupAnchor: [0, -iconHeight + 5],
            shadowSize: [iconWidth * 1.5, iconHeight * 1.5],
            shadowAnchor: [iconWidth / 3, iconHeight*1.4]
        });
        markerSizeValueEl.textContent = baseSize;
        if(vendorsAreVisible) redrawVendorMarkersAndRadii();
    }

    // NEW: Multi-platform vendor helper functions
    function populateVendorMapTypeOptions() {
        if (!initialFilterData || !initialFilterData.vendor_map_type_options) return;
        
        vendorMapTypeOptions = initialFilterData.vendor_map_type_options;
        vendorMapTypeEl.innerHTML = '';
        
        vendorMapTypeOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.name;
            if (option.default) {
                optionEl.selected = true;
                currentVendorMapType = option.value;
            }
            vendorMapTypeEl.appendChild(optionEl);
        });
        
        console.log('Vendor map type options populated:', vendorMapTypeOptions.length);
    }

    function updatePlatformSpecificFilters() {
        const selectedType = vendorMapTypeEl.value;
        console.log('Updating platform-specific filters for type:', selectedType);
        
        // Reset all filters visibility first
        isExpressFilterContainer.style.display = 'none';
        isDualFilterContainer.style.display = 'none';
        deliveryFiltersContainer.style.display = 'none';
        availabilityFilterContainer.style.display = 'none';
        
        switch(selectedType) {
            case 'tapsifood_only':
                // Show: own_delivery, ofood_delivery, is_dual, availability
                // Hide: is_express
                isDualFilterContainer.style.display = 'block';
                deliveryFiltersContainer.style.display = 'block';
                availabilityFilterContainer.style.display = 'block';
                isExpressFilterContainer.style.display = 'none';
                
                // Update tooltips for this mode
                updateFilterTooltips('tapsifood_only');
                break;
                
            case 'all_snappfood':
            case 'snappfood_exclude_tapsifood':
                // Show: is_dual, is_express
                // Hide: own_delivery, ofood_delivery
                isDualFilterContainer.style.display = 'block';
                isExpressFilterContainer.style.display = 'block';
                deliveryFiltersContainer.style.display = 'none';
                
                // Update tooltips for Snappfood modes
                updateFilterTooltips('snappfood_only');
                break;
                
            case 'combined_no_overlap':
                // Show: is_dual, is_express, own_delivery, ofood_delivery, availability
                // All filters are relevant - complex interaction logic applies
                isDualFilterContainer.style.display = 'block';
                isExpressFilterContainer.style.display = 'block';
                deliveryFiltersContainer.style.display = 'block';
                availabilityFilterContainer.style.display = 'block';
                
                // Update tooltips for combined mode
                updateFilterTooltips('combined');
                break;
                
            default:
                // Fallback - show dual only
                isDualFilterContainer.style.display = 'block';
                updateFilterTooltips('default');
                break;
        }
        
        console.log('Platform filters updated for', selectedType, ':', {
            dual: isDualFilterContainer.style.display !== 'none',
            express: isExpressFilterContainer.style.display !== 'none',
            delivery: deliveryFiltersContainer.style.display !== 'none'
        });
    }

    function updateFilterTooltips(mode) {
        // Update tooltips and descriptions based on the current mode
        const expressEl = isExpressFilterEl;
        const dualEl = isDualFilterEl;
        const ownDeliveryEl = isOwnDeliveryEl;
        const ofoodDeliveryEl = isOfoodDeliveryEl;
        
        switch(mode) {
            case 'tapsifood_only':
                if (dualEl) {
                    dualEl.title = 'Filter by vendors present on both Tapsifood and Snappfood platforms';
                }
                if (ownDeliveryEl) {
                    ownDeliveryEl.title = 'Filter Tapsifood vendors by own delivery capability';
                }
                if (ofoodDeliveryEl) {
                    ofoodDeliveryEl.title = 'Filter Tapsifood vendors by oFood delivery availability';
                }
                break;
                
            case 'snappfood_only':
                if (dualEl) {
                    dualEl.title = 'Filter by vendors present on both platforms vs Snappfood-only';
                }
                if (expressEl) {
                    expressEl.title = 'Filter Snappfood vendors by express delivery capability';
                }
                break;
                
            case 'combined':
                if (dualEl) {
                    dualEl.title = 'Filter by dual-platform vendors vs single-platform vendors';
                }
                if (expressEl) {
                    expressEl.title = 'Filter express delivery (affects Snappfood + dual vendors)';
                }
                if (ownDeliveryEl) {
                    ownDeliveryEl.title = 'Filter own delivery (affects Tapsifood + dual vendors)';
                }
                if (ofoodDeliveryEl) {
                    ofoodDeliveryEl.title = 'Filter oFood delivery (affects Tapsifood + dual vendors)';
                }
                break;
                
            default:
                if (dualEl) {
                    dualEl.title = 'Filter by dual-platform status';
                }
                break;
        }
    }

    function getVendorMapTypeDescription(type) {
        const option = vendorMapTypeOptions.find(opt => opt.value === type);
        return option ? option.description : type;
    }

    function addFilterExplanationHelper() {
        // Create a small info box that explains current filter behavior
        const infoBox = document.createElement('div');
        infoBox.id = 'filter-explanation-box';
        infoBox.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95));
            border: 1px solid var(--primary-color);
            border-radius: 6px;
            padding: 10px 14px;
            font-size: 0.7rem;
            line-height: 1.4;
            color: var(--text-dark);
            max-width: 280px;
            min-width: 200px;
            z-index: 1000;
            display: none;
            box-shadow: 0 3px 12px rgba(41, 121, 255, 0.15), 0 1px 3px rgba(0,0,0,0.1);
            backdrop-filter: blur(8px);
            transition: all 0.2s ease-in-out;
        `;
        
        // Add a close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 4px;
            right: 6px;
            background: none;
            border: none;
            font-size: 14px;
            color: var(--text-muted);
            cursor: pointer;
            padding: 0;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 2px;
        `;
        
        closeBtn.addEventListener('click', () => {
            infoBox.style.display = 'none';
        });
        
        closeBtn.addEventListener('mouseover', () => {
            closeBtn.style.backgroundColor = 'var(--light-bg)';
            closeBtn.style.color = 'var(--danger-color)';
        });
        
        closeBtn.addEventListener('mouseout', () => {
            closeBtn.style.backgroundColor = 'transparent';
            closeBtn.style.color = 'var(--text-muted)';
        });
        
        infoBox.appendChild(closeBtn);
        
        // Create content area
        const contentDiv = document.createElement('div');
        contentDiv.id = 'filter-explanation-content';
        contentDiv.style.paddingRight = '18px'; // Make room for close button
        infoBox.appendChild(contentDiv);
        
        // Add to sidebar
        const sidebar = document.querySelector('.sidebar-filters');
        if (sidebar) {
            sidebar.style.position = 'relative';
            sidebar.appendChild(infoBox);
        }
        
        // Function to update explanation text
        function updateFilterExplanation() {
            const currentType = vendorMapTypeEl.value;
            const expressValue = isExpressFilterEl.value;
            const dualValue = isDualFilterEl.value;
            const ownDeliveryValue = isOwnDeliveryEl.value;
            const ofoodDeliveryValue = isOfoodDeliveryEl.value;
            const availabilityValue = availabilityFilterEl.value;
            
            // NEW: Get delivery rate values
            const ofoodRateMin = ofoodDeliveryRateMinEl.value;
            const ofoodRateMax = ofoodDeliveryRateMaxEl.value;
            const ownRateMin = ownDeliveryRateMinEl.value;
            const ownRateMax = ownDeliveryRateMaxEl.value;
            
            let explanation = '';
            let showExplanation = false;
            
            switch(currentType) {
                case 'tapsifood_only':
                    if (dualValue !== 'all' || ownDeliveryValue !== 'all' || ofoodDeliveryValue !== 'all' || availabilityValue !== '' || ofoodRateMin || ofoodRateMax || ownRateMin || ownRateMax) {
                        explanation = `<b>Tapsifood Only Mode:</b><br>`;
                        if (dualValue === '1') explanation += '• Showing only dual-platform vendors<br>';
                        if (dualValue === '0') explanation += '• Showing only single-platform vendors<br>';
                        if (ownDeliveryValue !== 'all') explanation += `• Own delivery: ${ownDeliveryValue === '1' ? 'Yes' : 'No'}<br>`;
                        if (ofoodDeliveryValue !== 'all') explanation += `• oFood delivery: ${ofoodDeliveryValue === '1' ? 'Yes' : 'No'}<br>`;
                        if (availabilityValue !== '') explanation += `• Availability >= ${availabilityValue}<br>`;
                        
                        // NEW: Add delivery rate explanations
                        if (ofoodRateMin || ofoodRateMax) {
                            let ofoodRateText = '• oFood delivery rate: ';
                            if (ofoodRateMin && ofoodRateMax) {
                                ofoodRateText += `${ofoodRateMin}%-${ofoodRateMax}%`;
                            } else if (ofoodRateMin) {
                                ofoodRateText += `>= ${ofoodRateMin}%`;
                            } else {
                                ofoodRateText += `<= ${ofoodRateMax}%`;
                            }
                            explanation += ofoodRateText + '<br>';
                        }
                        if (ownRateMin || ownRateMax) {
                            let ownRateText = '• Own delivery rate: ';
                            if (ownRateMin && ownRateMax) {
                                ownRateText += `${ownRateMin}%-${ownRateMax}%`;
                            } else if (ownRateMin) {
                                ownRateText += `>= ${ownRateMin}%`;
                            } else {
                                ownRateText += `<= ${ownRateMax}%`;
                            }
                            explanation += ownRateText + '<br>';
                        }
                        
                        showExplanation = true;
                    }
                    break;
                    
                case 'all_snappfood':
                case 'snappfood_exclude_tapsifood':
                    if (dualValue !== 'all' || expressValue !== 'all') {
                        explanation = `<b>${currentType === 'all_snappfood' ? 'All Snappfood' : 'Snappfood Exclude Tapsifood'} Mode:</b><br>`;
                        if (dualValue === '1') explanation += '• Showing only dual-platform vendors<br>';
                        if (dualValue === '0') explanation += '• Showing only single-platform vendors<br>';
                        if (expressValue !== 'all') explanation += `• Express delivery: ${expressValue === '1' ? 'Yes' : 'No'}<br>`;
                        showExplanation = true;
                    }
                    break;
                    
                case 'combined_no_overlap':
                    if (dualValue !== 'all' || expressValue !== 'all' || ownDeliveryValue !== 'all' || ofoodDeliveryValue !== 'all' || availabilityValue !== '' || ofoodRateMin || ofoodRateMax || ownRateMin || ownRateMax) {
                        explanation = `<b>Combined Mode - Complex Filtering:</b><br>`;
                        if (dualValue === '1') {
                            explanation += '• Dual vendors: Affected by ALL delivery filters<br>';
                        } else if (dualValue === '0') {
                            explanation += '• Single-platform vendors only<br>';
                        } else {
                            explanation += '• Mixed vendors: Different filters apply to different platforms<br>';
                        }
                        if (availabilityValue !== '') explanation += `• Availability >= ${availabilityValue}<br>`;
                        
                        if (expressValue !== 'all') {
                            explanation += `• Express (Snappfood + dual): ${expressValue === '1' ? 'Yes' : 'No'}<br>`;
                        }
                        if (ownDeliveryValue !== 'all') {
                            explanation += `• Own delivery (Tapsifood + dual): ${ownDeliveryValue === '1' ? 'Yes' : 'No'}<br>`;
                        }
                        if (ofoodDeliveryValue !== 'all') {
                            explanation += `• oFood delivery (Tapsifood + dual): ${ofoodDeliveryValue === '1' ? 'Yes' : 'No'}<br>`;
                        }
                        
                        // NEW: Add delivery rate explanations for combined mode
                        if (ofoodRateMin || ofoodRateMax) {
                            let ofoodRateText = '• oFood delivery rate (Tapsifood + dual): ';
                            if (ofoodRateMin && ofoodRateMax) {
                                ofoodRateText += `${ofoodRateMin}%-${ofoodRateMax}%`;
                            } else if (ofoodRateMin) {
                                ofoodRateText += `>= ${ofoodRateMin}%`;
                            } else {
                                ofoodRateText += `<= ${ofoodRateMax}%`;
                            }
                            explanation += ofoodRateText + '<br>';
                        }
                        if (ownRateMin || ownRateMax) {
                            let ownRateText = '• Own delivery rate (Tapsifood + dual): ';
                            if (ownRateMin && ownRateMax) {
                                ownRateText += `${ownRateMin}%-${ownRateMax}%`;
                            } else if (ownRateMin) {
                                ownRateText += `>= ${ownRateMin}%`;
                            } else {
                                ownRateText += `<= ${ownRateMax}%`;
                            }
                            explanation += ownRateText + '<br>';
                        }
                        
                        showExplanation = true;
                    }
                    break;
            }
            
            if (showExplanation) {
                contentDiv.innerHTML = explanation;
                infoBox.style.display = 'block';
            } else {
                infoBox.style.display = 'none';
            }
        }
        
        // Add event listeners to update explanation when filters change
        vendorMapTypeEl.addEventListener('change', updateFilterExplanation);
        if (isExpressFilterEl) isExpressFilterEl.addEventListener('change', updateFilterExplanation);
        if (isDualFilterEl) isDualFilterEl.addEventListener('change', updateFilterExplanation);
        if (isOwnDeliveryEl) isOwnDeliveryEl.addEventListener('change', updateFilterExplanation);
        if (isOfoodDeliveryEl) isOfoodDeliveryEl.addEventListener('change', updateFilterExplanation);
        if (availabilityFilterEl) availabilityFilterEl.addEventListener('input', updateFilterExplanation);
        
        // NEW: Delivery rate filter event listeners
        if (ofoodDeliveryRateMinEl) ofoodDeliveryRateMinEl.addEventListener('input', updateFilterExplanation);
        if (ofoodDeliveryRateMaxEl) ofoodDeliveryRateMaxEl.addEventListener('input', updateFilterExplanation);
        if (ownDeliveryRateMinEl) ownDeliveryRateMinEl.addEventListener('input', updateFilterExplanation);
        if (ownDeliveryRateMaxEl) ownDeliveryRateMaxEl.addEventListener('input', updateFilterExplanation);
        
        // Clear button event listeners
        if (ofoodDeliveryRateClearBtn) {
            ofoodDeliveryRateClearBtn.addEventListener('click', () => {
                ofoodDeliveryRateMinEl.value = '';
                ofoodDeliveryRateMaxEl.value = '';
                updateFilterExplanation();
            });
        }
        if (ownDeliveryRateClearBtn) {
            ownDeliveryRateClearBtn.addEventListener('click', () => {
                ownDeliveryRateMinEl.value = '';
                ownDeliveryRateMaxEl.value = '';
                updateFilterExplanation();
            });
        }
        
        // Initial update
        setTimeout(updateFilterExplanation, 500);
    }

    // NEW: Historical view functions
    function initializeHistoricalControls() {
        // Initialize the view mode toggle event listeners
        if (viewLiveEl) {
            viewLiveEl.addEventListener('change', function() {
                if (this.checked) {
                    switchToViewMode('live');
                }
            });
        }

        if (viewHistoricalEl) {
            viewHistoricalEl.addEventListener('change', function() {
                if (this.checked) {
                    switchToViewMode('historical');
                }
            });
        }

        // Initialize timeline slider
        if (timelineSliderEl) {
            timelineSliderEl.addEventListener('input', function() {
                if (currentViewMode === 'historical' && historicalTimelineData) {
                    const sliderValue = parseInt(this.value);
                    const hourIdx = mapSliderValueToHourIdx(sliderValue);
                    scrubTimeline(hourIdx);
                }
            });

            timelineSliderEl.addEventListener('change', function() {
                if (currentViewMode === 'historical' && historicalTimelineData) {
                    const sliderValue = parseInt(this.value);
                    const hourIdx = mapSliderValueToHourIdx(sliderValue);
                    scrubTimelineComplete(hourIdx);
                }
            });
        }

        // NEW: Playback control event listeners
        if (stepBackwardEl) {
            stepBackwardEl.addEventListener('click', stepBackward);
        }

        if (playPauseEl) {
            playPauseEl.addEventListener('click', togglePlayback);
        }

        if (stepForwardEl) {
            stepForwardEl.addEventListener('click', stepForward);
        }

        if (playbackSpeedSelectEl) {
            playbackSpeedSelectEl.addEventListener('change', function() {
                playbackSpeed = parseInt(this.value);
                // If currently playing, restart with new speed
                if (isPlaying) {
                    stopPlayback();
                    startPlayback();
                }
            });
        }

        // NEW: Flash notification and collapse event listeners
        if (flashDismissEl) {
            flashDismissEl.addEventListener('click', hideHistoricalFlash);
        }

        // CLAUDE: Removed duplicate event listener - now handled by initTimelineControls()
        // if (timelineCollapseBtn) {
        //     timelineCollapseBtn.addEventListener('click', toggleTimelineCollapse);
        // }

        // Load historical timeline data on initialization
        loadHistoricalTimeline();
    }

    // Historical flash notification functions
    function showHistoricalFlash() {
        if (historicalFlashEl) {
            historicalFlashEl.style.display = 'block';
            // Auto-hide after 8 seconds if user doesn't dismiss
            setTimeout(hideHistoricalFlash, 8000);
        }
    }

    function hideHistoricalFlash() {
        if (historicalFlashEl) {
            historicalFlashEl.style.display = 'none';
        }
    }

    // CLAUDE: Removed old toggleTimelineCollapse function - now handled by initTimelineControls()
    // Timeline collapse functions
    // function toggleTimelineCollapse() {
    //     if (!timelineControlsEl) return;
    //
    //     const isCollapsed = timelineControlsEl.classList.contains('collapsed');
    //     if (isCollapsed) {
    //         timelineControlsEl.classList.remove('collapsed');
    //     } else {
    //         timelineControlsEl.classList.add('collapsed');
    //     }
    // }

    function switchToViewMode(mode) {
        if (mode === currentViewMode) return;

        console.log(`Switching to ${mode} view mode`);
        currentViewMode = mode;

        if (mode === 'live') {
            // Hide timeline controls and flash notification
            if (timelineControlsEl) {
                timelineControlsEl.style.display = 'none';
            }
            hideHistoricalFlash();

            // Switch to live data
            loadLiveData();
        } else if (mode === 'historical') {
            // Show timeline controls and flash notification
            if (timelineControlsEl) {
                timelineControlsEl.style.display = 'block';
            }
            showHistoricalFlash();

            // Load historical timeline if not already loaded
            if (!historicalTimelineData) {
                loadHistoricalTimeline();
            } else {
                // Load default historical hour (latest)
                scrubTimelineComplete(historicalTimelineData.timeline.default_hour_idx);
            }
        }
    }

    function loadHistoricalTimeline() {
        console.log('Loading historical timeline metadata...');

        fetch(`${API_BASE_URL}/historical-vendor-timeline`)
            .then(response => response.json())
            .then(data => {
                if (data.timeline) {
                    historicalTimelineData = data;
                    setupTimelineSlider();
                    console.log('Historical timeline loaded:', data.timeline);
                } else {
                    console.warn('Historical data not available:', data.error);
                    // Disable historical mode
                    if (viewHistoricalEl) {
                        viewHistoricalEl.disabled = true;
                        viewHistoricalEl.title = 'Historical data not available';
                    }
                }
            })
            .catch(error => {
                console.error('Failed to load historical timeline:', error);
                if (viewHistoricalEl) {
                    viewHistoricalEl.disabled = true;
                    viewHistoricalEl.title = 'Historical data error';
                }
            });
    }

    function setupTimelineSlider() {
        if (!historicalTimelineData || !timelineSliderEl) return;

        const timeline = historicalTimelineData.timeline;

        // Configure slider range
        timelineSliderEl.min = 0;
        timelineSliderEl.max = timeline.total_hours - 1;
        timelineSliderEl.value = timeline.total_hours - 1; // Start at latest hour

        // Update timeline labels
        if (timelineStartEl) {
            const startTime = new Date(timeline.min_timestamp);
            timelineStartEl.textContent = formatTimelineLabel(startTime);
        }

        if (timelineEndEl) {
            const endTime = new Date(timeline.max_timestamp);
            timelineEndEl.textContent = formatTimelineLabel(endTime);
        }

        // Set current historical hour
        currentHistoricalHour = timeline.default_hour_idx;
        updateTimelineTimestamp();

        // NEW: Initialize enhanced timeline features
        updatePlaybackButtonStates();
        addTimelineTooltip();
    }

    function mapSliderValueToHourIdx(sliderValue) {
        if (!historicalTimelineData) return 0;
        const timeline = historicalTimelineData.timeline;
        return timeline.min_hour_idx + sliderValue;
    }

    function mapHourIdxToSliderValue(hourIdx) {
        if (!historicalTimelineData) return 0;
        const timeline = historicalTimelineData.timeline;
        return hourIdx - timeline.min_hour_idx;
    }

    function scrubTimeline(hourIdx) {
        // This is called during scrubbing (mousemove/drag)
        isTimelineScrubbing = true;
        currentHistoricalHour = hourIdx;
        updateTimelineTimestamp();

        // Optional: You could add live preview during scrubbing here
        // For now, we'll just update the timestamp display
    }

    function scrubTimelineComplete(hourIdx) {
        // This is called when scrubbing is complete (mouseup)
        isTimelineScrubbing = false;
        currentHistoricalHour = hourIdx;
        updateTimelineTimestamp();

        // Load data for the selected hour
        loadHistoricalDataForHour(hourIdx);
    }

    function loadHistoricalDataForHour(hourIdx) {
        console.log(`Loading historical data for hour_idx: ${hourIdx}`);

        // Set the historical hour and then use the existing fetchAndDisplayMapData function
        currentHistoricalHour = hourIdx;
        fetchAndDisplayMapData();
    }

    function loadLiveData() {
        console.log('Loading live data...');
        // Use the existing fetchAndDisplayMapData function
        fetchAndDisplayMapData();
    }

    function updateTimelineTimestamp() {
        if (!timelineTimestampEl || currentHistoricalHour == null) return;

        // Get actual timestamp for current hour
        if (historicalTimelineData) {
            const timeline = historicalTimelineData.timeline;
            let currentTime;

            if (timeline.hour_timestamps && timeline.hour_timestamps[currentHistoricalHour]) {
                // Use actual timestamp from backend
                currentTime = new Date(timeline.hour_timestamps[currentHistoricalHour]);
                console.log(`DEBUG: Status display using actual timestamp for hour ${currentHistoricalHour}: ${timeline.hour_timestamps[currentHistoricalHour]} -> ${currentTime}`);
            } else {
                // Fallback to calculation if timestamp not available
                const hourOffset = currentHistoricalHour - timeline.min_hour_idx;
                const minTime = new Date(timeline.min_timestamp);
                currentTime = new Date(minTime.getTime() + (hourOffset * 60 * 60 * 1000));
                console.log(`DEBUG: Status display using fallback timestamp for hour ${currentHistoricalHour}: offset ${hourOffset} -> ${currentTime}`);
            }

            timelineTimestampEl.textContent = formatTimelineTimestamp(currentTime);

            // NEW: Update enhanced timeline status display
            updateTimelineStatusDisplay(currentTime);
        }
    }

    // NEW: Update the enhanced timeline status display elements
    function updateTimelineStatusDisplay(currentTime) {
        if (!historicalTimelineData) return;

        const timeline = historicalTimelineData.timeline;

        // Update hour index display
        if (currentHourIdxEl) {
            currentHourIdxEl.textContent = currentHistoricalHour;
        }

        // Update total hours display
        if (totalHoursEl) {
            totalHoursEl.textContent = timeline.total_hours;
        }

        // Update current datetime display
        if (currentDatetimeEl) {
            currentDatetimeEl.textContent = formatDetailedTimestamp(currentTime);
        }

        // Update vendor count (will be updated when data loads)
        if (currentVendorCountEl) {
            currentVendorCountEl.textContent = currentVendorCount || '-';
        }

        // Update slider to match current hour
        if (timelineSliderEl) {
            const sliderValue = currentHistoricalHour - timeline.min_hour_idx;
            timelineSliderEl.value = sliderValue;
        }
    }

    function formatTimelineLabel(date) {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === yesterday.toDateString()) {
            return `${date.getHours().toString().padStart(2, '0')}:00 Yesterday`;
        } else if (date.toDateString() === now.toDateString()) {
            return `${date.getHours().toString().padStart(2, '0')}:00 Today`;
        } else {
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:00`;
        }
    }

    function formatTimelineTimestamp(date) {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        let dayLabel = '';
        if (date.toDateString() === yesterday.toDateString()) {
            dayLabel = 'Yesterday';
        } else if (date.toDateString() === now.toDateString()) {
            dayLabel = 'Today';
        } else {
            dayLabel = `${date.getMonth() + 1}/${date.getDate()}`;
        }

        return `${dayLabel} ${date.getHours().toString().padStart(2, '0')}:00`;
    }

    // NEW: Format detailed timestamp for enhanced display
    function formatDetailedTimestamp(date) {
        return date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    // NEW: Playback control functions
    function stepBackward() {
        if (!historicalTimelineData || currentHistoricalHour == null) return;

        const timeline = historicalTimelineData.timeline;
        const newHour = Math.max(timeline.min_hour_idx, currentHistoricalHour - 1);

        if (newHour !== currentHistoricalHour) {
            scrubTimelineComplete(newHour);
        }

        // Update button states
        updatePlaybackButtonStates();
    }

    function stepForward() {
        if (!historicalTimelineData || currentHistoricalHour == null) return;

        const timeline = historicalTimelineData.timeline;
        const newHour = Math.min(timeline.max_hour_idx, currentHistoricalHour + 1);

        if (newHour !== currentHistoricalHour) {
            scrubTimelineComplete(newHour);
        }

        // Update button states
        updatePlaybackButtonStates();
    }

    function togglePlayback() {
        if (isPlaying) {
            stopPlayback();
        } else {
            startPlayback();
        }
    }

    function startPlayback() {
        if (!historicalTimelineData || isPlaying) return;

        // Prevent playback if coverage grid is selected
        const isCoverageGridSelected = areaMainTypeEl.value === 'coverage_grid';
        if (isCoverageGridSelected) {
            console.log("Playback blocked - Coverage Grid mode not supported");
            return;
        }

        isPlaying = true;
        updatePlaybackButtonStates();

        // Start by going to the next step immediately
        proceedToNextPlaybackStep();
    }

    function proceedToNextPlaybackStep() {
        if (!isPlaying || !historicalTimelineData) return;

        const timeline = historicalTimelineData.timeline;
        const nextHour = currentHistoricalHour + 1;

        if (nextHour <= timeline.max_hour_idx) {
            scrubTimelineComplete(nextHour);
            // Note: fetchAndDisplayMapData will handle the timing for the next step
        } else {
            // Reached end, stop playback
            stopPlayback();
        }
    }

    function stopPlayback() {
        if (!isPlaying) return;

        isPlaying = false;

        // Clear any pending interval or delay timeout
        if (playbackInterval) {
            clearInterval(playbackInterval);
            playbackInterval = null;
        }
        if (playbackDelayTimeout) {
            clearTimeout(playbackDelayTimeout);
            playbackDelayTimeout = null;
        }

        updatePlaybackButtonStates();
    }

    function updatePlaybackButtonStates() {
        if (!historicalTimelineData) return;

        const timeline = historicalTimelineData.timeline;

        // Update step backward button
        if (stepBackwardEl) {
            stepBackwardEl.disabled = (currentHistoricalHour <= timeline.min_hour_idx);
        }

        // Update step forward button
        if (stepForwardEl) {
            stepForwardEl.disabled = (currentHistoricalHour >= timeline.max_hour_idx);
        }

        // Update play/pause button
        if (playPauseEl) {
            const isCoverageGridSelected = areaMainTypeEl.value === 'coverage_grid';

            if (isPlaying) {
                playPauseEl.textContent = '⏸️';
                playPauseEl.title = 'Pause Timeline';
                playPauseEl.classList.add('playing');
            } else {
                playPauseEl.textContent = '▶️';
                playPauseEl.title = isCoverageGridSelected
                    ? 'Autoplay disabled for Coverage Grid'
                    : 'Play Timeline';
                playPauseEl.classList.remove('playing');
            }

            // Disable play if at end OR if coverage grid is selected
            playPauseEl.disabled = (!isPlaying && currentHistoricalHour >= timeline.max_hour_idx) ||
                                   (!isPlaying && isCoverageGridSelected);
        }
    }

    // NEW: Update vendor count from response data
    function updateVendorCount(count) {
        currentVendorCount = count;
        if (currentVendorCountEl && currentViewMode === 'historical') {
            currentVendorCountEl.textContent = count;
        }
    }

    // NEW: Add tooltip functionality to timeline slider
    function addTimelineTooltip() {
        if (!timelineSliderEl || !historicalTimelineData) return;

        timelineSliderEl.addEventListener('mousemove', function(e) {
            if (currentViewMode !== 'historical') return;

            const rect = this.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const sliderValue = Math.round(percent * (this.max - this.min) + parseInt(this.min));
            const hourIdx = mapSliderValueToHourIdx(sliderValue);

            // Get actual timestamp for this hour from backend data
            const timeline = historicalTimelineData.timeline;
            let tooltipTime;

            if (timeline.hour_timestamps && timeline.hour_timestamps[hourIdx]) {
                // Use actual timestamp from backend
                tooltipTime = new Date(timeline.hour_timestamps[hourIdx]);
                console.log(`DEBUG: Using actual timestamp for hour ${hourIdx}: ${timeline.hour_timestamps[hourIdx]} -> ${tooltipTime}`);
            } else {
                // Fallback to calculation if timestamp not available
                const hourOffset = hourIdx - timeline.min_hour_idx;
                const minTime = new Date(timeline.min_timestamp);
                tooltipTime = new Date(minTime.getTime() + (hourOffset * 60 * 60 * 1000));
                console.log(`DEBUG: Using fallback timestamp for hour ${hourIdx}: offset ${hourOffset} -> ${tooltipTime}`);
                console.log(`DEBUG: hour_timestamps available:`, timeline.hour_timestamps ? 'YES' : 'NO');
                if (timeline.hour_timestamps) {
                    console.log(`DEBUG: Available hours:`, Object.keys(timeline.hour_timestamps));
                }
            }

            // Create or update tooltip
            let tooltip = document.getElementById('timeline-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'timeline-tooltip';
                tooltip.style.cssText = `
                    position: absolute;
                    background: var(--content-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-size: 0.75rem;
                    z-index: 1000;
                    pointer-events: none;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                `;
                document.body.appendChild(tooltip);
            }

            tooltip.textContent = `Hour ${hourIdx}: ${formatDetailedTimestamp(tooltipTime)}`;
            tooltip.style.left = e.pageX + 10 + 'px';
            tooltip.style.top = e.pageY - 30 + 'px';
            tooltip.style.display = 'block';
        });

        timelineSliderEl.addEventListener('mouseleave', function() {
            const tooltip = document.getElementById('timeline-tooltip');
            if (tooltip) {
                tooltip.style.display = 'none';
            }
        });
    }


    function init() {
        initMap();
        fetchInitialFilterData().then(() => {
            populateCitySelect();
            populateVendorMapTypeOptions(); // NEW: Populate vendor map type options
            initializeCustomDropdowns();
            applyDefaultFilters(); 
            setupEventListeners();
            setupHeatmapZoomHandler();
            loadStaticTargets(); // NEW: Load static targets for dynamic targets feature
            initializeHistoricalControls(); // NEW: Initialize historical view controls

            const today = new Date(); 
            const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
            daterangeStartEl.value = thirtyDaysAgo.toISOString().split('T')[0];
            daterangeEndEl.value = today.toISOString().split('T')[0];
            updateVendorIconSize(vendorMarkerSizeEl.value); 
            
            // Enhanced default heatmap values
            heatmapRadiusEl.value = "25";
            heatmapRadiusValueEl.textContent = "25";
            heatmapBlurEl.value = "15";
            heatmapBlurValueEl.textContent = "15";
            heatmapMaxValEl.value = "1.0";
            heatmapMaxValValueEl.textContent = "1.0";
            
            // Enhanced tooltips
            heatmapRadiusEl.title = "Heatmap point spread radius. Auto-adjusts with zoom when optimized.";
            heatmapBlurEl.title = "Smoothness of heat transitions. Auto-adjusts based on data density.";
            heatmapMaxValEl.title = "Maximum intensity threshold. Auto-optimized to data distribution.";
            
            // Initialize radius modifier
            vendorRadiusModifierEl.value = "100";
            radiusModifierValueEl.textContent = "100";
            currentRadiusModifier = 1.0;
            currentRadiusMode = 'percentage';
            currentRadiusFixed = 3.0;
            vendorRadiusFixedEl.value = "3";
            radiusFixedValueEl.textContent = "3";
            
            // Initialize grid visualization controls
            gridBlurEl.value = "0";
            gridBlurValueEl.textContent = "0";
            gridFadeEl.value = "100";
            gridFadeValueEl.textContent = "100";
            gridPointSizeEl.value = "6";
            gridPointSizeValueEl.textContent = "6";
            marketingAreasOnTop = false;
            marketingAreasOnTopBtn.classList.remove('active');
            
            btnToggleVendors.textContent = vendorsAreVisible ? 'Vendors On' : 'Vendors Off';
            btnToggleVendors.classList.toggle('active', vendorsAreVisible);
            
            // NEW: Initialize platform-specific filters
            updatePlatformSpecificFilters();
            
            // Add filter explanation helper
            addFilterExplanationHelper();
            
            fetchAndDisplayMapData();
        }).catch(error => {
            console.error("Initialization failed:", error);
            showLoading(true, `Initialization failed: ${error.message}. Please refresh.`);
        });
    }

    function processCsvData(csvContent) {
        const lines = csvContent.split('\n');
        let processedCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = line.split(',');
            const wkt = columns[0]?.trim();
            const name = columns[1]?.trim() || '';
            const description = columns[2]?.trim() || '';
            
            if (!wkt || !wkt.startsWith('POINT (')) continue;
            
            const match = wkt.match(/POINT \(([0-9.-]+)\s+([0-9.-]+)/);
            if (match) {
                const lng = parseFloat(match[1]);
                const lat = parseFloat(match[2]);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    const markerSize = csvMarkerSettings.size;
                    const iconSizeTotal = markerSize + 4; // Add 4px for the border
                    const markerIcon = L.divIcon({
                        className: 'csv-marker-custom',
                        html: `<div style="background-color: ${csvMarkerSettings.color}; width: ${markerSize}px; height: ${markerSize}px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [iconSizeTotal, iconSizeTotal],
                        iconAnchor: [iconSizeTotal/2, iconSizeTotal/2]
                    });
                    
                    const marker = L.marker([lat, lng], { icon: markerIcon });
                    
                    const popupContent = `
                        <div style="font-family: Arial, sans-serif;">
                            <b>CSV Marker</b><br>
                            <strong>Latitude:</strong> ${lat}<br>
                            <strong>Longitude:</strong> ${lng}<br>
                            ${name ? `<strong>Name:</strong> ${name}<br>` : ''}
                            ${description ? `<strong>Description:</strong> ${description}` : ''}
                        </div>
                    `;
                    
                    marker.bindPopup(popupContent);
                    csvMarkersLayerGroup.addLayer(marker);
                    processedCount++;
                }
            }
        }
        
        if (processedCount > 0) {
            console.log(`Successfully loaded ${processedCount} CSV markers`);
            alert(`Successfully loaded ${processedCount} markers from CSV file`);
        } else {
            alert('No valid POINT coordinates found in the CSV file');
        }
    }

    function initMap() {
        const mapContainer = document.getElementById('map');
        if(mapContainer) mapContainer.innerHTML = ''; else { console.error("Map container ('map') not found!"); return; }
        map = L.map('map', { 
            preferCanvas: true,
            attributionControl: false 
        }).setView([35.7219, 51.3347], 11);
        // Create dedicated panes to control layer order and clickability
        map.createPane('polygonPane');
        map.getPane('polygonPane').style.zIndex = 450; 
        
        map.createPane('coverageGridPane');
        map.getPane('coverageGridPane').style.zIndex = 460;
        
        // Use the default shadow pane for radii to ensure they are behind polygons
        map.getPane('shadowPane').style.zIndex = 250;
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd', maxZoom: 20
        }).addTo(map);
        L.control.attribution({position: 'bottomleft'}).addTo(map);
        
        if (vendorsAreVisible) vendorLayerGroup.addTo(map);
        polygonLayerGroup.addTo(map);
        coverageGridLayerGroup.addTo(map);
        csvMarkersLayerGroup.addTo(map);
    }

    // Zoom event handler for consistent heatmap rendering
    function setupHeatmapZoomHandler() {
        let zoomTimeout;
        
        map.on('zoomstart', () => {
            // Clear any pending zoom updates
            if (zoomTimeout) {
                clearTimeout(zoomTimeout);
            }
        });

        map.on('zoomend', () => {
            const newZoomLevel = map.getZoom();
            
            // Only update if zoom level actually changed significantly
            if (Math.abs(newZoomLevel - currentZoomLevel) >= 0.5) {
                currentZoomLevel = newZoomLevel;
                
                // Debounce the heatmap update
                if (zoomTimeout) {
                    clearTimeout(zoomTimeout);
                }
                
                zoomTimeout = setTimeout(() => {
                    if (currentHeatmapType !== 'none' && lastHeatmapData) {
                        renderCurrentHeatmap();
                    }
                }, 200); // Small delay to ensure smooth zooming
            }
        });
    }

    async function fetchInitialFilterData() {
        showLoading(true, 'Fetching initial settings...');
        try {
            const response = await fetch(`${API_BASE_URL}/initial-data`);
            if (!response.ok) {
                const errorText = await response.text();
                showLoading(true, `Error fetching settings: ${response.status}. Please refresh.`);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            initialFilterData = await response.json();
            if (initialFilterData.error) {
                showLoading(true, `Backend error (settings): ${initialFilterData.error}. Please refresh.`);
                 throw new Error(`Backend error (initial data): ${initialFilterData.error} - ${initialFilterData.details || ''}`);
            }
            console.log('Initial filter data loaded:', initialFilterData);
        } catch (error) {
            console.error("Failed to fetch initial filter data:", error);
            showLoading(true, `Failed to load settings: ${error.message}. Please refresh.`);
            throw error;
        }
    }
    
    function populateCitySelect() {
        if (!initialFilterData || !initialFilterData.cities) return;
        populateSelectWithOptions(cityEl, initialFilterData.cities.map(c => ({ value: c.name, text: c.name })), false);
        cityEl.value = "tehran";
    }

    function initializeCustomDropdowns() {
        if (!initialFilterData) return;
        customFilterConfigs.businessLine.optionsData = (initialFilterData.business_lines || [])
            .map(bl => ({ value: bl, text: bl, checked: false }));
        renderCustomDropdown(customFilterConfigs.businessLine);
        
        customFilterConfigs.vendorStatus.optionsData = (initialFilterData.vendor_statuses || [])
            .map(s => ({ value: String(s), text: `Status ${s}`, checked: false }));
        renderCustomDropdown(customFilterConfigs.vendorStatus);
        customFilterConfigs.vendorGrade.optionsData = (initialFilterData.vendor_grades || [])
            .map(g => ({ value: g, text: g, checked: false }));
        renderCustomDropdown(customFilterConfigs.vendorGrade);
        
        customFilterConfigs.vendorStatusText.optionsData = (initialFilterData.vendor_status_values || [])
            .map(s => ({ value: String(s), text: `Status ${s}`, checked: false }));
        renderCustomDropdown(customFilterConfigs.vendorStatusText);
        updateCityDependentCustomFilters(cityEl.value);
        updateVendorAreaSubTypeFilter();
    }

    function applyDefaultFilters() {
        const statusConfig = customFilterConfigs.vendorStatus;
        const status5Option = statusConfig.optionsData.find(opt => opt.value === "5");
        if (status5Option) status5Option.checked = true;
        updateCustomDropdownButtonText(statusConfig);
        const gradeConfig = customFilterConfigs.vendorGrade;
        ["A", "A+", "A-", "B", "B-", "C", "C-"].forEach(gradeValue => {
            const gradeOption = gradeConfig.optionsData.find(opt => opt.value === gradeValue);
            if (gradeOption) gradeOption.checked = true;
        });
        updateCustomDropdownButtonText(gradeConfig);
        
        const blConfig = customFilterConfigs.businessLine;
        const restaurantOption = blConfig.optionsData.find(opt => opt.value && opt.value.toLowerCase() === "restaurant");
        if (restaurantOption) restaurantOption.checked = true;
        updateCustomDropdownButtonText(blConfig);
        
        // Set default vendor status to 1
        const statusTextConfig = customFilterConfigs.vendorStatusText;
        const status1Option = statusTextConfig.optionsData.find(opt => opt.value === "1");
        if (status1Option) status1Option.checked = true;
        updateCustomDropdownButtonText(statusTextConfig);
        
        vendorVisibleEl.value = "1";
    }
    
    function updateCityDependentCustomFilters(selectedCity) {
        updateAreaSubTypeCustomFilter();
    }

    function updateAreaSubTypeCustomFilter() {
        if (!initialFilterData) return;
        const selectedAreaMainType = areaMainTypeEl.value;
        const selectedCity = cityEl.value;
        let subAreaOptionObjects = [];
        
        if (selectedAreaMainType === "coverage_grid") {
            // For coverage grid, sub-types should filter the polygons *on top*, not the grid itself
            if (initialFilterData.marketing_areas_by_city && initialFilterData.marketing_areas_by_city[selectedCity]) {
                subAreaOptionObjects = initialFilterData.marketing_areas_by_city[selectedCity].map(name => ({ value: name, text: decodeURIComponentSafe(name) }));
            }
        } else if (selectedAreaMainType === "tapsifood_marketing_areas") {
            if (initialFilterData.marketing_areas_by_city && initialFilterData.marketing_areas_by_city[selectedCity]) {
                subAreaOptionObjects = initialFilterData.marketing_areas_by_city[selectedCity].map(name => ({ value: name, text: decodeURIComponentSafe(name) }));
            }
        } else if (selectedCity === "tehran") {
            if (selectedAreaMainType === "tehran_region_districts" && initialFilterData.tehran_region_districts) {
                subAreaOptionObjects = initialFilterData.tehran_region_districts.map(name => ({ value: name, text: decodeURIComponentSafe(name) }));
            } else if (selectedAreaMainType === "tehran_main_districts" && initialFilterData.tehran_main_districts) {
                subAreaOptionObjects = initialFilterData.tehran_main_districts.map(name => ({ value: name, text: decodeURIComponentSafe(name) }));
            } else if (selectedAreaMainType === "all_tehran_districts") {
                const regionD = (initialFilterData.tehran_region_districts || []).map(name => ({value: name, text: `Region: ${decodeURIComponentSafe(name)}`}));
                const mainD = (initialFilterData.tehran_main_districts || []).map(name => ({value: name, text: `Main: ${decodeURIComponentSafe(name)}`}));
                subAreaOptionObjects = [...regionD, ...mainD];
            }
        }
        customFilterConfigs.areaSubType.optionsData = subAreaOptionObjects
            .map(opt => ({ value: opt.value, text: opt.text, checked: false }));
        renderCustomDropdown(customFilterConfigs.areaSubType);
    }
    
    function updateVendorAreaSubTypeFilter() {
        if (!initialFilterData) return;
        const selectedVendorAreaType = vendorAreaMainTypeEl.value;
        const selectedCity = cityEl.value; 
        let subAreaOptionObjects = [];
        if (selectedVendorAreaType === "tapsifood_marketing_areas") {
             if (initialFilterData.marketing_areas_by_city && initialFilterData.marketing_areas_by_city[selectedCity]) {
                subAreaOptionObjects = initialFilterData.marketing_areas_by_city[selectedCity].map(name => ({ value: name, text: decodeURIComponentSafe(name) }));
            }
        } 
        else if (selectedVendorAreaType === "tehran_region_districts" && initialFilterData.tehran_region_districts) {
            subAreaOptionObjects = initialFilterData.tehran_region_districts.map(name => ({ value: name, text: decodeURIComponentSafe(name) }));
        } else if (selectedVendorAreaType === "tehran_main_districts" && initialFilterData.tehran_main_districts) {
            subAreaOptionObjects = initialFilterData.tehran_main_districts.map(name => ({ value: name, text: decodeURIComponentSafe(name) }));
        }
        
        customFilterConfigs.vendorAreaSubType.optionsData = subAreaOptionObjects
            .map(opt => ({ value: opt.value, text: opt.text, checked: false }));
        renderCustomDropdown(customFilterConfigs.vendorAreaSubType);
    }

    function decodeURIComponentSafe(str) {
        if (!str) return str;

        // Ensure str is a string
        if (typeof str !== 'string') {
            console.warn(`decodeURIComponentSafe received non-string: ${str} (type: ${typeof str})`);
            return String(str);
        }

        try {
            return decodeURIComponent(str.replace(/\+/g, ' '));
        } catch (e) {
            console.warn(`Failed to decode URI component: ${str}`, e);
            return str;
        }
    }
    
    function populateSelectWithOptions(selectElement, options, isMultiple = true) {
        selectElement.innerHTML = '';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            selectElement.add(option);
        });
    }

    function renderCustomDropdown(config) {
        config.panel.innerHTML = '';
        if (!config.optionsData || config.optionsData.length === 0) {
            config.panel.innerHTML = '<div class="dropdown-panel-item" style="color:var(--text-muted); cursor:default;">No options available</div>';
            updateCustomDropdownButtonText(config);
            return;
        }
        config.optionsData.forEach((option, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('dropdown-panel-item');
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `${config.paramName}-opt-${index}-${Math.random().toString(36).substr(2, 5)}`;
            checkbox.value = option.value;
            checkbox.checked = option.checked;
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = option.text;
            checkbox.addEventListener('change', () => {
                option.checked = checkbox.checked;
                updateCustomDropdownButtonText(config);
            });
            itemDiv.addEventListener('click', (e) => {
                 if (e.target !== checkbox) checkbox.click();
            });
            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            config.panel.appendChild(itemDiv);
        });
        updateCustomDropdownButtonText(config);
    }

    function updateCustomDropdownButtonText(config) {
        const selectedOptions = config.optionsData.filter(opt => opt.checked);
        const selectedCount = selectedOptions.length;
        if (selectedCount === 0) {
            config.button.textContent = config.defaultText;
        } else if (selectedCount === 1) {
            const selectedOptText = selectedOptions[0].text;
            config.button.textContent = selectedOptText.length > 20 ? selectedOptText.substring(0,18) + "..." : selectedOptText;
        } else {
            config.button.textContent = `${selectedCount} selected`;
        }
    }

    function getSelectedValuesFromCustomDropdown(config) {
        return config.optionsData.filter(opt => opt.checked).map(opt => opt.value);
    }

    function toggleDropdown(config, forceClose = false) {
        const isOpen = config.panel.classList.contains('open');
        if (forceClose || isOpen) {
            config.panel.classList.remove('open');
            config.button.classList.remove('open');
        } else {
            Object.values(customFilterConfigs).forEach(otherConfig => {
                if (otherConfig !== config) toggleDropdown(otherConfig, true);
            });
            config.panel.classList.add('open');
            config.button.classList.add('open');
        }
    }

    // Additional event listeners for heatmap controls
    function setupAdditionalHeatmapListeners() {
        // Auto-optimize toggle
        const autoOptimizeBtn = document.getElementById('heatmap-auto-optimize');
        if (autoOptimizeBtn) {
            autoOptimizeBtn.addEventListener('click', () => {
                heatmapConfig.autoOptimize = !heatmapConfig.autoOptimize;
                autoOptimizeBtn.textContent = heatmapConfig.autoOptimize ? 'Auto-Optimize On' : 'Auto-Optimize Off';
                autoOptimizeBtn.classList.toggle('active', heatmapConfig.autoOptimize);
                
                if (heatmapConfig.autoOptimize && currentHeatmapType !== 'none' && lastHeatmapData) {
                    renderCurrentHeatmap();
                }
            });
        }

        // Smooth transitions toggle
        const smoothTransitionsBtn = document.getElementById('heatmap-smooth-transitions');
        if (smoothTransitionsBtn) {
            smoothTransitionsBtn.addEventListener('click', () => {
                heatmapConfig.smoothTransitions = !heatmapConfig.smoothTransitions;
                smoothTransitionsBtn.textContent = heatmapConfig.smoothTransitions ? 'Smooth On' : 'Smooth Off';
                smoothTransitionsBtn.classList.toggle('active', heatmapConfig.smoothTransitions);
            });
        }

        // Reset parameters button
        const resetParamsBtn = document.getElementById('heatmap-reset-params');
        if (resetParamsBtn) {
            resetParamsBtn.addEventListener('click', () => {
                // Reset to auto-optimize mode
                heatmapConfig.autoOptimize = true;
                heatmapConfig.smoothTransitions = true;
                
                // Update button states
                if (autoOptimizeBtn) {
                    autoOptimizeBtn.textContent = 'Auto-Optimize On';
                    autoOptimizeBtn.classList.add('active');
                }
                
                if (smoothTransitionsBtn) {
                    smoothTransitionsBtn.textContent = 'Smooth On';
                    smoothTransitionsBtn.classList.add('active');
                }
                
                // Reset base configuration
                heatmapConfig.baseRadius = 25;
                heatmapConfig.baseBlur = 15;
                heatmapConfig.maxIntensity = 1.0;
                
                // Re-render heatmap with optimal parameters
                if (currentHeatmapType !== 'none' && lastHeatmapData) {
                    renderCurrentHeatmap();
                }
            });
        }
    }

    // Helper function to update radius mode UI
    function updateRadiusModeUI() {
        // Hide all controls first
        radiusPercentageControl.style.display = 'none';
        radiusFixedControl.style.display = 'none';
        if (radiusGradeDynamicControl) radiusGradeDynamicControl.style.display = 'none';
        
        // Show appropriate control based on mode
        if (currentRadiusMode === 'fixed') {
            radiusFixedControl.style.display = 'block';
        } else if (currentRadiusMode === 'percentage') {
            radiusPercentageControl.style.display = 'block';
        } else if (currentRadiusMode === 'grade-dynamic') {
            if (radiusGradeDynamicControl) {
                radiusGradeDynamicControl.style.display = 'block';
                populateGradeDynamicControls();
            }
        }
        // For 'grade' mode, we don't show either slider control
        
        // Update the modifier description
        updateRadiusModifierDescription();
    }

    // Function to populate grade-based dynamic controls
    function populateGradeDynamicControls() {
        if (!gradeRadiusControlsContainer || !initialFilterData || !initialFilterData.vendor_grades) return;
        
        gradeRadiusControlsContainer.innerHTML = '';
        
        // Define the exact grades as specified
        const allGrades = ['A+', 'A', 'A-', 'B', 'B-', 'C', 'C-', 'D', 'D-', 'E', 'E-', 'F', 'Not Enough Rate', 'Ungraded'];
        
        // Default radius values for each grade
        const defaultRadiusValues = {
            'A+': 4.5, 'A': 4.0, 'A-': 4.0,
            'B': 3.5, 'B-': 3.5,
            'C': 3.0, 'C-': 3.0,
            'D': 2.5, 'D-': 2.5,
            'E': 2.0, 'E-': 2.0,
            'F': 1.5, 'Not Enough Rate': 2.0, 'Ungraded': 2.0
        };
        
        allGrades.forEach(grade => {
            const gradeKey = String(grade);
            const defaultRadius = defaultRadiusValues[gradeKey] || 3.0;
            
            // Initialize if not exists
            if (!(gradeKey in gradeRadiusSettings)) {
                gradeRadiusSettings[gradeKey] = defaultRadius;
            }
            
            const controlDiv = document.createElement('div');
            controlDiv.className = 'grade-radius-control';
            controlDiv.style.cssText = `
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                padding: 4px 8px;
                background: var(--light-bg);
                border-radius: 4px;
            `;
            
            const label = document.createElement('label');
            label.textContent = `${grade}: `;
            label.style.cssText = `
                min-width: 50px;
                font-weight: 500;
                margin-right: 8px;
            `;
            
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '0.5';
            slider.max = '8.0';
            slider.step = '0.1';
            slider.value = gradeRadiusSettings[gradeKey];
            slider.style.cssText = `
                flex: 1;
                margin: 0 8px;
            `;
            
            const valueSpan = document.createElement('span');
            valueSpan.textContent = gradeRadiusSettings[gradeKey].toFixed(1) + ' km';
            valueSpan.style.cssText = `
                min-width: 45px;
                font-size: 0.9em;
                color: var(--text-muted);
            `;
            
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                gradeRadiusSettings[gradeKey] = value;
                valueSpan.textContent = value.toFixed(1) + ' km';
            });
            
            controlDiv.appendChild(label);
            controlDiv.appendChild(slider);
            controlDiv.appendChild(valueSpan);
            gradeRadiusControlsContainer.appendChild(controlDiv);
        });
    }

    // Helper function to update radius modifier description
    function updateRadiusModifierDescription() {
        const resetBtn = btnResetRadius;
        if (currentRadiusMode === 'grade') {
            resetBtn.textContent = 'Reset to Original Radius';
            resetBtn.title = 'Switch back to percentage-based radius';
        } else {
            resetBtn.textContent = 'Reset Radius';
            resetBtn.title = 'Reset radius modifier to 100%';
        }
    }

    function setupEventListeners() {
        applyFiltersBtn.addEventListener('click', fetchAndDisplayMapData);
        extractVendorsBtn.addEventListener('click', extractVisibleVendors);
        cityEl.addEventListener('change', (e) => {
            updateCityDependentCustomFilters(e.target.value);
            updateVendorAreaSubTypeFilter();
        });
        areaMainTypeEl.addEventListener('change', () => {
            updateAreaSubTypeCustomFilter();
            // Update playback button states when area type changes
            if (currentViewMode === 'historical') {
                updatePlaybackButtonStates();
            }
        });
        vendorAreaMainTypeEl.addEventListener('change', updateVendorAreaSubTypeFilter);
        
        // NEW: Multi-platform vendor map type change handler
        vendorMapTypeEl.addEventListener('change', (e) => {
            currentVendorMapType = e.target.value;
            console.log('Vendor map type changed to:', currentVendorMapType);
            updatePlatformSpecificFilters();
            
            // Update filter explanation helper
            const explanationUpdateEvent = new Event('change');
            setTimeout(() => {
                if (isExpressFilterEl) isExpressFilterEl.dispatchEvent(explanationUpdateEvent);
            }, 100);
            
            // Don't auto-fetch here - let user click Apply Filters button
        });
        
        // Lat/Lng finder
        btnFindLocation.addEventListener('click', () => {
            const lat = parseFloat(latFinderInputEl.value);
            const lng = parseFloat(lngFinderInputEl.value);
            if (isNaN(lat) || isNaN(lng)) {
                alert('Please enter valid numbers for Latitude and Longitude.');
                return;
            }
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                alert('Latitude must be between -90 and 90.\nLongitude must be between -180 and 180.');
                return;
            }
            // Remove previous temporary marker if it exists
            if (tempLocationMarker) {
                map.removeLayer(tempLocationMarker);
            }
            // Fly to the new location with a closer zoom
            map.flyTo([lat, lng], 16);
            // Add a distinct marker for the found location
            tempLocationMarker = L.circleMarker([lat, lng], {
                color: '#f44336', // Use a distinct red color
                radius: 10,
                weight: 3,
                opacity: 1,
                fillOpacity: 0.5,
                pane: 'markerPane' // Ensure it's on top
            }).bindPopup(`<b>Location</b><br>Lat: ${lat}<br>Lng: ${lng}`).addTo(map).openPopup();
        });
        
        // CSV file upload functionality
        csvFileInputEl.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    processCsvData(e.target.result);
                    btnClearCsvMarkers.style.display = 'block';
                    csvMarkerControlsEl.style.display = 'block';
                } catch (error) {
                    alert('Error processing CSV file: ' + error.message);
                    console.error('CSV processing error:', error);
                }
            };
            reader.readAsText(file);
        });
        
        // Clear CSV markers button
        btnClearCsvMarkers.addEventListener('click', () => {
            csvMarkersLayerGroup.clearLayers();
            btnClearCsvMarkers.style.display = 'none';
            csvMarkerControlsEl.style.display = 'none';
            csvFileInputEl.value = '';
        });
        
        // CSV marker size slider
        csvMarkerSizeEl.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            csvMarkerSizeValueEl.textContent = size + 'px';
            csvMarkerSettings.size = size;
        });
        
        // CSV marker color picker
        csvMarkerColorEl.addEventListener('change', (e) => {
            csvMarkerSettings.color = e.target.value;
        });
        
        // Apply CSV marker style changes
        btnApplyCsvStyle.addEventListener('click', () => {
            // Re-process existing markers with new style
            if (csvMarkersLayerGroup.getLayers().length > 0) {
                const currentMarkers = [];
                csvMarkersLayerGroup.eachLayer((layer) => {
                    const latLng = layer.getLatLng();
                    const popup = layer.getPopup();
                    currentMarkers.push({
                        lat: latLng.lat,
                        lng: latLng.lng,
                        popup: popup ? popup.getContent() : ''
                    });
                });
                
                csvMarkersLayerGroup.clearLayers();
                
                currentMarkers.forEach(markerData => {
                    const markerSize = csvMarkerSettings.size;
                    const iconSizeTotal = markerSize + 4;
                    const markerIcon = L.divIcon({
                        className: 'csv-marker-custom',
                        html: `<div style="background-color: ${csvMarkerSettings.color}; width: ${markerSize}px; height: ${markerSize}px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [iconSizeTotal, iconSizeTotal],
                        iconAnchor: [iconSizeTotal/2, iconSizeTotal/2]
                    });
                    
                    const marker = L.marker([markerData.lat, markerData.lng], { icon: markerIcon });
                    if (markerData.popup) {
                        marker.bindPopup(markerData.popup);
                    }
                    csvMarkersLayerGroup.addLayer(marker);
                });
            }
        });
        
        // Updated map type buttons
        Object.keys(mapTypeButtons).forEach(type => {
            const button = mapTypeButtons[type];
            button.addEventListener('click', () => {
                const typeMapping = {
                    densityTotal: 'order_density',
                    densityOrganic: 'order_density_organic',
                    densityNonOrganic: 'order_density_non_organic',
                    userDensity: 'user_density',
                    population: 'population',
                    vendors: 'none'
                };
                currentHeatmapType = typeMapping[type] || 'none';
                setActiveMapTypeButton(type);
                fetchAndDisplayMapData();
            });
        });
        
        btnToggleVendors.addEventListener('click', () => {
            vendorsAreVisible = !vendorsAreVisible;
            btnToggleVendors.textContent = vendorsAreVisible ? 'Vendors On' : 'Vendors Off';
            btnToggleVendors.classList.toggle('active', vendorsAreVisible);
            if (vendorsAreVisible) {
                if (!map.hasLayer(vendorLayerGroup)) map.addLayer(vendorLayerGroup);
            } else {
                if (map.hasLayer(vendorLayerGroup)) map.removeLayer(vendorLayerGroup);
            }
        });
        
        btnClearHeatmap.addEventListener('click', () => {
            currentHeatmapType = 'none';
            setActiveMapTypeButton(null);
            if (heatmapLayer) { map.removeLayer(heatmapLayer); heatmapLayer = null; }
        });
        
        Object.values(customFilterConfigs).forEach(config => {
            config.button.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDropdown(config);
            });
        });
        
        document.addEventListener('click', (e) => {
            Object.values(customFilterConfigs).forEach(config => {
                if (config.button && !config.button.contains(e.target) && config.panel && !config.panel.contains(e.target)) {
                    toggleDropdown(config, true);
                }
            });
        });
        
        vendorRadiusToggleBtn.addEventListener('click', () => {
            showVendorRadius = !showVendorRadius;
            vendorRadiusToggleBtn.textContent = showVendorRadius ? 'Hide Radius' : 'Show Radius';
            vendorRadiusToggleBtn.classList.toggle('active', showVendorRadius);
            redrawVendorRadii();
        });
        
        // Enhanced radius mode controls with grade-based option
        radiusModeSelector.addEventListener('change', (e) => {
            currentRadiusMode = e.target.value;
            updateRadiusModeUI();
        });
        
        vendorRadiusModifierEl.addEventListener('input', (e) => {
            const value = e.target.value;
            radiusModifierValueEl.textContent = value;
            currentRadiusModifier = parseInt(value) / 100;
        });
        
        vendorRadiusFixedEl.addEventListener('input', (e) => {
            const value = e.target.value;
            radiusFixedValueEl.textContent = value;
            currentRadiusFixed = parseFloat(value);
        });
        
        // Enhanced reset button to handle grade mode
        btnResetRadius.addEventListener('click', () => {
            if (currentRadiusMode === 'grade' || currentRadiusMode === 'grade-dynamic') {
                // Switch back to percentage mode when resetting from grade/grade-dynamic mode
                radiusModeSelector.value = 'percentage';
                currentRadiusMode = 'percentage';
                updateRadiusModeUI();
            }
            
            // Reset grade dynamic settings
            gradeRadiusSettings = {};
            
            vendorRadiusModifierEl.value = "100";
            radiusModifierValueEl.textContent = "100";
            currentRadiusModifier = 1.0;
            vendorRadiusFixedEl.value = "3";
            radiusFixedValueEl.textContent = "3";
            currentRadiusFixed = 3.0;
            fetchAndDisplayMapData(); // Re-fetch to apply original radius
        });
        
        // Grid visualization controls
        gridBlurEl.addEventListener('input', (e) => {
            gridBlurValueEl.textContent = e.target.value;
            applyGridVisualizationEffects();
        });
        
        gridFadeEl.addEventListener('input', (e) => {
            gridFadeValueEl.textContent = e.target.value;
            applyGridVisualizationEffects();
        });
        
        gridPointSizeEl.addEventListener('input', (e) => {
            gridPointSizeValueEl.textContent = e.target.value;
            // Re-draw grid with new point size
            if (areaMainTypeEl.value === 'coverage_grid') {
                drawCoverageGrid();
            }
        });
        
        marketingAreasOnTopBtn.addEventListener('click', () => {
            marketingAreasOnTop = !marketingAreasOnTop;
            marketingAreasOnTopBtn.textContent = marketingAreasOnTop ? 'On' : 'Off';
            marketingAreasOnTopBtn.classList.toggle('active', marketingAreasOnTop);
    
            if (marketingAreasOnTop) {
                restylePolygons();
                if (!map.hasLayer(polygonLayerGroup)) {
                    map.addLayer(polygonLayerGroup);
                }
            } else {
                if (map.hasLayer(polygonLayerGroup)) {
                    map.removeLayer(polygonLayerGroup);
                }
            }
            updateLayerOrder();
        });
        
        radiusEdgeColorEl.addEventListener('input', redrawVendorRadii);
        radiusInnerColorEl.addEventListener('input', redrawVendorRadii);
        radiusInnerNoneEl.addEventListener('change', redrawVendorRadii);
        areaFillColorEl.addEventListener('input', restylePolygons);
        areaFillNoneEl.addEventListener('change', restylePolygons);
        vendorMarkerSizeEl.addEventListener('input', (e) => updateVendorIconSize(e.target.value));
        
        // Enhanced heatmap control event listeners
        heatmapRadiusEl.addEventListener('input', (e) => {
            heatmapRadiusValueEl.textContent = e.target.value;
            heatmapConfig.autoOptimize = false; // Disable auto-optimize when user adjusts manually
            heatmapConfig.baseRadius = parseInt(e.target.value); // Update base value
            
            // Update auto-optimize button state
            const autoOptimizeBtn = document.getElementById('heatmap-auto-optimize');
            if (autoOptimizeBtn) {
                autoOptimizeBtn.textContent = 'Auto-Optimize Off';
                autoOptimizeBtn.classList.remove('active');
            }
            
            renderCurrentHeatmap();
        });

        heatmapBlurEl.addEventListener('input', (e) => {
            heatmapBlurValueEl.textContent = e.target.value;
            heatmapConfig.autoOptimize = false;
            heatmapConfig.baseBlur = parseInt(e.target.value);
            
            const autoOptimizeBtn = document.getElementById('heatmap-auto-optimize');
            if (autoOptimizeBtn) {
                autoOptimizeBtn.textContent = 'Auto-Optimize Off';
                autoOptimizeBtn.classList.remove('active');
            }
            
            renderCurrentHeatmap();
        });

        heatmapMaxValEl.addEventListener('input', (e) => {
            heatmapMaxValValueEl.textContent = e.target.value;
            heatmapConfig.autoOptimize = false;
            heatmapConfig.maxIntensity = parseFloat(e.target.value);
            
            const autoOptimizeBtn = document.getElementById('heatmap-auto-optimize');
            if (autoOptimizeBtn) {
                autoOptimizeBtn.textContent = 'Auto-Optimize Off';
                autoOptimizeBtn.classList.remove('active');
            }
            
            renderCurrentHeatmap();
        });

        // Setup additional controls
        setupAdditionalHeatmapListeners();
        
        // NEW: Dynamic Targets modal event listeners
        if (dynamicTargetsButton) {
            dynamicTargetsButton.addEventListener('click', () => {
                openDynamicTargetsModal();
            });
        }

        if (dynamicTargetsModalClose) {
            dynamicTargetsModalClose.addEventListener('click', () => {
                closeDynamicTargetsModal();
            });
        }

        if (dynamicTargetsModal) {
            dynamicTargetsModal.addEventListener('click', (e) => {
                if (e.target === dynamicTargetsModal) {
                    closeDynamicTargetsModal();
                }
            });
        }

        if (dynamicTargetsReset) {
            dynamicTargetsReset.addEventListener('click', () => {
                resetDynamicTargetsToDefaults();
            });
        }

        if (dynamicTargetsSave) {
            dynamicTargetsSave.addEventListener('click', () => {
                saveDynamicTargets();
            });
        }
        
        // Global target functionality
        if (applyGlobalTargetBtn) {
            applyGlobalTargetBtn.addEventListener('click', () => {
                applyGlobalTarget();
            });
        }
        
        // NEW: Vendor Grade Clear/Select All buttons
        if (vendorGradeClearAllBtn) {
            vendorGradeClearAllBtn.addEventListener('click', () => {
                const config = customFilterConfigs.vendorGrade;
                config.optionsData.forEach(option => option.checked = false);
                renderCustomDropdown(config);
                updateCustomDropdownButtonText(config);
            });
        }
        
        if (vendorGradeSelectAllBtn) {
            vendorGradeSelectAllBtn.addEventListener('click', () => {
                const config = customFilterConfigs.vendorGrade;
                config.optionsData.forEach(option => option.checked = true);
                renderCustomDropdown(config);
                updateCustomDropdownButtonText(config);
            });
        }
        
        if (vendorGradeACBtn) {
            vendorGradeACBtn.addEventListener('click', () => {
                const config = customFilterConfigs.vendorGrade;
                const acGrades = ["A", "A+", "A-", "B", "B-", "C", "C-"];
                config.optionsData.forEach(option => {
                    option.checked = acGrades.includes(option.value);
                });
                renderCustomDropdown(config);
                updateCustomDropdownButtonText(config);
            });
        }

        // Vendor Status ID buttons
        if (vendorStatusClearAllBtn) {
            vendorStatusClearAllBtn.addEventListener('click', () => {
                const config = customFilterConfigs.vendorStatus;
                config.optionsData.forEach(option => option.checked = false);
                renderCustomDropdown(config);
                updateCustomDropdownButtonText(config);
            });
        }

        if (vendorStatusSelectAllBtn) {
            vendorStatusSelectAllBtn.addEventListener('click', () => {
                const config = customFilterConfigs.vendorStatus;
                config.optionsData.forEach(option => option.checked = true);
                renderCustomDropdown(config);
                updateCustomDropdownButtonText(config);
            });
        }

        // Vendor Status Text buttons
        if (vendorStatusTextClearAllBtn) {
            vendorStatusTextClearAllBtn.addEventListener('click', () => {
                const config = customFilterConfigs.vendorStatusText;
                config.optionsData.forEach(option => option.checked = false);
                renderCustomDropdown(config);
                updateCustomDropdownButtonText(config);
            });
        }

        if (vendorStatusTextSelectAllBtn) {
            vendorStatusTextSelectAllBtn.addEventListener('click', () => {
                const config = customFilterConfigs.vendorStatusText;
                config.optionsData.forEach(option => option.checked = true);
                renderCustomDropdown(config);
                updateCustomDropdownButtonText(config);
            });
        }
    }
    
    function setActiveMapTypeButton(activeTypeKey) {
        Object.values(mapTypeButtons).forEach(btn => btn.classList.remove('active-map-type'));
        if (activeTypeKey && mapTypeButtons[activeTypeKey]) {
            mapTypeButtons[activeTypeKey].classList.add('active-map-type');
        }
    }

    function showLoading(isLoading, message = 'LOADING ...') {
        if (isLoading) {
            bodyEl.classList.add('is-loading');
            globalLoadingOverlayEl.textContent = message;
            globalLoadingOverlayEl.classList.add('visible');
        } else {
            bodyEl.classList.remove('is-loading');
            globalLoadingOverlayEl.classList.remove('visible');
        }
    }
    
    // Enhanced fetchAndDisplayMapData function with multi-platform support
    async function fetchAndDisplayMapData() {
        // Clear the temporary marker on new search
        if (tempLocationMarker) {
            map.removeLayer(tempLocationMarker);
            tempLocationMarker = null;
        }

        const params = new URLSearchParams();
        const isCoverageGrid = areaMainTypeEl.value === 'coverage_grid';
        const selectedCity = cityEl.value;
        const selectedBLs = getSelectedValuesFromCustomDropdown(customFilterConfigs.businessLine);

        // Enhanced validation for coverage grid to support both Tehran and Mashhad
        if (isCoverageGrid && ['tehran', 'mashhad'].includes(selectedCity)) {
            if (selectedBLs.length !== 1) {
                showLoading(false);
                alert(`Target-based Coverage Analysis for ${selectedCity} requires selecting exactly ONE Business Line.`);
                if(applyFiltersBtn) applyFiltersBtn.disabled = false;
                return;
            }
        }

        params.append('city', cityEl.value);
        params.append('start_date', daterangeStartEl.value);
        params.append('end_date', daterangeEndEl.value);
        params.append('area_type_display', areaMainTypeEl.value);
        
        // Add current zoom level to params for backend optimization
        params.append('zoom_level', map.getZoom().toString());

        getSelectedValuesFromCustomDropdown(customFilterConfigs.areaSubType)
            .forEach(val => params.append(customFilterConfigs.areaSubType.paramName, val));
        getSelectedValuesFromCustomDropdown(customFilterConfigs.businessLine)
            .forEach(val => params.append(customFilterConfigs.businessLine.paramName, val));

        const vendorCodesText = vendorCodesFilterEl.value.trim();
        if (vendorCodesText) params.append('vendor_codes_filter', vendorCodesText);

        params.append('vendor_area_main_type', vendorAreaMainTypeEl.value);
        getSelectedValuesFromCustomDropdown(customFilterConfigs.vendorAreaSubType)
            .forEach(val => params.append(customFilterConfigs.vendorAreaSubType.paramName, val));
        getSelectedValuesFromCustomDropdown(customFilterConfigs.vendorStatus)
            .forEach(val => params.append(customFilterConfigs.vendorStatus.paramName, val));
        getSelectedValuesFromCustomDropdown(customFilterConfigs.vendorGrade)
            .forEach(val => params.append(customFilterConfigs.vendorGrade.paramName, val));
        getSelectedValuesFromCustomDropdown(customFilterConfigs.vendorStatusText)
            .forEach(val => params.append(customFilterConfigs.vendorStatusText.paramName, val));

        params.append('vendor_visible', vendorVisibleEl.value);
        params.append('vendor_is_open', vendorIsOpenEl.value);
        params.append('heatmap_type_request', currentHeatmapType);
        
        // NEW: Multi-platform vendor parameters
        params.append('vendor_map_type', currentVendorMapType);
        if (isExpressFilterEl.value !== 'all') {
            params.append('is_express', isExpressFilterEl.value);
        }
        if (isDualFilterEl.value !== 'all') {
            params.append('is_dual', isDualFilterEl.value);
        }
        if (isOwnDeliveryEl.value !== 'all') {
            params.append('is_own_delivery', isOwnDeliveryEl.value);
        }
        if (isOfoodDeliveryEl.value !== 'all') {
            params.append('is_ofood_delivery', isOfoodDeliveryEl.value);
        }
        if (availabilityFilterEl.value !== '') {
            params.append('availability_min', availabilityFilterEl.value);
        }
        
        // NEW: Delivery rate parameters
        if (ofoodDeliveryRateMinEl.value !== '') {
            params.append('ofood_delivery_rate_min', ofoodDeliveryRateMinEl.value);
        }
        if (ofoodDeliveryRateMaxEl.value !== '') {
            params.append('ofood_delivery_rate_max', ofoodDeliveryRateMaxEl.value);
        }
        if (ownDeliveryRateMinEl.value !== '') {
            params.append('own_delivery_rate_min', ownDeliveryRateMinEl.value);
        }
        if (ownDeliveryRateMaxEl.value !== '') {
            params.append('own_delivery_rate_max', ownDeliveryRateMaxEl.value);
        }
        
        // Enhanced radius parameters with grade support
        params.append('radius_mode', currentRadiusMode);
        if (currentRadiusMode === 'fixed') {
            params.append('radius_fixed', currentRadiusFixed);
        } else if (currentRadiusMode === 'percentage') {
            params.append('radius_modifier', currentRadiusModifier);
        } else if (currentRadiusMode === 'grade-dynamic') {
            // Send all grade radius settings
            Object.entries(gradeRadiusSettings).forEach(([grade, radius]) => {
                params.append('grade_radius', `${grade}:${radius}`);
            });
        }
        // For grade mode, we just pass the mode - backend will handle the grade-based logic

        // NEW: Add historical hour parameter when in historical mode
        if (currentViewMode === 'historical' && currentHistoricalHour !== null) {
            params.append('hour_idx', currentHistoricalHour);
        }

        console.log("Fetching multi-platform map data with params:", params.toString());

        const isCoverageGridRequest = areaMainTypeEl.value === 'coverage_grid';

        isLoadingData = true;
        showLoading(true);

        try {
            let response;
            
            // NEW: Use POST method if dynamic targets are present to avoid URL length issues
            if (Object.keys(dynamicTargetsData).length > 0) {
                console.log("Including dynamic targets:", dynamicTargetsData);
                console.log("Using POST method due to dynamic targets");
                
                // Create form data for POST request
                const formData = new FormData();
                for (const [key, value] of params.entries()) {
                    formData.append(key, value);
                }
                formData.append('dynamic_targets', JSON.stringify(dynamicTargetsData));
                
                // NEW: Use historical endpoint if in historical mode
                const endpoint = currentViewMode === 'historical' ? '/historical-map-data' : '/map-data';
                response = await fetch(`${API_BASE_URL}${endpoint}`, {
                    method: 'POST',
                    body: formData
                });
            } else {
                console.log("No dynamic targets to send - using GET method");
                // NEW: Use historical endpoint if in historical mode
                const endpoint = currentViewMode === 'historical' ? '/historical-map-data' : '/map-data';
                response = await fetch(`${API_BASE_URL}${endpoint}?${params.toString()}`);
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({error: "Unknown server error", details: response.statusText}));
                showLoading(true, `Error: ${errorData.error || response.statusText}. Check console.`);
                throw new Error(`HTTP error ${response.status}: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            if(data.error){
                showLoading(true, `Backend error: ${data.error}. Check console.`);
                throw new Error(`Backend error: ${data.error} - ${data.details || ''}`);
            }

            // Log multi-platform response data
            console.log('Multi-platform response received:', {
                vendors: data.vendors?.length || 0,
                heatmapPoints: data.heatmap_data?.length || 0,
                vendorMapType: data.vendor_map_type || 'unknown',
                vendorSources: data.vendor_sources || [],
                dataFreshness: data.data_freshness
            });

            allVendorsData = data.vendors || [];
            allPolygonsData = data.polygons || null;
            lastHeatmapData = data.heatmap_data || null;
            allCoverageGridData = normalizeCoverageGridPayload(data);

            // Debug logging for heatmap data
            if (lastHeatmapData && lastHeatmapData.length > 0) {
                console.log(`Received ${lastHeatmapData.length} heatmap points for type: ${currentHeatmapType}`);
                const values = lastHeatmapData.map(p => p.value).filter(v => v != null);
                if (values.length > 0) {
                    console.log(`Value range: ${Math.min(...values).toFixed(2)} - ${Math.max(...values).toFixed(2)}`);
                }
            }

            updateMapLayers();

            // Update vendor count display for historical mode
            if (currentViewMode === 'historical') {
                updateVendorCount(allVendorsData.length || 0);
            }

            isLoadingData = false;
            showLoading(false);

            // Handle playback continuation (only for non-coverage grid)
            if (isPlaying && !isCoverageGridRequest) {
                // For non-coverage grid, use regular speed
                playbackDelayTimeout = setTimeout(() => {
                    if (isPlaying) {
                        proceedToNextPlaybackStep();
                    }
                }, playbackSpeed); // Regular timing (1 second)
            } else if (isPlaying && isCoverageGridRequest) {
                // Stop playback if somehow it's playing with coverage grid
                console.log("Stopping playback - coverage grid not supported");
                stopPlayback();
            }
        } catch (error) {
            isLoadingData = false;
            console.error("Multi-platform Fetch/Display Error:", error);
            if (!bodyEl.classList.contains('is-loading') || globalLoadingOverlayEl.textContent === 'LOADING ...') {
                showLoading(true, `Error: ${error.message}. Check console or try refreshing.`);
            }
        }
    }

    function updateMapLayers() {
        redrawVendorMarkersAndRadii();
        restylePolygons();
        drawCoverageGrid();
        renderCurrentHeatmap();
        
        if (areaMainTypeEl.value === 'coverage_grid') {
            if (!marketingAreasOnTop && map.hasLayer(polygonLayerGroup)) {
                map.removeLayer(polygonLayerGroup);
            }
        } else {
            if (!map.hasLayer(polygonLayerGroup)) {
                map.addLayer(polygonLayerGroup);
            }
        }
        adjustMapView();
        applyGridVisualizationEffects();
        updateLayerOrder();
    }
    
    // Enhanced renderCurrentHeatmap function
    function renderCurrentHeatmap() {
        if (heatmapLayer) {
            map.removeLayer(heatmapLayer);
            heatmapLayer = null;
        }

        if (currentHeatmapType === 'none' || !lastHeatmapData || lastHeatmapData.length === 0) {
            return;
        }

        // Filter out invalid data points
        const validData = lastHeatmapData.filter(p => 
            p.lat != null && p.lng != null && p.value != null && 
            !isNaN(p.lat) && !isNaN(p.lng) && !isNaN(p.value) &&
            p.value > 0
        );

        if (validData.length === 0) {
            console.warn('No valid heatmap data after filtering');
            return;
        }

        currentZoomLevel = map.getZoom();
        
        // Get optimized parameters
        const optimalParams = heatmapConfig.autoOptimize ? 
            calculateOptimalHeatmapParams(validData, currentZoomLevel) : 
            getZoomAdjustedHeatmapOptions();

        lastOptimalParams = optimalParams;

        // Update UI to show optimal parameters
        if (heatmapConfig.autoOptimize) {
            updateHeatmapControlsDisplay(optimalParams);
        }

        // Prepare heatmap data with proper intensity scaling
        const heatPoints = validData.map(p => {
            // Ensure values are properly scaled for the heatmap
            const intensity = Math.max(0.1, Math.min(100, p.value)) / 100;
            return [p.lat, p.lng, intensity];
        });

        // Enhanced heatmap options
        let heatOptions = {
            radius: optimalParams.radius,
            blur: optimalParams.blur,
            max: optimalParams.max,
            minOpacity: 0.3,
            maxZoom: 18,
            pane: 'overlayPane'
        };

        // Enhanced gradients for different heatmap types
        if (currentHeatmapType === 'order_density') {
            heatOptions.gradient = {
                0.0: 'rgba(0, 0, 255, 0)',
                0.15: 'rgba(0, 100, 255, 0.4)',
                0.3: 'rgba(0, 200, 255, 0.6)',
                0.5: 'rgba(0, 255, 100, 0.8)',
                0.7: 'rgba(255, 255, 0, 0.9)',
                1.0: 'rgba(255, 0, 0, 1)'
            };
        } else if (currentHeatmapType === 'order_density_organic') {
            heatOptions.gradient = {
                0.0: 'rgba(0, 128, 0, 0)',
                0.2: 'rgba(0, 200, 0, 0.5)',
                0.4: 'rgba(100, 255, 0, 0.7)',
                0.6: 'rgba(200, 255, 0, 0.8)',
                0.8: 'rgba(255, 200, 0, 0.9)',
                1.0: 'rgba(255, 100, 0, 1)'
            };
        } else if (currentHeatmapType === 'order_density_non_organic') {
            heatOptions.gradient = {
                0.0: 'rgba(128, 0, 128, 0)',
                0.2: 'rgba(150, 0, 150, 0.5)',
                0.4: 'rgba(200, 0, 200, 0.7)',
                0.6: 'rgba(255, 0, 150, 0.8)',
                0.8: 'rgba(255, 50, 100, 0.9)',
                1.0: 'rgba(255, 0, 0, 1)'
            };
        } else if (currentHeatmapType === 'user_density') {
            heatOptions.gradient = {
                0.0: 'rgba(75, 0, 130, 0)',
                0.2: 'rgba(100, 50, 200, 0.5)',
                0.4: 'rgba(150, 100, 255, 0.7)',
                0.6: 'rgba(200, 150, 255, 0.8)',
                0.8: 'rgba(255, 200, 150, 0.9)',
                1.0: 'rgba(255, 100, 0, 1)'
            };
        } else {
            // Default gradient for population and others
            heatOptions.gradient = {
                0.0: 'rgba(0, 0, 255, 0)',
                0.25: 'rgba(0, 255, 255, 0.6)',
                0.5: 'rgba(0, 255, 0, 0.8)',
                0.75: 'rgba(255, 255, 0, 0.9)',
                1.0: 'rgba(255, 0, 0, 1)'
            };
        }

        console.log(`Rendering heatmap: ${validData.length} points, radius: ${optimalParams.radius}, blur: ${optimalParams.blur}, max: ${optimalParams.max.toFixed(2)}`);

        heatmapLayer = L.heatLayer(heatPoints, heatOptions).addTo(map);

        // Make heatmap non-interactive
        if (heatmapLayer && heatmapLayer.getPane()) {
            heatmapLayer.getPane().style.pointerEvents = 'none';
        }
    }
    
    function applyGridVisualizationEffects() {
        const blur = gridBlurEl.value;
        const fade = gridFadeEl.value / 100;
        
        // Apply CSS filter to the coverage grid pane
        const coveragePane = map.getPane('coverageGridPane');
        if (coveragePane) {
            coveragePane.style.filter = `blur(${blur}px)`;
            coveragePane.style.opacity = fade;
        }
    }
    
    function updateLayerOrder() {
        if (marketingAreasOnTop) {
            // Move marketing areas (polygons) on top of grid
            map.getPane('polygonPane').style.zIndex = 470;
            map.getPane('coverageGridPane').style.zIndex = 460;
        } else {
            // Default order - grid on top of polygons
            map.getPane('polygonPane').style.zIndex = 450;
            map.getPane('coverageGridPane').style.zIndex = 460;
        }
    }
    
    function drawCoverageGrid() {
        coverageGridLayerGroup.clearLayers();
        if (areaMainTypeEl.value !== 'coverage_grid' || !allCoverageGridData || allCoverageGridData.length === 0) {
            return;
        }
        
        // Get current grid point size
        const gridPointSize = parseInt(gridPointSizeEl.value) || 6;
        
        allCoverageGridData.forEach(point => {
            // Guard against missing lat/lng coordinates
            const lat = toNum(point.lat);
            const lng = toNum(point.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return; // Skip invalid points
            }

            let color = '#808080'; // Default to neutral grey
            let popupContent = `<b>Coverage at (${lat.toFixed(4)}, ${lng.toFixed(4)})</b><br>`;
            if (point.marketing_area) {
                popupContent += `<b>Marketing Area:</b> ${decodeURIComponentSafe(point.marketing_area)}<br>`;
            }
            if (point.target_business_line && point.target_value != null) {
                const actual_value = toNum(point.actual_value, 0);
                const target_value = toNum(point.target_value, 0);
                const performance_ratio = toNum(point.performance_ratio);
                // Coloring logic based on performance ratio (actual / target)
                if (actual_value === 0) {
                    color = '#d3d3d3'; // Light Grey (Zero Coverage)
                } else if (performance_ratio != null && Number.isFinite(performance_ratio)) {
                    if (performance_ratio >= 1.2) {
                        color = '#004d00'; // Darker Green (Exceeds Target by 20%+)
                    } else if (performance_ratio >= 1.0) {
                        color = '#00FF00'; // Bright Green (Meets or slightly exceeds Target)
                    } else if (performance_ratio >= 0.8) {
                        color = '#ffff00'; // Yellow (Good, 80%-99%)
                    } else if (performance_ratio >= 0.6) {
                        color = '#ff9900'; // Orange (Okay, 60%-79%)
                    } else if (performance_ratio >= 0.4) {
                        color = '#ff0000'; // Red (Poor, 40%-59%)
                    } else if (performance_ratio >= 0.2) {
                        color = '#8B0000'; // Dark Red (Very Poor, 20%-39%)
                    } else {
                        color = '#000000'; // Black (Extremely Poor, <20%)
                    }
                } else {
                    color = '#808080'; // Default gray if ratio can't be calculated
                }
                // Build a detailed popup for target-based analysis
                popupContent += `<hr style="margin: 4px 0;"><b>Target Analysis (${point.target_business_line})</b><br>`;
                popupContent += `<b>Target Count:</b> ${target_value}<br>`;
                popupContent += `<b>Actual Count:</b> ${actual_value}<br>`;
                const performanceDisplay = (performance_ratio != null && Number.isFinite(performance_ratio))
                    ? `${(performance_ratio * 100).toFixed(0)}%`
                    : 'N/A';
                popupContent += `<b>Performance:</b> <b style="color:${color};">${performanceDisplay}</b><br>`;
            
            } else {
                popupContent += `<br><i>No target data found for this Business Line in this area.</i>`;
            }
            // Add general coverage details to all popups
            const coverage = point.coverage || {};
            const totalVendors = toNum(coverage.total_vendors, 0);
            popupContent += `<hr style="margin: 4px 0;"><b>Total Covering Vendors:</b> ${totalVendors}<br>`;

            const byBusinessLine = coverage.by_business_line || {};
            if (Object.keys(byBusinessLine).length > 0) {
                popupContent += '<b>By Business Line:</b><br>';
                Object.entries(byBusinessLine)
                    .filter(([bl, count]) => Number.isFinite(Number(count)))
                    .sort((a, b) => Number(b[1]) - Number(a[1])) // Sort by count descending
                    .forEach(([bl, count]) => {
                        popupContent += `  ${bl}: ${Number(count)}<br>`;
                    });
            }

            const byGrade = coverage.by_grade || {};
            if (Object.keys(byGrade).length > 0) {
                popupContent += '<b>By Grade:</b><br>';
                Object.entries(byGrade)
                    .filter(([grade, count]) => Number.isFinite(Number(count)))
                    .sort((a,b) => Number(b[1]) - Number(a[1]))
                    .forEach(([grade, count]) => {
                        popupContent += `  ${grade}: ${Number(count)}<br>`;
                    });
            }
            const marker = L.circleMarker([lat, lng], {
                radius: gridPointSize,
                fillColor: color,
                color: '#333',
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.8,
                pane: 'coverageGridPane'
            });
            marker.bindPopup(popupContent);
            coverageGridLayerGroup.addLayer(marker);
        });
    }

    function adjustMapView() {
        let bounds;
        const hasVisibleVendors = vendorsAreVisible && vendorLayerGroup.getLayers().length > 0;
        const hasVisiblePolygons = map.hasLayer(polygonLayerGroup) && polygonLayerGroup.getLayers().length > 0;
        const hasVisibleCoverage = coverageGridLayerGroup.getLayers().length > 0;
        
        let allVisibleLayers = L.featureGroup();
        if (hasVisibleVendors) allVisibleLayers.addLayer(vendorLayerGroup);
        if (hasVisiblePolygons) allVisibleLayers.addLayer(polygonLayerGroup);
        if (hasVisibleCoverage) allVisibleLayers.addLayer(coverageGridLayerGroup);
        if (allVisibleLayers.getLayers().length > 0) {
            bounds = allVisibleLayers.getBounds();
        }
        
        if (bounds && bounds.isValid()) {
            map.fitBounds(bounds, {padding: [50, 50]});
        } else if (cityEl.value === "tehran") {
            map.setView([35.7219, 51.3347], 11);
        } else if (cityEl.value === "mashhad") {
            map.setView([36.297, 59.606], 12);
        } else if (cityEl.value === "shiraz") {
            map.setView([29.5918, 52.5837], 12);
        }
    }

    function redrawVendorMarkersAndRadii() {
        vendorLayerGroup.clearLayers(); 
        if (!allVendorsData || allVendorsData.length === 0) return;
        allVendorsData.forEach(vendor => {
            if (vendor.latitude == null || vendor.longitude == null) return; 
            
            // Enhanced popup content with multi-platform information
            let popupContent = `<b>${vendor.vendor_name || 'N/A'}</b><br>
                                Code: ${vendor.vendor_code || 'N/A'}<br>
                                Platform: ${vendor.vendor_source ? vendor.vendor_source.toUpperCase() : 'N/A'}<br>
                                Status: ${vendor.status_id !== null ? vendor.status_id : 'N/A'}<br>
                                Grade: ${vendor.grade || 'N/A'}<br>
                                Visible: ${vendor.visible == 1 ? 'Yes' : (vendor.visible == 0 ? 'No' : 'N/A')}<br>
                                Open: ${vendor.open == 1 ? 'Yes' : (vendor.open == 0 ? 'No' : 'N/A')}<br>`;
            
            // Add dual platform information
            if (vendor.is_dual !== undefined) {
                popupContent += `Dual Platform: ${vendor.is_dual == 1 ? 'Yes' : 'No'}<br>`;
            }
            
            // Add Snappfood-specific information
            if (vendor.vendor_source === 'snappfood' && vendor.is_express !== undefined) {
                popupContent += `Express Delivery: ${vendor.is_express == 1 ? 'Yes' : 'No'}<br>`;
            }
            
            // Add Tapsifood delivery type information
            if (vendor.vendor_source === 'tapsifood' || vendor.vendor_source === 'historical_tapsifood') {
                let deliveryTypes = [];
                if (vendor.ofood_delivery == 1) deliveryTypes.push('oFood');
                if (vendor.own_delivery == 1) deliveryTypes.push('Own');
                const deliveryText = deliveryTypes.length > 0 ? deliveryTypes.join(' + ') : 'None';
                popupContent += `Delivery: ${deliveryText}<br>`;
                
                // NEW: Add delivery rates to tooltip
                if (vendor.ofood_delivery_rate !== null && vendor.ofood_delivery_rate !== undefined) {
                    popupContent += `oFood Rate: ${vendor.ofood_delivery_rate}%<br>`;
                } else if (vendor.ofood_delivery == 1) {
                    popupContent += `oFood Rate: N/A<br>`;
                }
                
                if (vendor.own_delivery_rate !== null && vendor.own_delivery_rate !== undefined) {
                    popupContent += `Own Rate: ${vendor.own_delivery_rate}%<br>`;
                } else if (vendor.own_delivery == 1) {
                    popupContent += `Own Rate: N/A<br>`;
                }
            }
            
            // Show radius with mode information
            if (vendor.radius) {
                popupContent += `Radius: ${vendor.radius.toFixed(2)} km`;
                if (currentRadiusMode === 'grade') {
                    popupContent += ` <i>(grade-based)</i>`;
                } else if (currentRadiusMode === 'fixed') {
                    popupContent += ` <i>(fixed)</i>`;
                } else {
                    popupContent += ` <i>(${Math.round(currentRadiusModifier * 100)}%)</i>`;
                }
                popupContent += `<br>`;
            } else {
                popupContent += `Radius: N/A<br>`;
            }
            
            // Create platform-specific markers with different colors
            let markerColor = vendor.vendor_source === 'snappfood' ? '#FF6B35' : '#2979FF'; // Orange for Snappfood, Blue for Tapsifood
            if (vendor.is_dual == 1) {
                markerColor = '#1565C0'; // Deep blue for dual vendors (changed from purple)
            }
            
            // Use different marker styles based on platform
            let marker;
            if (vendor.vendor_source === 'snappfood') {
                // Different icon for Snappfood vendors
                const snappfoodIcon = L.divIcon({
                    className: 'snappfood-marker',
                    html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                });
                marker = L.marker([vendor.latitude, vendor.longitude], {icon: snappfoodIcon});
            } else {
                // Use default icon for Tapsifood vendors
                marker = L.marker([vendor.latitude, vendor.longitude], {icon: defaultVendorIcon});
            }
            
            marker.bindPopup(popupContent);
            vendorLayerGroup.addLayer(marker);
        });
        redrawVendorRadii(); 
    }
    
    function redrawVendorRadii() {
        // Remove existing circles
        const circles = [];
        vendorLayerGroup.eachLayer(layer => {
            if (layer instanceof L.Circle) {
                circles.push(layer);
            }
        });
        circles.forEach(circle => vendorLayerGroup.removeLayer(circle));
        if (!showVendorRadius || !allVendorsData) return; 
        const rEdgeColor = radiusEdgeColorEl.value;
        const rInnerIsNone = radiusInnerNoneEl.checked;
        const rInnerColor = rInnerIsNone ? 'transparent' : radiusInnerColorEl.value;
        allVendorsData.forEach(vendor => {
            if (vendor.latitude != null && vendor.longitude != null && vendor.radius > 0) {
                 L.circle([vendor.latitude, vendor.longitude], {
                    radius: vendor.radius * 1000, // radius is already modified by backend
                    color: rEdgeColor, 
                    fillColor: rInnerColor, 
                    fillOpacity: rInnerIsNone ? 0 : 0.25, 
                    weight: 1.5,
                    pane: 'shadowPane' // Render circles behind markers AND polygons
                }).addTo(vendorLayerGroup); 
            }
        });
    }

    function restylePolygons() {
        polygonLayerGroup.clearLayers();
        if (!allPolygonsData || !allPolygonsData.features || allPolygonsData.features.length === 0) return;
        const polyFillIsNone = areaFillNoneEl.checked;
        const polyFillColor = polyFillIsNone ? 'transparent' : areaFillColorEl.value;
        
        L.geoJSON(allPolygonsData, {
            pane: 'polygonPane',
            style: (feature) => {
                let defaultStyle = {
                    color: "#1E88E5", weight: 1.5, opacity: 0.7,
                    fillColor: polyFillColor, fillOpacity: polyFillIsNone ? 0 : 0.3
                };
                if (!feature.properties || Object.keys(feature.properties).length <= 2) {
                    return defaultStyle;
                }
                return defaultStyle;
            },
            onEachFeature: (feature, layer) => {
                let popupContent = '';
                if (feature.properties) {
                    const p = feature.properties;
                    const nameCand = p.name || p.NAME || p.Name || p.Region || p.REGION_N || p.NAME_1 || p.NAME_2 || p.district || p.NAME_MAHAL;
                    const name = decodeURIComponentSafe(nameCand) || "Area Detail";
                    popupContent += `<b>${name}</b>`;
                    // Population Data Section (for Tehran districts)
                    if (p.Pop != null || p.PopDensity != null) {
                        popupContent += `<br><hr style="margin: 5px 0; border-color: #eee;"><em>Population Stats:</em>`;
                        if (p.Pop != null) {
                            popupContent += `<br><b>Population:</b> ${Number(p.Pop).toLocaleString()}`;
                        }
                        if (p.PopDensity != null) {
                             popupContent += `<br><b>Population Density:</b> ${Number(p.PopDensity).toFixed(2)}/km²`;
                        }
                    }
                    
                    // Filter-Based Data Section (applies to all polygon types)
                    if (p.vendor_count != null || p.unique_user_count != null) {
                        popupContent += `<br><hr style="margin: 5px 0; border-color: #eee;"><em>Metrics (${currentVendorMapType}):</em>`;
                        
                        // Vendor Metrics
                        if (p.vendor_count != null) {
                             popupContent += `<br><b>Total Filtered Vendors:</b> ${p.vendor_count}`;
                        }
                        
                        // Add platform source breakdown
                        if (p.source_counts) {
                            try {
                                // Parse JSON string to object if needed
                                const sourceCounts = typeof p.source_counts === 'string' ? JSON.parse(p.source_counts) : p.source_counts;
                                if (sourceCounts && Object.keys(sourceCounts).length > 0) {
                                    popupContent += `<br><b>- By Platform:</b> `;
                                    const sourceStrings = Object.entries(sourceCounts)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([source, count]) => `${source}: ${count}`);
                                    popupContent += sourceStrings.join(', ');
                                }
                            } catch (e) {
                                console.warn('Failed to parse source_counts:', p.source_counts, e);
                            }
                        }

                        if (p.grade_counts) {
                            try {
                                // Parse JSON string to object if needed
                                const gradeCounts = typeof p.grade_counts === 'string' ? JSON.parse(p.grade_counts) : p.grade_counts;
                                if (gradeCounts && Object.keys(gradeCounts).length > 0) {
                                    popupContent += `<br><b>- By Grade:</b> `;
                                    const gradeStrings = Object.entries(gradeCounts)
                                                              .sort((a, b) => b[1] - a[1]) // Sort by count desc
                                                              .map(([grade, count]) => `${grade}: ${count}`);
                                    popupContent += gradeStrings.join(', ');
                                }
                            } catch (e) {
                                console.warn('Failed to parse grade_counts:', p.grade_counts, e);
                            }
                        }
                        if (p.vendor_per_10k_pop != null) {
                            popupContent += `<br><b>- Vendors per 10k Pop:</b> ${Number(p.vendor_per_10k_pop).toFixed(2)}`;
                        }
                        // Customer Metrics
                        if (p.unique_user_count != null) {
                             popupContent += `<br><b>Unique Customers (date range):</b> ${p.unique_user_count.toLocaleString()}`;
                        }
                        if (p.total_unique_user_count != null) {
                             popupContent += `<br><b>Unique Customers (all time):</b> ${p.total_unique_user_count.toLocaleString()}`;
                        }
                    } else if (Object.keys(p).length <= 4) {
                         // Don't show the "Metrics" header if there are no metrics to display.
                    }
                } else {
                    popupContent = '<b>Area</b>';
                }
                layer.bindPopup(popupContent);
            }
        }).addTo(polygonLayerGroup);
    }

    // Extract visible vendors functionality
    async function extractVisibleVendors() {
        if (!allVendorsData || allVendorsData.length === 0) {
            alert('No vendors data available to extract.');
            return;
        }

        // Show loading state
        const originalText = extractVendorsBtn.innerHTML;
        extractVendorsBtn.innerHTML = '<span class="extract-icon">⏳</span>Processing...';
        extractVendorsBtn.disabled = true;

        try {
            const response = await fetch('/api/extract-vendors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    vendors: allVendorsData,
                    filters: getCurrentFilterState(),
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Get the filename from response headers
            const contentDisposition = response.headers.get('content-disposition');
            const filename = contentDisposition 
                ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                : `vendors_export_${new Date().toISOString().split('T')[0]}.xlsx`;

            // Create download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            // Show success
            extractVendorsBtn.innerHTML = '<span class="extract-icon">✅</span>Downloaded!';
            setTimeout(() => {
                extractVendorsBtn.innerHTML = originalText;
                extractVendorsBtn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Extract vendors failed:', error);
            alert(`Failed to extract vendors: ${error.message}`);
            
            extractVendorsBtn.innerHTML = originalText;
            extractVendorsBtn.disabled = false;
        }
    }

    function getCurrentFilterState() {
        return {
            city: cityEl.value,
            dateStart: daterangeStartEl.value,
            dateEnd: daterangeEndEl.value,
            businessLines: getSelectedValuesFromCustomDropdown(customFilterConfigs.businessLine),
            vendorMapType: currentVendorMapType,
            vendorStatuses: getSelectedValuesFromCustomDropdown(customFilterConfigs.vendorStatus),
            vendorGrades: getSelectedValuesFromCustomDropdown(customFilterConfigs.vendorGrade),
            vendorStatusText: getSelectedValuesFromCustomDropdown(customFilterConfigs.vendorStatusText),
            radiusMode: currentRadiusMode,
            radiusModifier: currentRadiusModifier,
            vendorVisible: vendorVisibleEl.value,
            vendorIsOpen: vendorIsOpenEl.value,
            isExpress: isExpressFilterEl.value,
            isDual: isDualFilterEl.value,
            ownDelivery: isOwnDeliveryEl.value,
            ofoodDelivery: isOfoodDeliveryEl.value,
            availability: availabilityFilterEl.value,
            ofoodDeliveryRateMin: ofoodDeliveryRateMinEl.value,
            ofoodDeliveryRateMax: ofoodDeliveryRateMaxEl.value,
            ownDeliveryRateMin: ownDeliveryRateMinEl.value,
            ownDeliveryRateMax: ownDeliveryRateMaxEl.value
        };
    }
    
    // NEW: Dynamic Targets Modal Functions
    
    function openDynamicTargetsModal() {
        const selectedCity = cityEl.value;
        const selectedBusinessLines = getSelectedValuesFromCustomDropdown(customFilterConfigs.businessLine);
        
        if (!selectedCity) {
            alert('Please select a city first');
            return;
        }
        
        if (selectedBusinessLines.length === 0) {
            alert('Please select at least one business line first');
            return;
        }
        
        if (selectedBusinessLines.length > 1) {
            alert('Please select only one business line for dynamic targets');
            return;
        }
        
        const businessLine = selectedBusinessLines[0];
        
        modalSelectedCity.textContent = selectedCity.charAt(0).toUpperCase() + selectedCity.slice(1);
        modalSelectedBusinessLine.textContent = businessLine;
        
        populateModalContent(selectedCity, businessLine);
        dynamicTargetsModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    function closeDynamicTargetsModal() {
        dynamicTargetsModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    function populateModalContent(city, businessLine) {
        if (!dynamicTargetsModalContent || !initialFilterData) return;
        
        const marketingAreas = initialFilterData.marketing_areas_by_city?.[city] || [];
        
        if (marketingAreas.length === 0) {
            dynamicTargetsModalContent.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No marketing areas available for this city</p>';
            return;
        }
        
        dynamicTargetsModalContent.innerHTML = '';
        
        marketingAreas.forEach(areaName => {
            const areaDiv = document.createElement('div');
            areaDiv.className = 'dynamic-target-area-modal';
            
            const areaTitle = document.createElement('h4');
            const decodedAreaName = decodeURIComponentSafe(areaName);
            areaTitle.textContent = decodedAreaName;
            areaDiv.appendChild(areaTitle);
            
            // Debug: Log the area name used for storage vs display
            console.log(`Modal area - Original: "${areaName}", Decoded: "${decodedAreaName}"`);
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dynamic-target-item-modal';
            
            const label = document.createElement('span');
            label.className = 'dynamic-target-label-modal';
            label.textContent = `${businessLine} Target`;
            
            const inputContainer = document.createElement('div');
            inputContainer.className = 'dynamic-target-input-container';
            
            const input = document.createElement('input');
            input.className = 'dynamic-target-input-modal';
            input.type = 'number';
            input.min = '0';
            input.placeholder = 'Default';
            
            // Get current value (dynamic override or empty for default)
            const currentValue = dynamicTargetsData[city]?.[businessLine]?.[areaName];
            if (currentValue !== undefined) {
                input.value = currentValue;
            }
            
            // Show default value from static CSV
            const defaultValue = staticTargetsData[city]?.[businessLine]?.[areaName];
            const defaultSpan = document.createElement('span');
            defaultSpan.className = 'dynamic-target-default';
            defaultSpan.textContent = defaultValue ? `(Default: ${defaultValue})` : '(No default)';
            
            // Create default button
            const defaultBtn = document.createElement('button');
            defaultBtn.className = 'btn-default';
            defaultBtn.textContent = 'Default';
            defaultBtn.type = 'button';
            defaultBtn.addEventListener('click', () => {
                if (defaultValue) {
                    input.value = defaultValue;
                    // Update the data
                    if (!dynamicTargetsData[city]) {
                        dynamicTargetsData[city] = {};
                    }
                    if (!dynamicTargetsData[city][businessLine]) {
                        dynamicTargetsData[city][businessLine] = {};
                    }
                    dynamicTargetsData[city][businessLine][areaName] = parseInt(defaultValue);
                } else {
                    input.value = '';
                    // Remove from dynamic targets
                    if (dynamicTargetsData[city]?.[businessLine]?.[areaName]) {
                        delete dynamicTargetsData[city][businessLine][areaName];
                    }
                }
            });
            
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (!dynamicTargetsData[city]) {
                    dynamicTargetsData[city] = {};
                }
                if (!dynamicTargetsData[city][businessLine]) {
                    dynamicTargetsData[city][businessLine] = {};
                }
                
                if (value === '' || value === '0') {
                    delete dynamicTargetsData[city][businessLine][areaName];
                } else {
                    dynamicTargetsData[city][businessLine][areaName] = parseInt(value);
                }
            });
            
            inputContainer.appendChild(input);
            inputContainer.appendChild(defaultBtn);
            inputContainer.appendChild(defaultSpan);
            
            itemDiv.appendChild(label);
            itemDiv.appendChild(inputContainer);
            areaDiv.appendChild(itemDiv);
            
            dynamicTargetsModalContent.appendChild(areaDiv);
        });
    }
    
    function resetDynamicTargetsToDefaults() {
        const selectedCity = cityEl.value;
        const selectedBusinessLines = getSelectedValuesFromCustomDropdown(customFilterConfigs.businessLine);
        const businessLine = selectedBusinessLines[0];
        
        if (dynamicTargetsData[selectedCity] && dynamicTargetsData[selectedCity][businessLine]) {
            delete dynamicTargetsData[selectedCity][businessLine];
        }
        
        populateModalContent(selectedCity, businessLine);
    }
    
    function applyGlobalTarget() {
        const globalValue = parseInt(globalTargetInput.value);
        if (!globalValue || globalValue <= 0) {
            alert('Please enter a valid target value greater than 0');
            return;
        }
        
        const selectedCity = cityEl.value;
        const selectedBusinessLines = getSelectedValuesFromCustomDropdown(customFilterConfigs.businessLine);
        const businessLine = selectedBusinessLines[0];
        
        // Get all input fields in the modal
        const inputs = dynamicTargetsModalContent.querySelectorAll('.dynamic-target-input-modal');
        let updateCount = 0;
        
        inputs.forEach(input => {
            input.value = globalValue;
            // Trigger the input event to update the data
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
            updateCount++;
        });
        
        globalTargetInput.value = '';
        alert(`✅ Applied target value ${globalValue} to ${updateCount} marketing areas`);
    }
    
    function saveDynamicTargets() {
        closeDynamicTargetsModal();
        // The data is already saved in dynamicTargetsData through the input event listeners
        console.log('Dynamic targets saved:', dynamicTargetsData);
        console.log('Dynamic targets JSON string:', JSON.stringify(dynamicTargetsData, null, 2));
        
        // Show a visual confirmation
        const selectedCity = cityEl.value;
        const selectedBusinessLines = getSelectedValuesFromCustomDropdown(customFilterConfigs.businessLine);
        const businessLine = selectedBusinessLines[0];
        const targetCount = Object.keys(dynamicTargetsData[selectedCity]?.[businessLine] || {}).length;
        
        if (targetCount > 0) {
            alert(`✅ ${targetCount} dynamic targets saved for ${businessLine} in ${selectedCity}. Click "Apply All Filters" to see changes.`);
        } else {
            alert(`ℹ️ All targets reset to defaults for ${businessLine} in ${selectedCity}.`);
        }
    }
    
    // Function to load static targets from the backend API (will be called during initialization)
    async function loadStaticTargets() {
        try {
            const response = await fetch(`${API_BASE_URL}/static-targets`);
            if (response.ok) {
                staticTargetsData = await response.json();
                console.log('Static targets loaded:', staticTargetsData);
            }
        } catch (error) {
            console.error('Failed to load static targets:', error);
            staticTargetsData = {};
        }
    }

    // Function to update slider background to show blue progress
    function updateSliderBackground(slider) {
        if (!slider) return;

        const value = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
        const background = `linear-gradient(to right, #2979FF 0%, #2979FF ${value}%, #CFD8DC ${value}%, #CFD8DC 100%)`;
        slider.style.background = background;
    }

    // Initialize all sliders with blue progress backgrounds
    function initializeSliderBackgrounds() {
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            updateSliderBackground(slider);

            // Update background on input
            slider.addEventListener('input', () => updateSliderBackground(slider));
            slider.addEventListener('change', () => updateSliderBackground(slider));
        });
    }
    
    // Initialize the application
    init();

    // Initialize radius mode UI and slider backgrounds after DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        updateRadiusModeUI();
        initializeSliderBackgrounds();
    });
});

/* ============================================
 * STEP 1 — XMap Event Bridge (safe adapters)
 * Paste ABOVE the add-on block
 * ============================================ */
(function XMapEventBridge() {
  if (window.XMapBridge) return; // idempotent

  // --- tiny utils
  const dispatch = (type, detail) =>
    document.dispatchEvent(new CustomEvent(type, { detail }));
  const tryCall = (names, ...args) => {
    for (const name of names) {
      const f = (typeof name === 'function') ? name : (window[name]);
      if (typeof f === 'function') {
        try { return f(...args); } catch (e) { console.warn(`XMapBridge: ${name} errored`, e); }
      }
    }
    return undefined;
  };

  // Public bridge API
  const Bridge = {
    // Latest event-derived state (read-only from outside)
    state: {
      playing: false,
      intervalMs: 1000,
      seekValue: null,      // number (slider value)
      stepDirection: 0,     // -1 | 0 | +1
      lastApplyAt: 0,
      lastExtractAt: 0
    },

    // Optional hooks you can implement elsewhere (Step 2 will flesh these out)
    hooks: {
      onApplyFilters: null,            // () => void
      onExtractVisibleVendors: null,   // () => void
      onTimelinePlay: null,            // (state) => void
      onTimelinePause: null,           // (state) => void
      onTimelineSeek: null,            // (seekValue, state) => void
      onTimelineStep: null,            // (direction, state) => void
      onTimelineSpeed: null            // (intervalMs, state) => void
    },

    // Helpers for your code to subscribe in one line
    on(type, fn) { document.addEventListener(type, fn); return () => document.removeEventListener(type, fn); },
    emit(type, detail) { dispatch(type, detail); },

    // Internal update (don't mutate Bridge.state directly)
    _set(patch) {
      Object.assign(Bridge.state, patch || {});
      return Bridge.state;
    }
  };

  window.XMapBridge = Bridge;

  // ====== WIRE: Apply / Extract ======
  document.addEventListener('xmap:applyFilters', () => {
    Bridge._set({ lastApplyAt: Date.now() });

    // Try your existing globals first
    const called = tryCall(['applyAllFilters', 'applyFilters', 'onApplyFilters']);
    if (called !== undefined) {
      dispatch('app:applyFilters', { source: 'bridge', via: 'global' });
      return;
    }
    // Then try a provided hook
    if (typeof Bridge.hooks.onApplyFilters === 'function') {
      try { Bridge.hooks.onApplyFilters(); } catch (e) { console.warn('onApplyFilters hook error', e); }
      dispatch('app:applyFilters', { source: 'bridge', via: 'hook' });
      return;
    }
    // Last resort: just notify downstream listeners
    dispatch('app:applyFilters', { source: 'bridge', via: 'event' });
  });

  document.addEventListener('xmap:extractVendors', () => {
    Bridge._set({ lastExtractAt: Date.now() });

    const called = tryCall(['extractVisibleVendors', 'downloadVisibleVendors', 'onExtractVisibleVendors']);
    if (called !== undefined) {
      dispatch('app:extractVendors', { source: 'bridge', via: 'global' });
      return;
    }
    if (typeof Bridge.hooks.onExtractVisibleVendors === 'function') {
      try { Bridge.hooks.onExtractVisibleVendors(); } catch (e) { console.warn('onExtractVisibleVendors hook error', e); }
      dispatch('app:extractVendors', { source: 'bridge', via: 'hook' });
      return;
    }
    dispatch('app:extractVendors', { source: 'bridge', via: 'event' });
  });

  // ====== WIRE: Timeline controls ======
  document.addEventListener('xmap:timeline:play', () => {
    Bridge._set({ playing: true });
    // Try your existing timeline controller (if any)
    const called = tryCall(['timelinePlay', 'onTimelinePlay']);
    if (called === undefined && typeof Bridge.hooks.onTimelinePlay === 'function') {
      try { Bridge.hooks.onTimelinePlay(Bridge.state); } catch (e) { console.warn('onTimelinePlay hook error', e); }
    }
    dispatch('app:timeline:play', { source: 'bridge', state: { ...Bridge.state } });
  });

  document.addEventListener('xmap:timeline:pause', () => {
    Bridge._set({ playing: false });
    const called = tryCall(['timelinePause', 'onTimelinePause']);
    if (called === undefined && typeof Bridge.hooks.onTimelinePause === 'function') {
      try { Bridge.hooks.onTimelinePause(Bridge.state); } catch (e) { console.warn('onTimelinePause hook error', e); }
    }
    dispatch('app:timeline:pause', { source: 'bridge', state: { ...Bridge.state } });
  });

  document.addEventListener('xmap:timeline:speed', (e) => {
    const ms = (e.detail && e.detail.intervalMs) || 1000;
    Bridge._set({ intervalMs: ms });
    const called = tryCall(['timelineSetSpeed', 'onTimelineSpeed'], ms);
    if (called === undefined && typeof Bridge.hooks.onTimelineSpeed === 'function') {
      try { Bridge.hooks.onTimelineSpeed(ms, Bridge.state); } catch (err) { console.warn('onTimelineSpeed hook error', err); }
    }
    dispatch('app:timeline:speed', { source: 'bridge', intervalMs: ms, state: { ...Bridge.state } });
  });

  document.addEventListener('xmap:timeline:seek', (e) => {
    const value = (e.detail && typeof e.detail.value === 'number') ? e.detail.value : null;
    Bridge._set({ seekValue: value });
    const called = tryCall(['timelineSeek', 'onTimelineSeek'], value);
    if (called === undefined && typeof Bridge.hooks.onTimelineSeek === 'function') {
      try { Bridge.hooks.onTimelineSeek(value, Bridge.state); } catch (err) { console.warn('onTimelineSeek hook error', err); }
    }
    dispatch('app:timeline:seek', { source: 'bridge', value, state: { ...Bridge.state } });
  });

  document.addEventListener('xmap:timeline:step', (e) => {
    const dir = (e.detail && (e.detail.direction === -1 || e.detail.direction === +1)) ? e.detail.direction : 0;
    Bridge._set({ stepDirection: dir });
    const called = tryCall(['timelineStep', 'onTimelineStep'], dir);
    if (called === undefined && typeof Bridge.hooks.onTimelineStep === 'function') {
      try { Bridge.hooks.onTimelineStep(dir, Bridge.state); } catch (err) { console.warn('onTimelineStep hook error', err); }
    }
    dispatch('app:timeline:step', { source: 'bridge', direction: dir, state: { ...Bridge.state } });
  });

  // Optional: expose a small console helper for quick testing
  // window.XMapBridge.emit('xmap:applyFilters'); etc.
})();

/* ============================================
 * STEP 2 — Bridge Hooks & Timeline Adapter
 * Paste directly BELOW STEP 1 block
 * ============================================ */
(function XMapBridgeHooks() {
  if (!window.XMapBridge) { console.warn('Step 1 bridge missing'); return; }
  const Bridge = window.XMapBridge;

  // --- Helpers (safe lookup)
  const has = (name) => typeof window[name] === 'function';
  const call = (name, ...args) => {
    try { return window[name](...args); } catch (e) { console.warn(`${name} error`, e); }
  };

  // ------------------------------------------
  // TIMELINE ADAPTER (fill in if you have your own timeline model)
  // ------------------------------------------
  // Provide either:
  // 1) global functions like setTimelineHour(index), getTimelineHours(), playTimeline(), pauseTimeline()
  // or
  // 2) fill these adapter callbacks in Step 2.1 below.
  const TimelineAdapter = {
    // REQUIRED: return total number of playable ticks/hours (int) OR null if unknown
    getTotal: () => {
      if (has('getTimelineHours')) {
        const arr = call('getTimelineHours'); // expect array of hour objects or datetimes
        return Array.isArray(arr) ? arr.length : null;
      }
      if (typeof window.TIMELINE_TOTAL === 'number') return window.TIMELINE_TOTAL;
      return null;
    },

    // OPTIONAL: get current index (0-based). If not available, return null.
    getCurrentIndex: () => {
      if (has('getCurrentTimelineIndex')) return call('getCurrentTimelineIndex');
      if (typeof window.TIMELINE_INDEX === 'number') return window.TIMELINE_INDEX;
      return null;
    },

    // REQUIRED: seek to index (0-based). App code should re-render layers.
    seekToIndex: (idx) => {
      if (has('setTimelineHour')) return call('setTimelineHour', idx);
      if (has('timelineSeekIndex')) return call('timelineSeekIndex', idx);
      // fallback: store globally for your render loop to pick up
      window.TIMELINE_INDEX = idx;
    },

    // OPTIONAL: human-readable label for UI log or devtools
    getLabelForIndex: (idx) => {
      if (has('getTimelineHours')) {
        const arr = call('getTimelineHours');
        if (Array.isArray(arr) && arr[idx] != null) {
          const v = arr[idx];
          return (v.label || v.time || v.datetime || String(v));
        }
      }
      return `Index ${idx}`;
    },

    // OPTIONAL: step +/- 1
    step: (direction) => {
      const cur = TimelineAdapter.getCurrentIndex();
      const max = TimelineAdapter.getTotal();
      if (cur == null || max == null) return;
      let next = cur + (direction || 0);
      if (next < 0) next = 0;
      if (next >= max) next = max - 1;
      TimelineAdapter.seekToIndex(next);
    },

    // OPTIONAL: play/pause/speed (ms interval)
    play: () => {
      if (has('playTimeline')) return call('playTimeline');
      window.TIMELINE_PLAYING = true;
    },
    pause: () => {
      if (has('pauseTimeline')) return call('pauseTimeline');
      window.TIMELINE_PLAYING = false;
    },
    setSpeed: (ms) => {
      if (has('setTimelineSpeed')) return call('setTimelineSpeed', ms);
      window.TIMELINE_INTERVAL_MS = ms;
    }
  };

  // Expose for later tweaks (optional)
  window.TimelineAdapter = TimelineAdapter;

  // ------------------------------------------
  // STEP 2.1 — Wire Bridge.hooks to your app
  // (Update only if you want explicit mapping)
  // ------------------------------------------
  Bridge.hooks.onApplyFilters = () => {
    // Prefer your canonical entrypoint if you have it
    if (has('applyAllFilters')) return call('applyAllFilters');
    if (has('applyFilters')) return call('applyFilters');
    // Else dispatch your own global event for legacy listeners
    document.dispatchEvent(new CustomEvent('legacy:applyFilters'));
  };

  Bridge.hooks.onExtractVisibleVendors = () => {
    if (has('extractVisibleVendors')) return call('extractVisibleVendors');
    if (has('downloadVisibleVendors')) return call('downloadVisibleVendors');
    document.dispatchEvent(new CustomEvent('legacy:extractVisibleVendors'));
  };

  Bridge.hooks.onTimelinePlay = () => {
    TimelineAdapter.play();
  };

  Bridge.hooks.onTimelinePause = () => {
    TimelineAdapter.pause();
  };

  Bridge.hooks.onTimelineSpeed = (ms) => {
    TimelineAdapter.setSpeed(ms);
  };

  Bridge.hooks.onTimelineSeek = (value) => {
    // value arrives from 0..100 (slider). Map to index.
    const total = TimelineAdapter.getTotal();
    if (typeof total === 'number' && total > 1) {
      // clamp and map
      const pct = Math.max(0, Math.min(100, (value ?? 0)));
      const idx = Math.round((pct / 100) * (total - 1));
      TimelineAdapter.seekToIndex(idx);

      // Optional: Broadcast a normalized "changed" event with label
      const label = TimelineAdapter.getLabelForIndex(idx);
      document.dispatchEvent(new CustomEvent('app:timeline:changed', {
        detail: { index: idx, label, total }
      }));
    } else {
      console.info('Timeline total unknown; store raw percent for later.');
      window.TIMELINE_SEEK_PERCENT = value;
    }
  };

  Bridge.hooks.onTimelineStep = (dir) => {
    TimelineAdapter.step(dir);
    const idx = TimelineAdapter.getCurrentIndex();
    const total = TimelineAdapter.getTotal();
    const label = (idx != null) ? TimelineAdapter.getLabelForIndex(idx) : null;
    document.dispatchEvent(new CustomEvent('app:timeline:changed', {
      detail: { index: idx, label, total }
    }));
  };

  // ------------------------------------------
  // STEP 2.2 — Optional: normalize app events for UI sync/logging
  // ------------------------------------------
  // For example, when your data layer finishes re-rendering vendors for a new hour,
  // emit this so other modules can sync:
  // document.dispatchEvent(new CustomEvent('data:timelineRendered', { detail: { index, count, label } }));

  // Here we just log if someone fires that event:
  document.addEventListener('data:timelineRendered', (e) => {
    const d = e.detail || {};
    console.debug('[data:timelineRendered]', d.index, d.label, 'vendors:', d.count);
  });

})();

/* =========================
 * XMap Add-on (safe augment)
 * Drop-in block – place at END of script.js
 * ========================= */
(function XMapAddon() {
  if (window.__xmapAddonInitialized__) return;
  window.__xmapAddonInitialized__ = true;

  // ---- tiny utils ----
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, evt, fn, opts) => el && el.addEventListener(evt, fn, opts || false);
  const once = (el, evt, fn) => on(el, evt, fn, { once: true });
  const raf = (fn) => requestAnimationFrame(fn);
  const debounce = (fn, ms = 200) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };
  const nowms = () => (performance && performance.now ? performance.now() : Date.now());
  const tryCall = (names, ...args) => {
    for (const name of names) {
      const f = (typeof name === 'function') ? name : (window[name]);
      if (typeof f === 'function') {
        try { return f(...args); } catch (e) { console.warn(`XMapAddon: ${name} errored`, e); }
      }
    }
    return undefined;
  };
  const dispatch = (type, detail) => document.dispatchEvent(new CustomEvent(type, { detail }));

  // ---- persistent storage ----
  const STORAGE = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }
  };

  // ========================================
  // 1) Accordions (for <details class="accordion">…)
  // ========================================
  function initAccordions() {
    const accels = $$('.accordion');
    if (!accels.length) return; // nothing to do

    const mapKey = 'xmap:accordion:openMap';
    const openMap = STORAGE.get(mapKey, {});

    accels.forEach((d, idx) => {
      if (!(d instanceof HTMLDetailsElement)) return;

      // Derive a stable key for this accordion
      const explicitKey = d.getAttribute('data-key') || d.id;
      const label =
        d.querySelector('summary')?.textContent?.trim() ||
        `accordion-${idx}`;
      const key = explicitKey || label;

      // Restore open state
      if (key in openMap) d.open = !!openMap[key];

      // Persist on toggle
      on(d, 'toggle', () => {
        openMap[key] = d.open;
        STORAGE.set(mapKey, openMap);
      });
    });
  }

  // ========================================
  // 2) Custom checkbox dropdowns (single-open, outside click, Escape)
  //    Structure: .custom-checkbox-dropdown > .dropdown-button + .dropdown-panel
  //    NOTE: Skip dropdowns that are handled by the existing customFilterConfigs system
  // ========================================
  function initCheckboxDropdowns() {
    const containers = $$('.custom-checkbox-dropdown');
    if (!containers.length) return;

    // IDs of dropdowns handled by the original system - skip these
    const originalSystemDropdowns = [
      'vendor-grade-filter-button',
      'vendor-status-filter-button',
      'vendor-status-text-filter-button',
      'area-sub-type-filter-button',
      'business-line-filter-button',
      'vendor-area-sub-type-filter-button'
    ];

    // close all helper
    const closeAll = (except = null) => {
      containers.forEach((c) => {
        const btn = $('.dropdown-button', c);
        const panel = $('.dropdown-panel', c);
        if (!panel) return;
        if (except && c === except) return;
        // Skip if this is handled by original system
        if (btn && originalSystemDropdowns.includes(btn.id)) return;
        panel.classList.remove('open');
        btn && btn.classList.remove('open');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    };

    // toggle handlers
    containers.forEach((c) => {
      const btn = $('.dropdown-button', c);
      const panel = $('.dropdown-panel', c);
      if (!btn || !panel) return;

      // Skip if this dropdown is handled by the original system
      if (originalSystemDropdowns.includes(btn.id)) {
        console.debug('[XMap] Skipping dropdown handled by original system:', btn.id);
        return;
      }

      btn.setAttribute('aria-haspopup', 'listbox');
      btn.setAttribute('aria-expanded', 'false');

      on(btn, 'click', (e) => {
        e.stopPropagation();
        const willOpen = !panel.classList.contains('open');
        closeAll(); // only one open at a time
        if (willOpen) {
          panel.classList.add('open');
          btn.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          // focus first checkbox if any
          const firstInput = $('input[type="checkbox"]', panel);
          if (firstInput) firstInput.focus({ preventScroll: true });
        } else {
          panel.classList.remove('open');
          btn.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    });

    // outside click
    on(document, 'click', (e) => {
      const target = e.target;
      const within = target && (target.closest && target.closest('.custom-checkbox-dropdown'));
      if (!within) closeAll();
    });

    // Escape to close
    on(document, 'keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });
  }

  // ========================================
  // 3) Footer buttons: move to footer (bottom-right), rebind safely
  //    IDs: #apply-filters-btn, #extract-vendors-btn
  //    Fallbacks: emits CustomEvents if no known global handler found
  // ========================================
  function initFooterButtons() {
    const applyBtn = $('#apply-filters-btn');
    const extractBtn = $('#extract-vendors-btn');
    const footer = $('.footer');
    const footerContent = $('.footer .footer-content');

    if (!footer || !footerContent || (!applyBtn && !extractBtn)) return;

    // Ensure footer layout can host actions at the right side
    footerContent.style.display = 'flex';
    footerContent.style.alignItems = 'center';
    footerContent.style.justifyContent = 'space-between';
    footerContent.style.gap = '12px';

    // Left: keep existing text (first child). Right: actions container.
    let actions = $('#xmap-footer-actions', footerContent);
    if (!actions) {
      actions = document.createElement('div');
      actions.id = 'xmap-footer-actions';
      actions.style.display = 'flex';
      actions.style.gap = '10px';
      actions.style.marginLeft = 'auto';
      footerContent.appendChild(actions);
    }

    // Move buttons into footer actions, remove fixed classes if present
    const moveBtn = (btn) => {
      if (!btn) return;
      btn.classList.remove('btn-apply-fixed', 'btn-extract-fixed');
      actions.appendChild(btn);
    };
    moveBtn(extractBtn);
    moveBtn(applyBtn);

    // Known potential handler names you may already have in your codebase
    const APPLY_HANDLERS = [
      'applyAllFilters', 'applyFilters', 'onApplyFilters',
      (e) => dispatch('xmap:applyFilters', { source: 'addon', event: e })
    ];
    const EXTRACT_HANDLERS = [
      'extractVisibleVendors', 'onExtractVisibleVendors', 'downloadVisibleVendors',
      (e) => dispatch('xmap:extractVendors', { source: 'addon', event: e })
    ];

    // guard against double clicks
    const coolDown = (btn, ms = 800) => {
      if (!btn) return false;
      const t = nowms();
      const last = parseFloat(btn.getAttribute('data-last-click') || '0');
      if (t - last < ms) return true;
      btn.setAttribute('data-last-click', String(t));
      return false;
    };

    if (applyBtn) {
      applyBtn.title = applyBtn.title || 'Apply all filters';
      on(applyBtn, 'click', (e) => {
        if (coolDown(applyBtn)) return;
        tryCall(APPLY_HANDLERS, e);
      });
    }

    if (extractBtn) {
      extractBtn.title = extractBtn.title || 'Extract visible vendors';
      on(extractBtn, 'click', (e) => {
        if (coolDown(extractBtn)) return;
        tryCall(EXTRACT_HANDLERS, e);
      });
    }
  }

  // ========================================
  // 4) Timeline controls: collapse, play/pause, step, speed, slider sync
  //    Emits CustomEvents your existing logic can listen to
  // ========================================
  function initTimelineControls() {
    const panel = $('#timeline-controls');
    if (!panel) return;

    const headerBtn = $('#timeline-collapse-btn');
    const collapseIcon = headerBtn ? $('.collapse-icon', headerBtn) : null;
    const playBtn = $('#play-pause');
    const fwdBtn = $('#step-forward');
    const backBtn = $('#step-backward');
    const speedSel = $('#playback-speed-select');
    const slider = $('#timeline-slider');

    // Persist collapsed state
    const collapsedKey = 'xmap:timeline:collapsed';
    const wasCollapsed = !!STORAGE.get(collapsedKey, false);
    if (wasCollapsed) panel.classList.add('collapsed');

    const setCollapsed = (val) => {
      panel.classList.toggle('collapsed', !!val);
      STORAGE.set(collapsedKey, !!val);
      // rotate icon by CSS class; icon text stays ▲
      if (collapseIcon) {
        collapseIcon.style.transition = 'transform 0.3s ease';
        collapseIcon.style.transform = val ? 'rotate(180deg)' : 'rotate(0deg)';
      }
    };

    if (headerBtn) {
      on(headerBtn, 'click', () => setCollapsed(!panel.classList.contains('collapsed')));
    }

    // Play/Pause handling
    const updatePlayBtn = (isPlaying) => {
      if (!playBtn) return;
      playBtn.classList.toggle('playing', isPlaying);
      playBtn.textContent = isPlaying ? '⏸' : '▶️';
      playBtn.title = isPlaying ? 'Pause Timeline' : 'Play Timeline';
    };

    let playing = false;
    if (playBtn) {
      on(playBtn, 'click', () => {
        playing = !playing;
        updatePlayBtn(playing);
        dispatch(playing ? 'xmap:timeline:play' : 'xmap:timeline:pause', { source: 'addon' });
      });
    }

    // Step buttons
    if (fwdBtn) {
      on(fwdBtn, 'click', () => {
        dispatch('xmap:timeline:step', { source: 'addon', direction: +1 });
      });
    }
    if (backBtn) {
      on(backBtn, 'click', () => {
        dispatch('xmap:timeline:step', { source: 'addon', direction: -1 });
      });
    }

    // Speed select -> dispatch ms per tick (value is already ms in your markup)
    if (speedSel) {
      on(speedSel, 'change', () => {
        const ms = parseInt(speedSel.value, 10) || 1000;
        dispatch('xmap:timeline:speed', { source: 'addon', intervalMs: ms });
      });
      // emit initial
      dispatch('xmap:timeline:speed', { source: 'addon', intervalMs: parseInt(speedSel.value || '1000', 10) });
    }

    // Slider input -> dispatch seek with integer value [min..max]
    if (slider) {
      const handleInput = () => {
        const val = parseInt(slider.value, 10);
        dispatch('xmap:timeline:seek', { source: 'addon', value: val });
      };
      on(slider, 'input', debounce(handleInput, 30));  // smooth, low-latency
      on(slider, 'change', handleInput);
    }

    // If someone else toggles play state via event, reflect it
    on(document, 'xmap:timeline:setPlaying', (e) => {
      const isPlaying = !!(e.detail && e.detail.playing);
      playing = isPlaying;
      updatePlayBtn(playing);
    });
  }

  // ========================================
  // Boot (after DOM is there). If this runs late, still safe.
  // ========================================
  const start = () => {
    try {
      initAccordions();
      initCheckboxDropdowns();
      initFooterButtons();
      initTimelineControls();
    } catch (err) {
      console.error('XMap Add-on init failed:', err);
    }
  };

  if (document.readyState === 'loading') {
    once(document, 'DOMContentLoaded', start);
  } else {
    // DOM already ready
    raf(start);
  }
})();

/* ============================================
 * STEP 3 — Finalize integration & safety net
 * Paste at VERY BOTTOM of script.js
 * ============================================ */
(function XMapFinalize() {
  if (!window.XMapBridge) { console.warn('Bridge missing; Step 1 not installed.'); return; }
  const Bridge = window.XMapBridge;

  // If your app already has a timeline loop, you can remove this autoplayer.
  // This is a safety net so Play/Pause/Speed just work out of the box.
  let playTimer = null;

  const startAutoplay = () => {
    stopAutoplay(); // clear existing
    const ms = Bridge.state.intervalMs || 1000;
    playTimer = setInterval(() => {
      // Only advance if playing
      if (!Bridge.state.playing) return;
      document.dispatchEvent(new CustomEvent('xmap:timeline:step', { detail: { direction: +1 } }));
    }, ms);
  };

  const stopAutoplay = () => {
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
  };

  // React to normalized app events
  document.addEventListener('app:timeline:play', () => {
    startAutoplay();
    console.debug('[XMap] timeline playing at', Bridge.state.intervalMs, 'ms');
  });

  document.addEventListener('app:timeline:pause', () => {
    stopAutoplay();
    console.debug('[XMap] timeline paused');
  });

  document.addEventListener('app:timeline:speed', (e) => {
    console.debug('[XMap] speed ->', e.detail?.intervalMs, 'ms');
    // restart timer with new speed if currently playing
    if (Bridge.state.playing) startAutoplay();
  });

  // Optional: whenever timeline index changes (your data layer can emit this after render)
  document.addEventListener('app:timeline:changed', (e) => {
    const d = e.detail || {};
    console.debug('[XMap] timeline changed ->', d.index, d.label);
  });

  // Sanity check after DOM is ready
  const ready = () => {
    // UI elements from your Add-on (index.html) — safe to check presence only
    const ids = [
      'apply-filters-btn', 'extract-vendors-btn',
      'play-pause', 'step-forward', 'step-backward',
      'timeline-slider', 'playback-speed-select'
    ];
    const missing = ids.filter(id => !document.getElementById(id));
    if (missing.length) {
      console.info('[XMap] Optional UI elements missing (ok if you renamed):', missing);
    } else {
      console.debug('[XMap] UI elements detected');
    }

    // Kick off a safe initial speed sync (keeps timer consistent if user changes speed before play)
    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'playback-speed-select') {
        const ms = parseInt(e.target.value, 10) || 1000;
        document.dispatchEvent(new CustomEvent('xmap:timeline:speed', { detail: { intervalMs: ms } }));
      }
    });

    // Optionally, if your app sets initial timeline arrays later, you can emit a one-off refresh:
    // document.dispatchEvent(new CustomEvent('app:timeline:changed', { detail: { index: TimelineAdapter.getCurrentIndex(), label: TimelineAdapter.getLabelForIndex(TimelineAdapter.getCurrentIndex()) }}));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }

  // Clean up on hot reload (if any)
  window.addEventListener('beforeunload', () => {
    stopAutoplay();
  });
})();

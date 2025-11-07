# utils/coverage.py

from typing import List, Dict, Any, Optional
import math

def enhance_coverage_with_targets(
    grid_points: List[Any],
    coverage_results: List[Dict[str, Any]],
    point_area_info: List[Any],
    city: str,
    business_line: Optional[str],
    targets_by_area: Optional[Dict[str, int]] = None,
    city_name_to_id_map: Optional[Dict[str, Any]] = None,
    *,
    hour_start: Optional[str] = None,
    hour_idx: Optional[int] = None,
    vendors: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """
    Enrich grid_points with:
      - coverage.total_vendors / by_business_line / by_grade
      - target/actual/performance per business_line (if targets provided)
    Both `targets_by_area` and `vendors` may be None; function will degrade gracefully.
    Returns a *new* list; original objects are not mutated.

    This function is compatible with both the current call signature from historical endpoint
    and the enhanced signature from CLAUDE.md specification.
    """

    # Defensive defaults
    targets_by_area = targets_by_area or {}
    vendors = vendors or []

    out = []
    for i, coverage in enumerate(coverage_results):
        if coverage.get('total_vendors', 0) > 0:
            area_id, area_name = point_area_info[i] if i < len(point_area_info) else (None, None)

            # Base point data from coverage results
            point_data = {
                'lat': coverage['lat'],
                'lng': coverage['lng'],
                'marketing_area': area_name,
                'target_business_line': business_line,
                'coverage': {
                    'total_vendors': coverage.get('total_vendors', 0),
                    'by_business_line': coverage.get('by_business_line', {}),
                    'by_grade': coverage.get('by_grade', {})
                }
            }

            # Add target-based metrics if available
            target_val = None
            if area_name and area_name in targets_by_area:
                target_val = targets_by_area[area_name]

            actual_val = None
            if business_line:
                actual_val = coverage.get('by_business_line', {}).get(business_line, 0)
            else:
                # If no business_line filter, actual = total vendors
                actual_val = coverage.get('total_vendors', 0)

            perf = None
            if target_val not in (None, 0) and actual_val is not None:
                perf = (actual_val / target_val)

            point_data.update({
                'target_value': (int(target_val) if target_val is not None else None),
                'actual_value': (int(actual_val) if actual_val is not None else None),
                'performance_ratio': (float(perf) if perf is not None else None)
            })

            out.append(point_data)

    return out


def enhance_coverage_with_targets_from_raw_grid(
    grid_points: List[Dict[str, Any]],
    *,
    city: str,
    business_line: Optional[str],
    hour_start: Optional[str] = None,
    hour_idx: Optional[int] = None,
    targets_by_area: Optional[Dict[str, int]] = None,
    vendors: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """
    Alternative interface for enhancing coverage when starting from raw grid points
    (as specified in CLAUDE.md). This computes coverage from scratch using vendors.
    """

    # Defensive defaults
    targets_by_area = targets_by_area or {}
    vendors = vendors or []

    # Haversine distance calculation for coverage
    def haversine_km(a_lat, a_lng, b_lat, b_lng):
        R = 6371.0
        dlat = math.radians(b_lat - a_lat)
        dlng = math.radians(b_lng - a_lng)
        aa = math.sin(dlat/2)**2 + math.cos(math.radians(a_lat)) * math.cos(math.radians(b_lat)) * math.sin(dlng/2)**2
        c = 2 * math.atan2(math.sqrt(aa), math.sqrt(1-aa))
        return R * c

    out = []
    for p in grid_points or []:
        lat = p.get("lat") or p.get("latitude")
        lng = p.get("lng") or p.get("longitude")
        if lat is None or lng is None:
            # Skip invalid point but never crash
            continue

        # Base safe structure
        coverage = {
            "total_vendors": 0,
            "by_business_line": {},
            "by_grade": {}
        }

        # Compute coverage from vendors if provided (respect vendor radius if present)
        # NOTE: This is a naive in-memory example. Prefer DB-side spatial joins when possible.
        for v in vendors:
            vlat, vlng = v.get("lat"), v.get("lng")
            if vlat is None or vlng is None:
                continue
            # vendor radius in km if available; default ~3km
            vrad = v.get("radius_km") or 3
            if haversine_km(lat, lng, vlat, vlng) <= vrad:
                coverage["total_vendors"] += 1
                bl = v.get("business_line")
                if bl:
                    coverage["by_business_line"][bl] = coverage["by_business_line"].get(bl, 0) + 1
                gr = v.get("grade")
                if gr:
                    coverage["by_grade"][gr] = coverage["by_grade"].get(gr, 0) + 1

        # Target-based metrics (marketing-area-based or cell-based)
        area_name = p.get("marketing_area") or p.get("area_name")
        target_val = None
        if area_name in targets_by_area:
            target_val = targets_by_area[area_name]

        actual_val = None
        if business_line:
            actual_val = coverage["by_business_line"].get(business_line, 0)
        else:
            # If no business_line filter, actual = total vendors
            actual_val = coverage["total_vendors"]

        perf = None
        if target_val not in (None, 0) and actual_val is not None:
            perf = (actual_val / target_val)

        out.append({
            "lat": float(lat),
            "lng": float(lng),
            "marketing_area": area_name,
            "target_business_line": business_line,
            "target_value": (int(target_val) if target_val is not None else None),
            "actual_value": (int(actual_val) if actual_val is not None else None),
            "performance_ratio": (float(perf) if perf is not None else None),
            "coverage": coverage
        })

    return out
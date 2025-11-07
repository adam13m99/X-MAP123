# utils/targets.py

from typing import Dict, Optional
import os
import pandas as pd
import json
from functools import lru_cache

@lru_cache(maxsize=32)
def get_targets_for_city_business_line(city: str, business_line: Optional[str]) -> Dict[str, int]:
    """
    Returns per-area targets (e.g., { "District 1": 12, ... }) for a given city+BL.
    Loads from CSV files in src/targets/ directory.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    targets_dir = os.path.join(base_dir, 'src', 'targets')

    if not os.path.exists(targets_dir):
        print(f"Warning: Targets directory not found: {targets_dir}")
        return {}

    # Look for city-specific CSV files
    target_file = None
    for filename in os.listdir(targets_dir):
        if city.lower() in filename.lower() and filename.endswith('.csv'):
            target_file = os.path.join(targets_dir, filename)
            break

    if not target_file:
        print(f"Warning: No target file found for city: {city}")
        return {}

    try:
        # Read the CSV file with proper UTF-8 encoding
        df = pd.read_csv(target_file, encoding='utf-8-sig')
        print(f"TARGETS: Loading from {os.path.basename(target_file)} for {city}/{business_line} - {df.shape[0]} areas")

        # Clean up column names (remove BOM and whitespace)
        df.columns = df.columns.str.strip().str.replace('\ufeff', '')

        # The first column should be marketing_area
        area_col = df.columns[0]  # Should be 'marketing_area'

        if business_line and business_line in df.columns:
            # Extract targets for the specific business line
            targets = {}
            for _, row in df.iterrows():
                area_name = str(row[area_col]).strip()
                target_value = row[business_line]

                # Skip empty areas and ensure we have a valid target
                if area_name and area_name != 'nan' and pd.notna(target_value):
                    try:
                        targets[area_name] = int(target_value)
                    except (ValueError, TypeError):
                        continue

            print(f"TARGETS: Loaded {len(targets)} targets for '{business_line}' in {city}")
            return targets
        else:
            print(f"Warning: Business line '{business_line}' not found in CSV columns: {list(df.columns)}")
            return {}

    except Exception as e:
        print(f"Error loading targets from {target_file}: {e}")
        import traceback
        traceback.print_exc()
        return {}


def load_targets_from_csv(filepath: str, business_line: Optional[str] = None) -> Dict[str, int]:
    """Helper function to load targets from a CSV file"""
    try:
        df = pd.read_csv(filepath)
        if business_line and 'business_line' in df.columns:
            df = df[df['business_line'] == business_line]

        # Look for common column name patterns
        area_col = None
        target_col = None

        for col in df.columns:
            col_lower = col.lower()
            if 'area' in col_lower or 'name' in col_lower:
                area_col = col
            elif 'target' in col_lower or 'value' in col_lower:
                target_col = col

        if area_col and target_col:
            return dict(zip(df[area_col], df[target_col]))

    except Exception as e:
        print(f"Error loading targets from CSV {filepath}: {e}")

    return {}


def load_targets_from_json(filepath: str, city: str, business_line: Optional[str] = None) -> Dict[str, int]:
    """Helper function to load targets from a JSON file"""
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)

        if city in data:
            city_data = data[city]
            if business_line and business_line in city_data:
                return city_data[business_line]
            elif isinstance(city_data, dict) and not business_line:
                # Return aggregated targets across all business lines
                aggregated = {}
                for bl_data in city_data.values():
                    if isinstance(bl_data, dict):
                        for area, target in bl_data.items():
                            aggregated[area] = aggregated.get(area, 0) + target
                return aggregated

    except Exception as e:
        print(f"Error loading targets from JSON {filepath}: {e}")

    return {}
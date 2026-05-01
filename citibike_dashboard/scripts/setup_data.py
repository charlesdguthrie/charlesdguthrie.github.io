"""Download, clean, and pre-aggregate CitiBike trip data."""
import argparse
import io
import json
import math
import zipfile
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import requests

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
GBFS_DIR = DATA_DIR / "gbfs"

S3_BASE = "https://s3.amazonaws.com/tripdata"
GBFS_BASE = "https://gbfs.citibikenyc.com/gbfs/en"


def get_file_list(source: str, months: int) -> list[tuple[str, str]]:
    now = datetime.now()
    files = []
    for i in range(1, months + 1):
        year = now.year
        month = now.month - i
        while month <= 0:
            month += 12
            year -= 1
        ym = f"{year}{month:02d}"
        if source == "jc":
            fname = f"JC-{ym}-citibike-tripdata.csv.zip"
        else:
            fname = f"{ym}-citibike-tripdata.csv.zip"
        files.append((fname, f"{S3_BASE}/{fname}"))
    return files


def download_files(files: list[tuple[str, str]], force: bool = False):
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for fname, url in files:
        dest = RAW_DIR / fname
        if dest.exists() and not force:
            print(f"  Skipping {fname} (exists)")
            continue
        print(f"  Downloading {fname}...")
        resp = requests.get(url, stream=True, timeout=120)
        if resp.status_code != 200:
            print(f"  WARNING: {fname} returned {resp.status_code}, skipping")
            continue
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"  Saved {fname} ({dest.stat().st_size / 1e6:.1f} MB)")


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 2 * r * np.arcsin(np.sqrt(a))


def load_and_clean(files: list[tuple[str, str]]) -> pd.DataFrame:
    dfs = []
    for fname, _ in files:
        path = RAW_DIR / fname
        if not path.exists():
            continue
        print(f"  Reading {fname}...")
        with zipfile.ZipFile(path) as zf:
            for csv_name in zf.namelist():
                if not csv_name.endswith(".csv"):
                    continue
                with zf.open(csv_name) as cf:
                    df = pd.read_csv(cf, low_memory=False, encoding="utf-8", encoding_errors="replace")
                    dfs.append(df)

    if not dfs:
        raise RuntimeError("No CSV data found. Check downloads.")

    raw = pd.concat(dfs, ignore_index=True)
    print(f"  Total raw rows: {len(raw):,}")

    col_map = {
        "tripduration": "trip_duration_sec",
        "starttime": "started_at",
        "stoptime": "ended_at",
        "start station name": "start_station_name",
        "start station id": "start_station_id",
        "start station latitude": "start_lat",
        "start station longitude": "start_lng",
        "end station name": "end_station_name",
        "end station id": "end_station_id",
        "end station latitude": "end_lat",
        "end station longitude": "end_lng",
        "usertype": "member_casual",
        "bikeid": "ride_id",
    }
    raw.rename(columns={k: v for k, v in col_map.items() if k in raw.columns}, inplace=True)

    if "rideable_type" not in raw.columns:
        raw["rideable_type"] = "classic_bike"

    if "member_casual" in raw.columns:
        raw["member_casual"] = raw["member_casual"].replace(
            {"Subscriber": "member", "Customer": "casual"}
        )

    for col in ["started_at", "ended_at"]:
        if col in raw.columns:
            raw[col] = pd.to_datetime(raw[col], errors="coerce")

    if "trip_duration_sec" not in raw.columns and "started_at" in raw.columns and "ended_at" in raw.columns:
        raw["trip_duration_sec"] = (raw["ended_at"] - raw["started_at"]).dt.total_seconds()

    raw["trip_duration_min"] = raw["trip_duration_sec"] / 60.0

    for col in ["start_lat", "start_lng", "end_lat", "end_lng"]:
        if col in raw.columns:
            raw[col] = pd.to_numeric(raw[col], errors="coerce")

    has_coords = all(c in raw.columns for c in ["start_lat", "start_lng", "end_lat", "end_lng"])
    if has_coords:
        mask = raw[["start_lat", "start_lng", "end_lat", "end_lng"]].notna().all(axis=1)
        raw.loc[mask, "distance_km"] = haversine_km(
            raw.loc[mask, "start_lat"], raw.loc[mask, "start_lng"],
            raw.loc[mask, "end_lat"], raw.loc[mask, "end_lng"],
        )
    if "distance_km" not in raw.columns:
        raw["distance_km"] = np.nan

    raw["date"] = raw["started_at"].dt.date
    raw["hour"] = raw["started_at"].dt.hour
    raw["day_of_week"] = raw["started_at"].dt.dayofweek
    raw["day_name"] = raw["started_at"].dt.day_name()
    raw["month"] = raw["started_at"].dt.to_period("M").astype(str)
    raw["is_weekend"] = raw["day_of_week"].isin([5, 6])

    raw = raw.dropna(subset=["started_at", "start_station_name", "end_station_name"])
    raw = raw[raw["trip_duration_sec"] > 60]
    raw = raw[raw["trip_duration_sec"] < 86400]

    print(f"  Cleaned rows: {len(raw):,}")
    return raw


def aggregate_and_save(df: pd.DataFrame):
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    print("  Saving trips.parquet...")
    keep_cols = [
        "started_at", "ended_at", "start_station_name", "start_station_id",
        "start_lat", "start_lng", "end_station_name", "end_station_id",
        "end_lat", "end_lng", "rideable_type", "member_casual",
        "trip_duration_min", "distance_km", "date", "hour",
        "day_of_week", "day_name", "month", "is_weekend",
    ]
    existing = [c for c in keep_cols if c in df.columns]
    df[existing].to_parquet(PROCESSED_DIR / "trips.parquet", index=False)

    print("  Aggregating hourly_demand.parquet...")
    hourly = (
        df.groupby(["date", "hour", "rideable_type", "member_casual", "is_weekend", "day_name"])
        .agg(trip_count=("started_at", "count"), avg_duration=("trip_duration_min", "mean"))
        .reset_index()
    )
    hourly.to_parquet(PROCESSED_DIR / "hourly_demand.parquet", index=False)

    print("  Aggregating station_daily.parquet...")
    starts = (
        df.groupby(["date", "start_station_name", "start_station_id"])
        .agg(
            departures=("started_at", "count"),
            lat=("start_lat", "first"),
            lng=("start_lng", "first"),
        )
        .reset_index()
        .rename(columns={"start_station_name": "station_name", "start_station_id": "station_id"})
    )
    ends = (
        df.groupby(["date", "end_station_name", "end_station_id"])
        .agg(arrivals=("ended_at", "count"))
        .reset_index()
        .rename(columns={"end_station_name": "station_name", "end_station_id": "station_id"})
    )
    station = starts.merge(ends, on=["date", "station_name", "station_id"], how="outer").fillna(0)
    station["departures"] = station["departures"].astype(int)
    station["arrivals"] = station["arrivals"].astype(int)
    station["net_flow"] = station["arrivals"] - station["departures"]
    station.to_parquet(PROCESSED_DIR / "station_daily.parquet", index=False)

    print("  Aggregating popular_routes.parquet...")
    routes = (
        df.groupby(["start_station_name", "end_station_name"])
        .agg(
            trip_count=("started_at", "count"),
            avg_duration=("trip_duration_min", "mean"),
            avg_distance=("distance_km", "mean"),
            start_lat=("start_lat", "first"),
            start_lng=("start_lng", "first"),
            end_lat=("end_lat", "first"),
            end_lng=("end_lng", "first"),
        )
        .reset_index()
        .sort_values("trip_count", ascending=False)
        .head(200)
    )
    routes.to_parquet(PROCESSED_DIR / "popular_routes.parquet", index=False)

    print("  Aggregating monthly_summary.parquet...")
    monthly = (
        df.groupby(["month", "member_casual"])
        .agg(
            total_trips=("started_at", "count"),
            avg_duration=("trip_duration_min", "mean"),
            unique_bikes=("ride_id", "nunique") if "ride_id" in df.columns else ("started_at", "count"),
            unique_stations=("start_station_name", "nunique"),
        )
        .reset_index()
    )
    monthly.to_parquet(PROCESSED_DIR / "monthly_summary.parquet", index=False)


def fetch_gbfs():
    GBFS_DIR.mkdir(parents=True, exist_ok=True)
    for endpoint in ["station_information", "station_status"]:
        url = f"{GBFS_BASE}/{endpoint}.json"
        print(f"  Fetching {endpoint}...")
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            with open(GBFS_DIR / f"{endpoint}.json", "w") as f:
                json.dump(data, f)
        except Exception as e:
            print(f"  WARNING: Failed to fetch {endpoint}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Download and preprocess CitiBike data")
    parser.add_argument("--source", choices=["jc", "nyc"], default="jc",
                        help="Data source: jc (Jersey City, small) or nyc (New York City, large)")
    parser.add_argument("--months", type=int, default=6, help="Number of months to download")
    parser.add_argument("--force", action="store_true", help="Re-download existing files")
    args = parser.parse_args()

    print(f"\n=== CitiBike Data Setup ({args.source.upper()}, {args.months} months) ===\n")

    print("Step 1: Downloading data files...")
    files = get_file_list(args.source, args.months)
    download_files(files, force=args.force)

    print("\nStep 2: Cleaning and normalizing data...")
    df = load_and_clean(files)

    print("\nStep 3: Pre-aggregating and saving parquet files...")
    aggregate_and_save(df)

    print("\nStep 4: Fetching GBFS station data...")
    fetch_gbfs()

    print("\n=== Setup complete! ===")
    print(f"Processed files in: {PROCESSED_DIR}")
    for f in sorted(PROCESSED_DIR.glob("*.parquet")):
        size_mb = f.stat().st_size / 1e6
        print(f"  {f.name}: {size_mb:.1f} MB")


if __name__ == "__main__":
    main()

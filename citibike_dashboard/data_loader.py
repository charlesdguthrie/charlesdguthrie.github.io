"""Cached data loaders for all parquet files and live GBFS."""
import json
from pathlib import Path

import pandas as pd
import requests
import streamlit as st

DATA_DIR = Path(__file__).parent / "data"
PROCESSED_DIR = DATA_DIR / "processed"
GBFS_DIR = DATA_DIR / "gbfs"
GBFS_BASE = "https://gbfs.citibikenyc.com/gbfs/en"


@st.cache_data
def load_trips() -> pd.DataFrame:
    df = pd.read_parquet(PROCESSED_DIR / "trips.parquet")
    df["date"] = pd.to_datetime(df["date"])
    return df


@st.cache_data
def load_hourly_demand() -> pd.DataFrame:
    df = pd.read_parquet(PROCESSED_DIR / "hourly_demand.parquet")
    df["date"] = pd.to_datetime(df["date"])
    return df


@st.cache_data
def load_station_daily() -> pd.DataFrame:
    df = pd.read_parquet(PROCESSED_DIR / "station_daily.parquet")
    df["date"] = pd.to_datetime(df["date"])
    return df


@st.cache_data
def load_popular_routes() -> pd.DataFrame:
    return pd.read_parquet(PROCESSED_DIR / "popular_routes.parquet")


@st.cache_data
def load_monthly_summary() -> pd.DataFrame:
    return pd.read_parquet(PROCESSED_DIR / "monthly_summary.parquet")


@st.cache_data
def load_gbfs_stations() -> pd.DataFrame:
    info_path = GBFS_DIR / "station_information.json"
    status_path = GBFS_DIR / "station_status.json"
    if not info_path.exists() or not status_path.exists():
        return pd.DataFrame()
    with open(info_path) as f:
        info = json.load(f)
    with open(status_path) as f:
        status = json.load(f)
    info_df = pd.DataFrame(info["data"]["stations"])
    status_df = pd.DataFrame(status["data"]["stations"])
    merged = info_df.merge(status_df, on="station_id", how="inner")
    return merged


@st.cache_data(ttl=60)
def fetch_live_gbfs() -> pd.DataFrame:
    try:
        info_resp = requests.get(f"{GBFS_BASE}/station_information.json", timeout=15)
        status_resp = requests.get(f"{GBFS_BASE}/station_status.json", timeout=15)
        info_resp.raise_for_status()
        status_resp.raise_for_status()
        info_df = pd.DataFrame(info_resp.json()["data"]["stations"])
        status_df = pd.DataFrame(status_resp.json()["data"]["stations"])
        merged = info_df.merge(status_df, on="station_id", how="inner")
        if "num_bikes_available" in merged.columns and "num_docks_available" in merged.columns:
            total = merged["num_bikes_available"] + merged["num_docks_available"]
            merged["fill_rate"] = (merged["num_bikes_available"] / total.replace(0, 1)).round(2)
        return merged
    except Exception:
        return load_gbfs_stations()

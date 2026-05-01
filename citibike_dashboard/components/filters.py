"""Sidebar filter widgets."""
from collections import namedtuple

import pandas as pd
import streamlit as st

FilterState = namedtuple("FilterState", ["date_range", "rideable_types", "member_casual"])


def render_sidebar_filters(trips_df: pd.DataFrame) -> FilterState:
    st.sidebar.markdown("---")
    st.sidebar.subheader("Filters")

    min_date = trips_df["date"].min().date() if hasattr(trips_df["date"].min(), "date") else trips_df["date"].min()
    max_date = trips_df["date"].max().date() if hasattr(trips_df["date"].max(), "date") else trips_df["date"].max()

    date_range = st.sidebar.date_input(
        "Date Range",
        value=(min_date, max_date),
        min_value=min_date,
        max_value=max_date,
    )

    bike_types = sorted(trips_df["rideable_type"].dropna().unique().tolist())
    rideable_types = st.sidebar.multiselect("Bike Type", bike_types, default=bike_types)

    member_options = ["All", "member", "casual"]
    member_casual = st.sidebar.selectbox("User Type", member_options)

    return FilterState(date_range=date_range, rideable_types=rideable_types, member_casual=member_casual)


def apply_filters(df: pd.DataFrame, filters: FilterState) -> pd.DataFrame:
    if len(filters.date_range) == 2:
        start, end = filters.date_range
        start = pd.Timestamp(start)
        end = pd.Timestamp(end)
        df = df[df["date"].between(start, end)]

    if filters.rideable_types and "rideable_type" in df.columns:
        df = df[df["rideable_type"].isin(filters.rideable_types)]

    if filters.member_casual != "All" and "member_casual" in df.columns:
        df = df[df["member_casual"] == filters.member_casual]

    return df

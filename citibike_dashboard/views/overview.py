"""Overview: KPI cards + daily/weekly/monthly trends."""
import pandas as pd
import streamlit as st

from components.kpi_cards import render_kpi_row
from data_loader import load_hourly_demand, load_trips
from components.filters import apply_filters
from visualizations.charts import create_trend_chart


def render_overview(filters):
    trips = apply_filters(load_trips(), filters)

    if trips.empty:
        st.warning("No data for the selected filters.")
        return

    total_trips = len(trips)
    date_range_days = max((trips["date"].max() - trips["date"].min()).days, 1)
    avg_daily = total_trips / date_range_days
    avg_duration = trips["trip_duration_min"].mean()
    member_pct = (trips["member_casual"] == "member").mean() * 100
    unique_stations = trips["start_station_name"].nunique()

    midpoint = trips["date"].min() + pd.Timedelta(days=date_range_days // 2)
    first_half = trips[trips["date"] < midpoint]
    second_half = trips[trips["date"] >= midpoint]

    def delta(current, previous):
        if previous == 0:
            return None
        pct = ((current - previous) / previous) * 100
        return f"{pct:+.1f}%"

    first_daily = len(first_half) / max((midpoint - trips["date"].min()).days, 1)
    second_daily = len(second_half) / max((trips["date"].max() - midpoint).days, 1)

    render_kpi_row([
        {"label": "Total Trips", "value": f"{total_trips:,}", "delta": None},
        {"label": "Avg Daily Trips", "value": f"{avg_daily:,.0f}", "delta": delta(second_daily, first_daily)},
        {"label": "Avg Duration (min)", "value": f"{avg_duration:.1f}",
         "delta": delta(second_half["trip_duration_min"].mean(), first_half["trip_duration_min"].mean()) if not first_half.empty else None},
        {"label": "Member %", "value": f"{member_pct:.1f}%", "delta": None},
        {"label": "Active Stations", "value": f"{unique_stations:,}", "delta": None},
    ])

    st.markdown("---")

    tab_daily, tab_weekly, tab_monthly = st.tabs(["Daily Trend", "Weekly", "Monthly"])

    with tab_daily:
        daily = trips.groupby(["date", "member_casual"]).size().reset_index(name="trips")
        fig = create_trend_chart(daily, "date", "trips", "member_casual", "Daily Trips", chart_type="area")
        st.plotly_chart(fig, use_container_width=True)

    with tab_weekly:
        day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        weekly = trips.groupby(["day_name", "member_casual"]).size().reset_index(name="trips")
        weekly["day_name"] = pd.Categorical(weekly["day_name"], categories=day_order, ordered=True)
        weekly = weekly.sort_values("day_name")
        fig = create_trend_chart(weekly, "day_name", "trips", "member_casual", "Trips by Day of Week", chart_type="bar")
        st.plotly_chart(fig, use_container_width=True)

    with tab_monthly:
        monthly = trips.groupby(["month", "member_casual"]).size().reset_index(name="trips")
        monthly = monthly.sort_values("month")
        fig = create_trend_chart(monthly, "month", "trips", "member_casual", "Monthly Trips", chart_type="bar")
        st.plotly_chart(fig, use_container_width=True)

"""Demand Patterns: hour x day heatmap, hourly/daily curves."""
import pandas as pd
import streamlit as st

from data_loader import load_hourly_demand
from components.filters import apply_filters
from visualizations.charts import create_heatmap, create_trend_chart


def render_demand_patterns(filters):
    hourly = apply_filters(load_hourly_demand(), filters)

    if hourly.empty:
        st.warning("No data for the selected filters.")
        return

    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    pivot = hourly.groupby(["day_name", "hour"])["trip_count"].sum().reset_index()
    matrix = pivot.pivot_table(index="hour", columns="day_name", values="trip_count", fill_value=0)
    matrix = matrix.reindex(columns=day_order, fill_value=0)

    fig = create_heatmap(
        z=matrix.values,
        x_labels=day_order,
        y_labels=[f"{h}:00" for h in range(24)],
        title="Trips by Hour and Day of Week",
        height=500,
    )
    st.plotly_chart(fig, use_container_width=True)

    col1, col2 = st.columns(2)

    with col1:
        by_hour = hourly.groupby(["hour", "is_weekend"])["trip_count"].sum().reset_index()
        by_hour["day_type"] = by_hour["is_weekend"].map({True: "Weekend", False: "Weekday"})
        fig = create_trend_chart(by_hour.rename(columns={"day_type": "member_casual"}),
                                 "hour", "trip_count", "member_casual", "Hourly Demand: Weekday vs Weekend")
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        by_day = hourly.groupby("day_name")["trip_count"].sum().reset_index()
        by_day["day_name"] = pd.Categorical(by_day["day_name"], categories=day_order, ordered=True)
        by_day = by_day.sort_values("day_name")
        fig = create_trend_chart(by_day, "day_name", "trip_count", title="Total Trips by Day", chart_type="bar")
        st.plotly_chart(fig, use_container_width=True)

    with st.expander("Peak Hours Detail"):
        peak = hourly.groupby(["date", "hour"]).agg(
            trips=("trip_count", "sum"),
            avg_duration=("avg_duration", "mean"),
        ).reset_index().sort_values("trips", ascending=False).head(15)
        peak["date"] = peak["date"].dt.strftime("%Y-%m-%d")
        peak["hour"] = peak["hour"].apply(lambda h: f"{h}:00")
        peak["avg_duration"] = peak["avg_duration"].round(1)
        st.dataframe(
            peak,
            column_config={
                "trips": st.column_config.ProgressColumn("Trips", max_value=int(peak["trips"].max())),
                "avg_duration": st.column_config.NumberColumn("Avg Duration (min)", format="%.1f"),
            },
            use_container_width=True,
            hide_index=True,
        )

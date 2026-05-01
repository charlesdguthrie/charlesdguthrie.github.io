"""Trip Analysis: duration distributions + popular routes."""
import plotly.graph_objects as go
import pandas as pd
import pydeck as pdk
import streamlit as st

from data_loader import load_trips, load_popular_routes
from components.filters import apply_filters
from components.kpi_cards import render_kpi_row
from visualizations.charts import create_histogram, base_layout
from visualizations.colors import MEMBER_COLOR, CASUAL_COLOR, CITI_BLUE


def render_trip_analysis(filters):
    trips = apply_filters(load_trips(), filters)

    if trips.empty:
        st.warning("No data for the selected filters.")
        return

    tab_duration, tab_routes = st.tabs(["Duration", "Popular Routes"])

    with tab_duration:
        capped = trips[trips["trip_duration_min"] <= 60].copy()

        median_dur = capped["trip_duration_min"].median()
        mean_dur = capped["trip_duration_min"].mean()
        p95_dur = capped["trip_duration_min"].quantile(0.95)

        render_kpi_row([
            {"label": "Median Duration", "value": f"{median_dur:.1f} min"},
            {"label": "Mean Duration", "value": f"{mean_dur:.1f} min"},
            {"label": "95th Percentile", "value": f"{p95_dur:.1f} min"},
        ])

        st.markdown("##### Trip Duration Distribution")
        fig = create_histogram(capped, "trip_duration_min", "member_casual",
                               title="Trip Duration (capped at 60 min)", nbins=60)
        st.plotly_chart(fig, use_container_width=True)

        if "rideable_type" in trips.columns and trips["rideable_type"].nunique() > 1:
            st.markdown("##### Duration by Bike Type")
            fig = go.Figure()
            for bt in sorted(trips["rideable_type"].unique()):
                sub = capped[capped["rideable_type"] == bt]
                fig.add_trace(go.Box(y=sub["trip_duration_min"], name=bt.replace("_", " ").title()))
            fig = base_layout(fig, "Duration by Bike Type", 400)
            st.plotly_chart(fig, use_container_width=True)

    with tab_routes:
        routes = load_popular_routes()
        if routes.empty:
            st.info("No route data available.")
            return

        routes["route"] = routes["start_station_name"] + " → " + routes["end_station_name"]
        display = routes[["route", "trip_count", "avg_duration", "avg_distance"]].head(50)
        display["avg_duration"] = display["avg_duration"].round(1)
        display["avg_distance"] = display["avg_distance"].round(2)

        st.dataframe(
            display,
            column_config={
                "trip_count": st.column_config.ProgressColumn("Trips", max_value=int(display["trip_count"].max())),
                "avg_duration": st.column_config.NumberColumn("Avg Duration (min)", format="%.1f"),
                "avg_distance": st.column_config.NumberColumn("Avg Distance (km)", format="%.2f"),
            },
            use_container_width=True, hide_index=True,
        )

        route_options = routes.head(30)["route"].tolist()
        selected = st.selectbox("Show route on map", ["(none)"] + route_options)

        if selected != "(none)":
            row = routes[routes["route"] == selected].iloc[0]
            line_data = pd.DataFrame([{
                "start_lat": row["start_lat"], "start_lng": row["start_lng"],
                "end_lat": row["end_lat"], "end_lng": row["end_lng"],
            }])
            center_lat = (row["start_lat"] + row["end_lat"]) / 2
            center_lng = (row["start_lng"] + row["end_lng"]) / 2

            layer = pdk.Layer(
                "LineLayer",
                data=line_data,
                get_source_position=["start_lng", "start_lat"],
                get_target_position=["end_lng", "end_lat"],
                get_color=[0, 83, 214, 200],
                get_width=5,
            )
            st.pydeck_chart(pdk.Deck(
                layers=[layer],
                initial_view_state=pdk.ViewState(latitude=center_lat, longitude=center_lng, zoom=14),
            ))

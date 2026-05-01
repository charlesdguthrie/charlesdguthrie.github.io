"""Real-time Status: live GBFS station availability."""
import plotly.graph_objects as go
import streamlit as st

from data_loader import fetch_live_gbfs
from components.kpi_cards import render_kpi_row
from visualizations.charts import base_layout
from visualizations.colors import CITI_BLUE

import pydeck as pdk


def render_realtime_status():
    if st.button("Refresh Station Data"):
        st.cache_data.clear()

    stations = fetch_live_gbfs()
    if stations.empty:
        st.warning("Unable to fetch real-time station data.")
        return

    if "num_bikes_available" not in stations.columns:
        st.warning("Station data doesn't include availability information.")
        return

    total_bikes = stations["num_bikes_available"].sum()
    total_docks = stations["num_docks_available"].sum()
    reporting = len(stations)
    fill_rate = total_bikes / max(total_bikes + total_docks, 1) * 100

    render_kpi_row([
        {"label": "Available Bikes", "value": f"{total_bikes:,}"},
        {"label": "Available Docks", "value": f"{total_docks:,}"},
        {"label": "Stations Reporting", "value": f"{reporting:,}"},
        {"label": "System Fill Rate", "value": f"{fill_rate:.1f}%"},
    ])

    st.markdown("---")

    map_data = stations.copy()
    if "lat" not in map_data.columns and "latitude" in map_data.columns:
        map_data = map_data.rename(columns={"latitude": "lat", "longitude": "lng"})
    map_data = map_data.dropna(subset=["lat", "lng"])
    map_data = map_data[(map_data["lat"] != 0) & (map_data["lng"] != 0)]

    if not map_data.empty and "fill_rate" in map_data.columns:
        col1, col2 = st.columns([2, 1])

        with col1:
            map_data["color_r"] = (255 * (1 - map_data["fill_rate"])).astype(int).clip(0, 255)
            map_data["color_g"] = (200 * map_data["fill_rate"]).astype(int).clip(0, 255)
            map_data["color_b"] = 50
            map_data["color_a"] = 180
            map_data["radius"] = 60

            if "name" not in map_data.columns and "station_name" in map_data.columns:
                map_data["name"] = map_data["station_name"]
            elif "name" not in map_data.columns:
                map_data["name"] = map_data["station_id"].astype(str)

            layer = pdk.Layer(
                "ScatterplotLayer",
                data=map_data,
                get_position=["lng", "lat"],
                get_radius="radius",
                get_fill_color=["color_r", "color_g", "color_b", "color_a"],
                pickable=True,
            )
            tooltip = {"text": "{name}\nBikes: {num_bikes_available}\nDocks: {num_docks_available}\nFill: {fill_rate}"}
            view_state = pdk.ViewState(latitude=map_data["lat"].mean(), longitude=map_data["lng"].mean(), zoom=11)
            st.pydeck_chart(pdk.Deck(layers=[layer], initial_view_state=view_state, tooltip=tooltip))

        with col2:
            fig = go.Figure(go.Histogram(x=map_data["fill_rate"], nbinsx=20, marker_color=CITI_BLUE))
            fig = base_layout(fig, "Fill Rate Distribution", 350)
            fig.update_xaxes(title_text="Fill Rate")
            fig.update_yaxes(title_text="Stations")
            st.plotly_chart(fig, use_container_width=True)

    with st.expander("Empty Stations (0 bikes)"):
        empty = stations[stations["num_bikes_available"] == 0]
        if empty.empty:
            st.success("No empty stations!")
        else:
            name_col = "name" if "name" in empty.columns else "station_id"
            st.dataframe(
                empty[[name_col, "num_bikes_available", "num_docks_available"]].reset_index(drop=True),
                use_container_width=True, hide_index=True,
            )

    with st.expander("Full Stations (0 docks)"):
        full = stations[stations["num_docks_available"] == 0]
        if full.empty:
            st.success("No full stations!")
        else:
            name_col = "name" if "name" in full.columns else "station_id"
            st.dataframe(
                full[[name_col, "num_bikes_available", "num_docks_available"]].reset_index(drop=True),
                use_container_width=True, hide_index=True,
            )

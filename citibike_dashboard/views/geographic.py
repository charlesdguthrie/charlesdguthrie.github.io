"""Geographic: pydeck maps of station activity, rebalancing, and coverage."""
import pandas as pd
import pydeck as pdk
import streamlit as st

from data_loader import load_station_daily
from components.filters import apply_filters
from visualizations.colors import CITI_BLUE, POSITIVE, NEGATIVE


def render_geographic(filters):
    stations = apply_filters(load_station_daily(), filters)

    if stations.empty:
        st.warning("No data for the selected filters.")
        return

    agg = stations.groupby("station_name").agg(
        total_departures=("departures", "sum"),
        total_arrivals=("arrivals", "sum"),
        net_flow=("net_flow", "sum"),
        lat=("lat", "first"),
        lng=("lng", "first"),
    ).reset_index()
    agg["total_trips"] = agg["total_departures"] + agg["total_arrivals"]
    agg = agg.dropna(subset=["lat", "lng"])
    agg = agg[(agg["lat"] != 0) & (agg["lng"] != 0)]

    if agg.empty:
        st.warning("No station coordinate data available.")
        return

    center_lat = agg["lat"].mean()
    center_lng = agg["lng"].mean()

    view_mode = st.radio("Map View", ["Station Activity", "Rebalancing Flow", "Coverage Density"], horizontal=True)

    view_state = pdk.ViewState(latitude=center_lat, longitude=center_lng, zoom=12, pitch=0)

    if view_mode == "Station Activity":
        max_trips = agg["total_trips"].max()
        agg["radius"] = (agg["total_trips"] / max_trips * 300).clip(lower=30)
        agg["color_r"] = 0
        agg["color_g"] = 83
        agg["color_b"] = 214
        agg["color_a"] = 180

        layer = pdk.Layer(
            "ScatterplotLayer",
            data=agg,
            get_position=["lng", "lat"],
            get_radius="radius",
            get_fill_color=["color_r", "color_g", "color_b", "color_a"],
            pickable=True,
        )
        tooltip = {"text": "{station_name}\nTrips: {total_trips}\nDepartures: {total_departures}\nArrivals: {total_arrivals}"}

    elif view_mode == "Rebalancing Flow":
        agg["color_r"] = agg["net_flow"].apply(lambda x: 222 if x < 0 else 14)
        agg["color_g"] = agg["net_flow"].apply(lambda x: 17 if x < 0 else 131)
        agg["color_b"] = agg["net_flow"].apply(lambda x: 53 if x < 0 else 69)
        agg["color_a"] = 200
        max_abs = agg["net_flow"].abs().max()
        agg["radius"] = (agg["net_flow"].abs() / max(max_abs, 1) * 300).clip(lower=20)

        layer = pdk.Layer(
            "ScatterplotLayer",
            data=agg,
            get_position=["lng", "lat"],
            get_radius="radius",
            get_fill_color=["color_r", "color_g", "color_b", "color_a"],
            pickable=True,
        )
        tooltip = {"text": "{station_name}\nNet Flow: {net_flow}\n(Green=surplus, Red=deficit)"}

    else:
        trip_points = stations[["lat", "lng"]].dropna()
        trip_points = trip_points[(trip_points["lat"] != 0) & (trip_points["lng"] != 0)]

        layer = pdk.Layer(
            "HexagonLayer",
            data=trip_points,
            get_position=["lng", "lat"],
            radius=150,
            elevation_scale=4,
            elevation_range=[0, 500],
            extruded=True,
        )
        view_state = pdk.ViewState(latitude=center_lat, longitude=center_lng, zoom=12, pitch=45)
        tooltip = {"text": "Trip density in this area"}

    st.pydeck_chart(pdk.Deck(layers=[layer], initial_view_state=view_state, tooltip=tooltip))

    with st.expander("Station Data"):
        st.dataframe(
            agg[["station_name", "total_trips", "total_departures", "total_arrivals", "net_flow"]].sort_values("total_trips", ascending=False),
            use_container_width=True, hide_index=True,
        )

"""CitiBike Operations Dashboard — Streamlit App."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import streamlit as st

from data_loader import load_trips
from components.filters import render_sidebar_filters, FilterState
from views.overview import render_overview
from views.demand_patterns import render_demand_patterns
from views.station_performance import render_station_performance
from views.geographic import render_geographic
from views.trip_analysis import render_trip_analysis
from views.realtime_status import render_realtime_status

st.set_page_config(
    page_title="CitiBike Operations Dashboard",
    page_icon="\U0001F6B2",
    layout="wide",
    initial_sidebar_state="expanded",
)

VIEWS = {
    "Overview": render_overview,
    "Demand Patterns": render_demand_patterns,
    "Station Performance": render_station_performance,
    "Geographic": render_geographic,
    "Trip Analysis": render_trip_analysis,
    "Real-time Status": render_realtime_status,
}

st.sidebar.title("\U0001F6B2 CitiBike Dashboard")
st.sidebar.caption("Operations metrics for Lyft/CitiBike")

selected_view = st.sidebar.radio("Navigate", list(VIEWS.keys()), label_visibility="collapsed")

trips = load_trips()
filters = render_sidebar_filters(trips)

st.title(selected_view)

if selected_view == "Real-time Status":
    VIEWS[selected_view]()
else:
    VIEWS[selected_view](filters)

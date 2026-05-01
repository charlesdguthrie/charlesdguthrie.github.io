"""Station Performance: rankings + rebalancing analysis."""
import pandas as pd
import streamlit as st

from data_loader import load_station_daily
from components.filters import apply_filters
from visualizations.charts import create_diverging_bar
from components.kpi_cards import render_kpi_row


def render_station_performance(filters):
    stations = apply_filters(load_station_daily(), filters)

    if stations.empty:
        st.warning("No data for the selected filters.")
        return

    agg = stations.groupby("station_name").agg(
        total_departures=("departures", "sum"),
        total_arrivals=("arrivals", "sum"),
        total_trips=("departures", "sum"),
        net_flow=("net_flow", "sum"),
        lat=("lat", "first"),
        lng=("lng", "first"),
    ).reset_index()
    agg["total_trips"] = agg["total_departures"] + agg["total_arrivals"]

    metric = st.selectbox("Rank stations by", ["Total Trips", "Departures", "Arrivals", "Net Flow"])
    col_map = {"Total Trips": "total_trips", "Departures": "total_departures",
               "Arrivals": "total_arrivals", "Net Flow": "net_flow"}
    sort_col = col_map[metric]

    tab_top, tab_bottom, tab_rebalance = st.tabs(["Top 20", "Bottom 20", "Rebalancing"])

    with tab_top:
        top = agg.nlargest(20, sort_col)
        st.dataframe(
            top[["station_name", sort_col]].reset_index(drop=True),
            column_config={
                sort_col: st.column_config.ProgressColumn(metric, max_value=int(top[sort_col].max())),
            },
            use_container_width=True, hide_index=True,
        )

    with tab_bottom:
        bottom = agg.nsmallest(20, sort_col)
        st.dataframe(
            bottom[["station_name", sort_col]].reset_index(drop=True),
            use_container_width=True, hide_index=True,
        )

    with tab_rebalance:
        outflow_count = len(agg[agg["net_flow"] < -50])
        inflow_count = len(agg[agg["net_flow"] > 50])
        render_kpi_row([
            {"label": "Stations Needing Bikes (net outflow > 50)", "value": outflow_count},
            {"label": "Stations with Surplus (net inflow > 50)", "value": inflow_count},
        ])

        needs_bikes = agg.nsmallest(15, "net_flow")
        surplus = agg.nlargest(15, "net_flow")
        combined = pd.concat([needs_bikes, surplus]).sort_values("net_flow")

        fig = create_diverging_bar(
            combined, combined["station_name"].tolist(), combined["net_flow"].tolist(),
            title="Station Rebalancing: Net Flow (Arrivals - Departures)", height=600,
        )
        st.plotly_chart(fig, use_container_width=True)

    with st.expander("All Station Details"):
        display = agg[["station_name", "total_trips", "total_departures", "total_arrivals", "net_flow"]]
        display = display.sort_values("total_trips", ascending=False)
        st.dataframe(display, use_container_width=True, hide_index=True)

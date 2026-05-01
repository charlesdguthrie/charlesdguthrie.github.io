"""KPI metric card row component."""
import streamlit as st


def render_kpi_row(metrics: list[dict]):
    cols = st.columns(len(metrics))
    for col, m in zip(cols, metrics):
        col.metric(
            label=m["label"],
            value=m["value"],
            delta=m.get("delta"),
        )
